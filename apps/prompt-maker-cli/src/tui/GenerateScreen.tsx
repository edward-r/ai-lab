import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'

import {
  runGeneratePipeline,
  maybeCopyToClipboard,
  maybeOpenChatGpt,
  type GenerateArgs,
  type GeneratePipelineResult,
  type ContextPathMetadata,
  type StreamEventInput,
  type InteractiveDelegate,
  type GeneratePipelineOptions,
} from '../generate-command'
import { resolveDefaultGenerateModel } from '../prompt-generator-service'
import { formatTokenCount } from '../token-counter'
import { useContextState } from './context-store'
import { ContextPanel, type ContextPanelFocus } from './ContextPanel'
import { MediaPanel, type MediaPanelFocus } from './MediaPanel'

type FocusField =
  | 'intent'
  | 'model'
  | 'contextFiles'
  | 'contextUrls'
  | 'contextSmart'
  | 'mediaImages'
  | 'mediaVideos'
  | 'actions'

const focusOrder: FocusField[] = [
  'intent',
  'model',
  'contextFiles',
  'contextUrls',
  'contextSmart',
  'mediaImages',
  'mediaVideos',
  'actions',
]

const nextFocus = (value: FocusField): FocusField => {
  const index = focusOrder.indexOf(value)
  return focusOrder[(index + 1) % focusOrder.length] as FocusField
}

const previousFocus = (value: FocusField): FocusField => {
  const index = focusOrder.indexOf(value)
  return focusOrder[(index - 1 + focusOrder.length) % focusOrder.length] as FocusField
}

type StatusState = 'idle' | 'running'

type GenerationSummary = {
  telemetry: GeneratePipelineResult['telemetry']
  generatedPrompt: string
  polishedPrompt?: string
  finalPrompt: string
  iterations: number
  model: string
  contextPaths: ContextPathMetadata[]
}

type IterationRecord = {
  iteration: number
  prompt?: string
  refinement?: string
}

type PendingRefinementRequest = {
  iteration: number
  prompt: string
}

const truncate = (value: string, max = 80): string =>
  value.length > max ? `${value.slice(0, max)}…` : value

const ContextSummary: React.FC<{ summary: GenerationSummary }> = ({ summary }) => (
  <Box flexDirection="column" marginTop={1}>
    <Text color="cyan">Context Sources</Text>
    {summary.contextPaths.length === 0 ? (
      <Text color="gray">No additional context attached</Text>
    ) : (
      summary.contextPaths.slice(0, 5).map((ctx) => (
        <Text key={`${ctx.path}-${ctx.source}`} color="gray">
          [{ctx.source}] {ctx.path}
        </Text>
      ))
    )}
    {summary.contextPaths.length > 5 ? (
      <Text color="gray">…and {summary.contextPaths.length - 5} more</Text>
    ) : null}
  </Box>
)

type GenerateScreenProps = {
  interactiveTransportPath?: string | undefined
}

export const GenerateScreen: React.FC<GenerateScreenProps> = ({ interactiveTransportPath }) => {
  const { files, urls, images, videos, smartContextEnabled, smartContextRoot } = useContextState()
  const [intent, setIntent] = useState('')
  const [model, setModel] = useState('gpt-4o-mini')
  const [modelTouched, setModelTouched] = useState(false)
  const [polish, setPolish] = useState(false)
  const [copyEnabled, setCopyEnabled] = useState(false)
  const [openChatGpt, setOpenChatGpt] = useState(false)
  const [interactiveEnabled, setInteractiveEnabled] = useState(false)
  const isTransportMode = Boolean(interactiveTransportPath)
  const [focus, setFocus] = useState<FocusField>('intent')
  const [status, setStatus] = useState<StatusState>('idle')
  const [error, setError] = useState<string | undefined>()
  const [feedback, setFeedback] = useState<string | undefined>()
  const [summary, setSummary] = useState<GenerationSummary | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | undefined>()
  const [progressStatus, setProgressStatus] = useState<string | undefined>()
  const [transportStatus, setTransportStatus] = useState<string | undefined>(
    interactiveTransportPath ? `Waiting to listen on ${interactiveTransportPath}` : undefined,
  )
  const [transportConnected, setTransportConnected] = useState(false)

  const [iterationHistory, setIterationHistory] = useState<IterationRecord[]>([])
  const [pendingRefinement, setPendingRefinement] = useState<PendingRefinementRequest | null>(null)
  const [refinementDraft, setRefinementDraft] = useState('')
  const refinementResolverRef = useRef<
    ((action: { type: 'refine'; instruction: string } | { type: 'finish' }) => void) | null
  >(null)
  const isAwaitingRefinement = pendingRefinement !== null

  useEffect(() => {
    if (!interactiveTransportPath) {
      setTransportStatus(undefined)
      setTransportConnected(false)
      return
    }
    setTransportStatus(`Ready to listen on ${interactiveTransportPath}`)
    setTransportConnected(false)
  }, [interactiveTransportPath])

  useEffect(() => {
    let mounted = true
    void resolveDefaultGenerateModel()
      .then((defaultModel) => {
        if (mounted && !modelTouched && defaultModel) {
          setModel(defaultModel)
        }
      })
      .catch(() => undefined)
    return () => {
      mounted = false
    }
  }, [modelTouched])

  const canSubmit = useMemo(
    () => intent.trim().length > 0 && status !== 'running',
    [intent, status],
  )

  const handleStreamEvent = useCallback((event: StreamEventInput) => {
    if (event.event === 'upload.state') {
      const target = event.detail.kind === 'image' ? 'image' : 'video'
      if (event.state === 'start') {
        setUploadStatus(`Uploading ${target} ${event.detail.filePath}…`)
      } else {
        setUploadStatus(`Uploaded ${target} ${event.detail.filePath}`)
      }
      return
    }

    if (event.event === 'progress.update') {
      setProgressStatus(`${event.label} (${event.state})`)
      return
    }

    if (event.event === 'generation.iteration.start') {
      setIterationHistory((prev) => {
        const filtered = prev.filter((entry) => entry.iteration !== event.iteration)
        const next: IterationRecord = event.latestRefinement
          ? { iteration: event.iteration, refinement: event.latestRefinement }
          : { iteration: event.iteration }
        return [...filtered, next]
      })
      return
    }

    if (event.event === 'generation.iteration.complete') {
      setIterationHistory((prev) =>
        prev.map((entry) =>
          entry.iteration === event.iteration ? { ...entry, prompt: event.prompt } : entry,
        ),
      )
      return
    }

    if (event.event === 'transport.listening') {
      setTransportStatus(`Listening on ${event.path}`)
      setTransportConnected(false)
      return
    }

    if (event.event === 'transport.client.connected') {
      setTransportStatus('Client connected')
      setTransportConnected(true)
      return
    }

    if (event.event === 'transport.client.disconnected') {
      setTransportStatus('Client disconnected')
      setTransportConnected(false)
      return
    }
  }, [])

  const sortedIterationHistory = useMemo(() => {
    return [...iterationHistory].sort((a, b) => a.iteration - b.iteration)
  }, [iterationHistory])

  const requestRefinement = useCallback(
    (iteration: number, promptText: string) =>
      new Promise<{ type: 'refine'; instruction: string } | { type: 'finish' }>((resolve) => {
        refinementResolverRef.current = resolve
        setPendingRefinement({ iteration, prompt: promptText })
        setRefinementDraft('')
      }),
    [setPendingRefinement, setRefinementDraft],
  )

  const handleRefinementSubmit = useCallback(
    (value: string) => {
      const resolver = refinementResolverRef.current
      if (!resolver) {
        setPendingRefinement(null)
        setRefinementDraft('')
        return
      }
      const trimmed = value.trim()
      refinementResolverRef.current = null
      if (!trimmed) {
        resolver({ type: 'finish' })
      } else {
        resolver({ type: 'refine', instruction: trimmed })
      }
      setPendingRefinement(null)
      setRefinementDraft('')
    },
    [setPendingRefinement, setRefinementDraft],
  )

  const handleRefinementCancel = useCallback(() => {
    const resolver = refinementResolverRef.current
    if (resolver) {
      resolver({ type: 'finish' })
      refinementResolverRef.current = null
    }
    setPendingRefinement(null)
    setRefinementDraft('')
  }, [setPendingRefinement, setRefinementDraft])

  useInput(
    (_input, key) => {
      if (key.escape) {
        handleRefinementCancel()
      }
    },
    { isActive: isAwaitingRefinement },
  )

  const interactiveDelegate = useMemo<InteractiveDelegate | undefined>(() => {
    if (!interactiveEnabled || isTransportMode) {
      return undefined
    }
    return {
      getNextAction: ({ iteration, currentPrompt }) => requestRefinement(iteration, currentPrompt),
    }
  }, [interactiveEnabled, isTransportMode, requestRefinement])

  const buildRunArgs = useCallback(
    (trimmedIntent: string): GenerateArgs => {
      const normalizedModel = model.trim()
      const args: GenerateArgs = {
        intent: trimmedIntent,
        interactive: interactiveEnabled || isTransportMode,
        copy: false,
        openChatGpt: false,
        polish,
        json: false,
        quiet: true,
        progress: false,
        stream: 'none',
        showContext: false,
        contextFormat: 'text',
        help: false,
        context: [...files],
        urls: [...urls],
        images: [...images],
        video: [...videos],
        smartContext: smartContextEnabled,
      }

      if (interactiveTransportPath) {
        args.interactiveTransport = interactiveTransportPath
      }

      if (normalizedModel) {
        args.model = normalizedModel
      }

      if (polish && normalizedModel) {
        args.polishModel = normalizedModel
      }

      if (smartContextEnabled && smartContextRoot) {
        args.smartContextRoot = smartContextRoot
      }

      return args
    },
    [
      files,
      urls,
      images,
      videos,
      model,
      polish,
      smartContextEnabled,
      smartContextRoot,
      interactiveEnabled,
      interactiveTransportPath,
      isTransportMode,
    ],
  )

  const handleRun = useCallback(async () => {
    if (status === 'running') {
      return
    }

    const trimmedIntent = intent.trim()
    if (!trimmedIntent) {
      setError('Please enter an intent before generating.')
      setFocus('intent')
      return
    }

    setStatus('running')
    setError(undefined)
    setFeedback(undefined)
    setSummary(null)
    setUploadStatus(undefined)
    setProgressStatus(undefined)
    setIterationHistory([])
    if (interactiveTransportPath) {
      setTransportStatus(`Initializing transport on ${interactiveTransportPath}…`)
      setTransportConnected(false)
    }

    const pipelineOptions: GeneratePipelineOptions = {
      onStreamEvent: handleStreamEvent,
    }
    if (interactiveDelegate) {
      pipelineOptions.interactiveDelegate = interactiveDelegate
    }

    try {
      const args = buildRunArgs(trimmedIntent)
      const result: GeneratePipelineResult = await runGeneratePipeline(args, pipelineOptions)

      setSummary({
        telemetry: result.telemetry,
        generatedPrompt: result.generatedPrompt,
        finalPrompt: result.finalPrompt,
        iterations: result.iterations,
        model: result.model,
        contextPaths: result.contextPaths,
        ...(result.polishedPrompt ? { polishedPrompt: result.polishedPrompt } : {}),
      })

      let feedbackMessage = ''
      if (copyEnabled) {
        await maybeCopyToClipboard(true, result.finalPrompt, false)
        feedbackMessage = 'Copied prompt to clipboard.'
      }
      if (openChatGpt) {
        await maybeOpenChatGpt(true, result.finalPrompt, false)
        feedbackMessage = feedbackMessage
          ? `${feedbackMessage} Opened ChatGPT.`
          : 'Opened ChatGPT with the generated prompt.'
      }
      setFeedback(feedbackMessage || undefined)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown generation error.'
      setError(message)
    } finally {
      if (refinementResolverRef.current) {
        refinementResolverRef.current({ type: 'finish' })
        refinementResolverRef.current = null
      }
      setPendingRefinement(null)
      setRefinementDraft('')
      setStatus('idle')
    }
  }, [
    buildRunArgs,
    copyEnabled,
    handleStreamEvent,
    interactiveDelegate,
    intent,
    openChatGpt,
    status,
    interactiveTransportPath,
  ])

  useInput(
    (_input, key) => {
      if (key.escape) {
        handleRefinementCancel()
      }
    },
    { isActive: isAwaitingRefinement },
  )

  useInput(
    (input, key) => {
      if (key.tab && key.shift) {
        setFocus((current) => previousFocus(current))
        return
      }

      if (key.tab) {
        setFocus((current) => nextFocus(current))
        return
      }

      if (
        focus === 'contextFiles' ||
        focus === 'contextUrls' ||
        focus === 'contextSmart' ||
        focus === 'mediaImages' ||
        focus === 'mediaVideos'
      ) {
        return
      }

      if (focus === 'actions') {
        if (key.return && canSubmit) {
          void handleRun()
          return
        }

        const lower = input.toLowerCase()
        if (lower === 'p') {
          setPolish((prev) => !prev)
          return
        }
        if (lower === 'y') {
          setCopyEnabled((prev) => !prev)
          return
        }
        if (lower === 'o') {
          setOpenChatGpt((prev) => !prev)
          return
        }
        if (lower === 'g' && canSubmit) {
          void handleRun()
          return
        }
        if (lower === 'i') {
          setFocus('intent')
          return
        }
        if (lower === 'm') {
          setFocus('model')
          return
        }
        if (lower === 'f') {
          setFocus('contextFiles')
          return
        }
        if (lower === 'u') {
          setFocus('contextUrls')
          return
        }
        if (lower === 's') {
          setFocus('contextSmart')
          return
        }
        if (lower === 'e') {
          setFocus('mediaImages')
          return
        }
        if (lower === 'v') {
          setFocus('mediaVideos')
          return
        }
        if (lower === 'r' && !isTransportMode) {
          setInteractiveEnabled((prev) => !prev)
          return
        }
      }
    },
    { isActive: !isAwaitingRefinement },
  )

  const renderTelemetry = (telemetry: GenerationSummary['telemetry']): React.ReactNode => (
    <Box flexDirection="column" marginTop={1}>
      <Text color="cyan">Context Telemetry</Text>
      <Text>
        Total {formatTokenCount(telemetry.totalTokens)} · Intent{' '}
        {formatTokenCount(telemetry.intentTokens)} · Files {formatTokenCount(telemetry.fileTokens)}
      </Text>
      {telemetry.files.slice(0, 4).map((file) => (
        <Text key={file.path} color="gray">
          {file.path} · {formatTokenCount(file.tokens)}
        </Text>
      ))}
      {telemetry.files.length > 4 ? (
        <Text color="gray">…and {telemetry.files.length - 4} more file(s)</Text>
      ) : null}
    </Box>
  )

  const contextPanelFocus: ContextPanelFocus =
    focus === 'contextFiles'
      ? 'files'
      : focus === 'contextUrls'
        ? 'urls'
        : focus === 'contextSmart'
          ? 'smart'
          : 'none'

  const mediaPanelFocus: MediaPanelFocus =
    focus === 'mediaImages' ? 'images' : focus === 'mediaVideos' ? 'videos' : 'none'

  return (
    <Box flexDirection="row" marginTop={1} gap={2}>
      <Box flexDirection="column" flexGrow={1}>
        <Box>{focus === 'intent' ? <Text color="green">Intent</Text> : <Text>Intent</Text>}</Box>
        <Box borderStyle="round" borderColor={focus === 'intent' ? 'green' : 'gray'} paddingX={1}>
          <TextInput
            value={intent}
            onChange={setIntent}
            placeholder="Describe what you want to generate…"
            focus={focus === 'intent' && !isAwaitingRefinement}
            onSubmit={() => {
              setFocus('actions')
              void handleRun()
            }}
          />
        </Box>

        <Box marginTop={1}>
          {focus === 'model' ? <Text color="green">Model</Text> : <Text>Model</Text>}
        </Box>
        <Box borderStyle="round" borderColor={focus === 'model' ? 'green' : 'gray'} paddingX={1}>
          <TextInput
            value={model}
            onChange={(value) => {
              setModelTouched(true)
              setModel(value)
            }}
            placeholder="gpt-4o-mini"
            focus={focus === 'model' && !isAwaitingRefinement}
            onSubmit={() => setFocus('actions')}
          />
        </Box>

        <Box marginTop={1} flexDirection="column">
          {focus === 'actions' ? (
            <Text color="green">Actions & Toggles</Text>
          ) : (
            <Text>Actions & Toggles</Text>
          )}
          <Text>Polish: {polish ? 'on' : 'off'} ("p" to toggle)</Text>
          <Text>Copy to clipboard: {copyEnabled ? 'on' : 'off'} ("y" to toggle)</Text>
          <Text>Open ChatGPT: {openChatGpt ? 'on' : 'off'} ("o" to toggle)</Text>
          {isTransportMode ? (
            <Text>Interactive refinement: remote transport ({transportStatus ?? 'pending'})</Text>
          ) : (
            <Text>Interactive refinement: {interactiveEnabled ? 'on' : 'off'} ("r" to toggle)</Text>
          )}
          {isTransportMode ? (
            <Text color={transportConnected ? 'green' : 'gray'}>
              Transport status: {transportStatus ?? 'awaiting run'}
            </Text>
          ) : null}
          <Text color="gray">
            Use Tab / Shift+Tab to move between sections. From actions, press "g" or Enter to run,
            "f"/"u"/"s" for context files/URLs/smart context, and "e"/"v" for images/videos.
          </Text>
          <Text color="gray">
            Current context: {files.length} file glob(s), {urls.length} URL(s), smart context{' '}
            {smartContextEnabled ? 'on' : 'off'} · Media: {images.length} image(s), {videos.length}{' '}
            video(s).
          </Text>
          {uploadStatus ? <Text color="cyan">{uploadStatus}</Text> : null}
          {progressStatus ? <Text color="gray">{progressStatus}</Text> : null}
        </Box>

        {interactiveEnabled || isTransportMode ? (
          <Box flexDirection="column" marginTop={1}>
            <Text color="cyan">Refinement Timeline</Text>
            {isTransportMode ? (
              <Text color="gray">Remote clients drive refinements via the transport socket.</Text>
            ) : null}
            {sortedIterationHistory.length === 0 ? (
              <Text color="gray">No refinements yet.</Text>
            ) : (
              sortedIterationHistory.map((entry) => (
                <Box key={entry.iteration} flexDirection="column">
                  <Text color="gray">
                    Iteration {entry.iteration}
                    {entry.refinement ? ` · refinement: ${entry.refinement}` : ''}
                  </Text>
                  {entry.prompt ? <Text>{truncate(entry.prompt)}</Text> : null}
                </Box>
              ))
            )}
            {pendingRefinement ? (
              <Box flexDirection="column" marginTop={1}>
                <Text color="yellow">
                  Iteration {pendingRefinement.iteration}: describe the refinement (blank or Esc to
                  finish)
                </Text>
                <Text color="gray">Last prompt preview: {truncate(pendingRefinement.prompt)}</Text>
                <TextInput
                  value={refinementDraft}
                  onChange={setRefinementDraft}
                  placeholder="Describe the refinement"
                  focus={pendingRefinement !== null}
                  onSubmit={handleRefinementSubmit}
                />
              </Box>
            ) : null}
          </Box>
        ) : null}

        <Box marginTop={1}>
          {status === 'running' ? (
            <Text color="cyan">Generating prompt…</Text>
          ) : canSubmit ? (
            <Text color="cyan">Press Enter or "g" to generate.</Text>
          ) : (
            <Text color="gray">Enter an intent to enable generation.</Text>
          )}
        </Box>

        {error ? (
          <Text color="red">{error}</Text>
        ) : feedback ? (
          <Text color="green">{feedback}</Text>
        ) : null}

        {summary ? (
          <Box flexDirection="column" marginTop={1}>
            <Text color="yellow">
              Model {summary.model} · Iterations {summary.iterations}
            </Text>
            {renderTelemetry(summary.telemetry)}
            <ContextSummary summary={summary} />
            <Box
              flexDirection="column"
              borderStyle="round"
              borderColor="green"
              paddingX={1}
              paddingY={0}
              marginTop={1}
            >
              <Text color="green">Generated Prompt</Text>
              <Text>{summary.generatedPrompt}</Text>
            </Box>
            {summary.polishedPrompt ? (
              <Box
                flexDirection="column"
                borderStyle="round"
                borderColor="magenta"
                paddingX={1}
                paddingY={0}
                marginTop={1}
              >
                <Text color="magenta">Polished Prompt</Text>
                <Text>{summary.polishedPrompt}</Text>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Box>

      <Box width={46} flexDirection="column" gap={1}>
        <ContextPanel focus={contextPanelFocus} />
        <Box marginTop={1}>
          <MediaPanel focus={mediaPanelFocus} />
        </Box>
      </Box>
    </Box>
  )
}
