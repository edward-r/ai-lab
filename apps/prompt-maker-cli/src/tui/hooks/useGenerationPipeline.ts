import fs from 'node:fs/promises'
import path from 'node:path'

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

import wrapAnsi from 'wrap-ansi'

import { useLatestRef } from './useLatestRef'

import {
  INITIAL_GENERATION_PIPELINE_STATE,
  generationPipelineReducer,
  type InteractiveAwaitingMode,
} from '../generation-pipeline-reducer'

import {
  maybeCopyToClipboard,
  maybeOpenChatGpt,
  runGeneratePipeline,
  type GenerateArgs,
  type GeneratePipelineOptions,
  type GeneratePipelineResult,
  type InteractiveDelegate,
  type StreamEventInput,
} from '../../generate-command'
import { generatePromptSeries, isGemini } from '../../prompt-generator-service'
import type { PromptGenerationRequest, SeriesResponse } from '../../prompt-generator-service'
import { resolveFileContext } from '../../file-context'
import { resolveSmartContextFiles } from '../../smart-context-service'
import { resolveUrlContext } from '../../url-context'
import type { UploadStateChange } from '../../prompt-generator-service'
import { buildSeriesOutputDirName, sanitizeForPathSegment } from '../../utils/series-path'
import { MODEL_PROVIDER_LABELS } from '../../model-providers'
import { checkModelProviderStatus } from '../provider-status'
import type { TokenUsageStore } from '../token-usage-store'
import type { NotifyOptions } from '../notifier'
import type { HistoryEntry, ProviderStatus } from '../types'

const formatCompactTokens = (count: number): string => {
  if (count < 1000) {
    return String(count)
  }
  if (count < 10_000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  if (count < 1_000_000) {
    return `${Math.round(count / 1000)}k`
  }
  return `${(count / 1_000_000).toFixed(1)}m`
}

const extractValidationSection = (content: string): string | null => {
  const markerRegex = /^(?:#{1,6}\s*Validation\b.*|Validation\s*:.*)$/im
  const match = markerRegex.exec(content)
  if (!match) {
    return null
  }

  return content.slice(match.index).trim()
}

type WriteSeriesArtifactsResult = {
  writtenCount: number
  errors: Array<{ fileName: string; message: string }>
}

const writeSeriesArtifacts = async (
  seriesDir: string,
  series: SeriesResponse,
): Promise<WriteSeriesArtifactsResult> => {
  const tasks: Array<{ fileName: string; content: string }> = []

  tasks.push({ fileName: '00-overview.md', content: series.overviewPrompt })

  series.atomicPrompts.forEach((step, index) => {
    const stepNumber = index + 1
    const stepPrefix = stepNumber.toString().padStart(2, '0')
    const titleSlug = sanitizeForPathSegment(step.title, 'step', 60)
    tasks.push({ fileName: `${stepPrefix}-${titleSlug}.md`, content: step.content })
  })

  const results = await Promise.allSettled(
    tasks.map(async (task) => {
      await fs.writeFile(path.join(seriesDir, task.fileName), task.content, 'utf8')
      return task.fileName
    }),
  )

  const errors: Array<{ fileName: string; message: string }> = []
  let writtenCount = 0

  results.forEach((result, index) => {
    const fileName = tasks[index]?.fileName ?? 'unknown'
    if (result.status === 'fulfilled') {
      writtenCount += 1
      return
    }

    const message = result.reason instanceof Error ? result.reason.message : String(result.reason)
    errors.push({ fileName, message })
  })

  return { writtenCount, errors }
}

export type UseGenerationPipelineOptions = {
  pushHistory: (content: string, kind?: HistoryEntry['kind']) => void
  notify?: (message: string, options?: NotifyOptions) => void
  files: string[]
  urls: string[]
  images: string[]
  videos: string[]
  smartContextEnabled: boolean
  smartContextRoot: string | null
  metaInstructions: string
  currentModel: string
  targetModel?: string
  interactiveTransportPath?: string | undefined
  terminalColumns: number
  polishEnabled: boolean
  jsonOutputEnabled: boolean
  copyEnabled: boolean
  chatGptEnabled: boolean
  isTestCommandRunning: boolean
  onProviderStatusUpdate?: (status: ProviderStatus) => void
  tokenUsageStore?: TokenUsageStore
  onReasoningUpdate?: (reasoning: string | null) => void
  onLastGeneratedPromptUpdate?: (prompt: string) => void
}

export const useGenerationPipeline = ({
  pushHistory,
  notify,
  files,
  urls,
  images,
  videos,
  smartContextEnabled,
  smartContextRoot,
  metaInstructions,
  currentModel,
  targetModel,
  interactiveTransportPath,
  terminalColumns,
  polishEnabled,
  jsonOutputEnabled,
  copyEnabled,
  chatGptEnabled,
  isTestCommandRunning,
  onProviderStatusUpdate,
  tokenUsageStore,
  onReasoningUpdate,
  onLastGeneratedPromptUpdate,
}: UseGenerationPipelineOptions) => {
  const [pipelineState, dispatch] = useReducer(
    generationPipelineReducer,
    INITIAL_GENERATION_PIPELINE_STATE,
  )

  const {
    isGenerating,
    statusMessage,
    isAwaitingRefinement,
    awaitingInteractiveMode,
    latestTelemetry,
  } = pipelineState
  const normalizedMetaInstructions = metaInstructions.trim()

  // “Stale closure” explanation (plain-English):
  // React callbacks capture the variables that were in scope when they were created.
  // If we keep a callback stable (so we don’t recreate it every render), it would
  // otherwise keep using old values.
  //
  // Example: if `handleStreamEvent` closed over an old `terminalColumns`, it would
  // keep wrapping text to the wrong width after the terminal is resized.
  //
  // Solution used here: keep the callback stable, but read changing values from refs
  // (kept fresh via useLatestRef).
  const pushHistoryRef = useLatestRef(pushHistory)
  const tokenUsageStoreRef = useLatestRef(tokenUsageStore)
  const terminalColumnsRef = useLatestRef(terminalColumns)
  const interactiveTransportPathRef = useLatestRef(interactiveTransportPath)
  const notifyRef = useLatestRef(notify)

  const activeRunIdRef = useRef<string | null>(null)
  const lastGeneratedPromptUpdateRef = useLatestRef<((prompt: string) => void) | null>(
    onLastGeneratedPromptUpdate ?? null,
  )

  type PendingRefinement = {
    requestId: number
    resolveText: (text: string) => void
  }

  const pendingRefinementRef = useRef<PendingRefinement | null>(null)
  const refinementRequestIdRef = useRef(0)
  const isGeneratingRef = useLatestRef(isGenerating)
  const transportAwaitingHintShownRef = useRef(false)

  const setAwaitingInteractiveMode = useCallback(
    (nextMode: InteractiveAwaitingMode | null, nextStatusMessage?: string): void => {
      dispatch({
        type: 'set-awaiting-interactive',
        awaitingInteractiveMode: nextMode,
        ...(nextStatusMessage ? { statusMessage: nextStatusMessage } : {}),
      })
    },
    [],
  )

  const setAwaitingRefinement = useCallback((next: boolean): void => {
    dispatch({ type: 'set-awaiting-refinement', isAwaitingRefinement: next })
  }, [])

  const setLatestTelemetry = useCallback(
    (telemetry: GeneratePipelineResult['telemetry'] | null) => {
      dispatch({ type: 'set-telemetry', telemetry })
    },
    [],
  )

  const setStatusMessage = useCallback((message: string): void => {
    dispatch({ type: 'set-status', statusMessage: message })
  }, [])

  const submitRefinement = useCallback(
    (text: string): void => {
      const pending = pendingRefinementRef.current
      if (!pending) {
        return
      }
      pendingRefinementRef.current = null
      setAwaitingRefinement(false)
      pending.resolveText(text)
    },
    [setAwaitingRefinement],
  )

  useEffect(() => {
    if (isGenerating) {
      return
    }

    // Cleanup is important:
    // - Without it, a pending refinement promise could keep the UI in a “waiting” state.
    // - It also prevents “runaway updates” after generation stops.
    submitRefinement('')
    setAwaitingRefinement(false)
    setAwaitingInteractiveMode(null)
    transportAwaitingHintShownRef.current = false
  }, [isGenerating, setAwaitingInteractiveMode, setAwaitingRefinement, submitRefinement])

  useEffect(() => {
    return () => {
      submitRefinement('')
    }
  }, [submitRefinement])

  const handleStreamEvent = useCallback(
    (event: StreamEventInput) => {
      const pushHistoryLatest = pushHistoryRef.current
      const tokenUsageStoreLatest = tokenUsageStoreRef.current
      const wrapWidth = Math.max(40, terminalColumnsRef.current - 6)

      switch (event.event) {
        case 'progress.update': {
          const scope = event.scope ? `[${event.scope}] ` : ''
          const message = `${scope}${event.label} (${event.state})`
          pushHistoryLatest(message, 'progress')
          setStatusMessage(message)
          return
        }
        case 'upload.state': {
          const action = event.state === 'start' ? 'Uploading' : 'Uploaded'
          const message = `${action} ${event.detail.kind}: ${event.detail.filePath}`

          const notifyLatest = notifyRef.current
          if (notifyLatest) {
            notifyLatest(message, {
              kind: 'progress',
              autoDismissMs: event.state === 'start' ? 6000 : 2600,
            })
            return
          }

          pushHistoryLatest(message, 'progress')
          return
        }
        case 'generation.iteration.start':
          pushHistoryLatest(`Iteration ${event.iteration} started`, 'progress')
          return
        case 'generation.iteration.complete': {
          const reasoningTokens = event.reasoningTokens ?? 0
          const tokenLabel =
            reasoningTokens > 0
              ? ` (${event.tokens} prompt tokens · ${reasoningTokens} reasoning tokens)`
              : ` (${event.tokens} tokens)`

          const activeRunId = activeRunIdRef.current
          if (activeRunId && tokenUsageStoreLatest) {
            tokenUsageStoreLatest.recordIteration(activeRunId, {
              iteration: event.iteration,
              promptTokens: event.tokens,
              reasoningTokens,
            })
          }

          pushHistoryLatest(`Iteration ${event.iteration} complete${tokenLabel}`, 'progress')
          pushHistoryLatest(`Prompt (iteration ${event.iteration}):`, 'system')

          event.prompt.split('\n').forEach((line) => {
            const wrapped = wrapAnsi(line, wrapWidth, { trim: false, hard: true })
            wrapped.split('\n').forEach((wrappedLine) => {
              pushHistoryLatest(wrappedLine, 'system')
            })
          })

          return
        }
        case 'context.telemetry': {
          const telemetry = event.telemetry
          setLatestTelemetry(telemetry)
          const activeRunId = activeRunIdRef.current
          if (activeRunId && tokenUsageStoreLatest) {
            tokenUsageStoreLatest.recordTelemetry(activeRunId, telemetry)
          }
          pushHistoryLatest(
            `Telemetry · total ${telemetry.totalTokens} · intent ${telemetry.intentTokens} · files ${telemetry.fileTokens} · system ${telemetry.systemTokens}`,
            'progress',
          )
          return
        }
        case 'generation.final':
          setAwaitingInteractiveMode(null)
          pushHistoryLatest('Generation stream finalized.', 'progress')
          return

        case 'transport.listening':
          pushHistoryLatest(`Transport listening on ${event.path}`, 'progress')
          return

        case 'transport.client.connected':
          pushHistoryLatest('Transport client connected.', 'progress')
          return

        case 'transport.client.disconnected':
          pushHistoryLatest('Transport client disconnected.', 'progress')
          return

        case 'interactive.awaiting': {
          const normalizedMode =
            event.mode === 'transport' || event.mode === 'tty' ? event.mode : null

          const waitingMessage =
            normalizedMode === 'transport'
              ? 'Waiting for interactive transport input…'
              : 'Waiting for interactive input…'

          // One dispatch updates both mode + message.
          setAwaitingInteractiveMode(normalizedMode, waitingMessage)
          pushHistoryLatest(waitingMessage, 'progress')

          const transportPath = interactiveTransportPathRef.current
          if (
            normalizedMode === 'transport' &&
            transportPath &&
            !transportAwaitingHintShownRef.current
          ) {
            pushHistoryLatest('Tip: connect a client and send refine/finish to continue.', 'system')
            transportAwaitingHintShownRef.current = true
          }

          return
        }
        case 'interactive.state': {
          const message = `Interactive ${event.phase}`
          setAwaitingInteractiveMode(null, message)
          pushHistoryLatest(`Interactive ${event.phase} (iteration ${event.iteration})`, 'progress')
          return
        }

        default:
          return
      }
    },
    [
      interactiveTransportPathRef,
      notifyRef,
      pushHistoryRef,
      terminalColumnsRef,
      tokenUsageStoreRef,
      setAwaitingInteractiveMode,
      setLatestTelemetry,
      setStatusMessage,
    ],
  )

  const interactiveDelegate: InteractiveDelegate = useMemo(
    () => ({
      getNextAction: async ({ iteration }) => {
        if (!isGeneratingRef.current) {
          return { type: 'finish' }
        }

        refinementRequestIdRef.current += 1
        const requestId = refinementRequestIdRef.current

        if (pendingRefinementRef.current) {
          submitRefinement('')
        }

        setAwaitingRefinement(true)
        pushHistoryRef.current(
          `Refine the prompt above (iteration ${iteration}): describe changes or press Enter on empty line to finish.`,
          'system',
        )

        try {
          return await new Promise<{ type: 'refine'; instruction: string } | { type: 'finish' }>(
            (resolve) => {
              pendingRefinementRef.current = {
                requestId,
                resolveText: (submittedText: string) => {
                  const trimmed = submittedText.trim()
                  if (!isGeneratingRef.current) {
                    resolve({ type: 'finish' })
                    return
                  }
                  if (!trimmed) {
                    pushHistoryRef.current('Interactive refinement complete.', 'system')

                    resolve({ type: 'finish' })
                    return
                  }
                  pushHistoryRef.current(`> [refine] ${trimmed}`, 'user')

                  resolve({ type: 'refine', instruction: trimmed })
                },
              }
            },
          )
        } finally {
          if (pendingRefinementRef.current?.requestId === requestId) {
            pendingRefinementRef.current = null
          }
          if (refinementRequestIdRef.current === requestId) {
            setAwaitingRefinement(false)
          }
        }
      },
    }),
    [isGeneratingRef, pushHistoryRef, submitRefinement, setAwaitingRefinement],
  )

  const onProviderStatusUpdateRef = useLatestRef(onProviderStatusUpdate)

  const ensureProviderReady = useCallback(
    async (modelId: string): Promise<boolean> => {
      try {
        const status = await checkModelProviderStatus(modelId)
        onProviderStatusUpdateRef.current?.(status)
        if (status.status === 'ok') {
          return true
        }
        const providerLabel = MODEL_PROVIDER_LABELS[status.provider]
        pushHistoryRef.current(
          `Generation aborted: ${providerLabel} unavailable (${status.message}).`,
          'system',
        )
        return false
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown provider check error.'
        pushHistoryRef.current(`Generation aborted: provider check failed (${message}).`, 'system')
        return false
      }
    },
    [onProviderStatusUpdateRef, pushHistoryRef],
  )

  const runGeneration = useCallback(
    async (intentInput: { intent?: string; intentFile?: string }) => {
      const trimmedIntent = intentInput.intent?.trim() ?? ''
      const trimmedIntentFile = intentInput.intentFile?.trim() ?? ''
      if (!trimmedIntent && !trimmedIntentFile) {
        pushHistoryRef.current('No intent provided. Enter text or set an intent file.', 'system')
        return
      }
      const normalizedModel = currentModel.trim() || 'gpt-4o-mini'
      const normalizedTargetModel = (targetModel ?? '').trim() || normalizedModel
      const providerReady = await ensureProviderReady(normalizedModel)
      if (!providerReady) {
        return
      }

      activeRunIdRef.current = tokenUsageStoreRef.current
        ? tokenUsageStoreRef.current.startRun(normalizedModel)
        : null
      setLatestTelemetry(null)
      onReasoningUpdate?.(null)

      dispatch({ type: 'generation-start', statusMessage: 'Preparing generation…' })
      transportAwaitingHintShownRef.current = false
      pushHistoryRef.current('Starting generation…')

      let stopStatusMessage: string | undefined

      try {
        const transportPath = interactiveTransportPathRef.current
        const usesTransportInteractive = Boolean(transportPath)

        const usesTuiInteractiveDelegate = !usesTransportInteractive && !jsonOutputEnabled

        const args: GenerateArgs = {
          interactive: usesTransportInteractive || usesTuiInteractiveDelegate,
          copy: false,
          openChatGpt: false,
          polish: polishEnabled,
          json: jsonOutputEnabled,
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
          model: normalizedModel,
          target: normalizedTargetModel,
        }
        if (normalizedMetaInstructions) {
          args.metaInstructions = normalizedMetaInstructions
        }
        if (trimmedIntentFile) {
          args.intentFile = trimmedIntentFile
        } else {
          args.intent = trimmedIntent
        }
        if (polishEnabled) {
          args.polishModel = normalizedModel
        }
        if (smartContextEnabled && smartContextRoot) {
          args.smartContextRoot = smartContextRoot
        }
        if (transportPath) {
          args.interactiveTransport = transportPath
        }

        const options: GeneratePipelineOptions = {
          onStreamEvent: handleStreamEvent,
          ...(usesTuiInteractiveDelegate ? { interactiveDelegate } : {}),
        }

        const result: GeneratePipelineResult = await runGeneratePipeline(args, options)
        onReasoningUpdate?.(result.reasoning ?? null)
        setStatusMessage('Finalizing prompt…')
        const iterationLabel = result.iterations ? ` · ${result.iterations} iterations` : ''
        pushHistoryRef.current(`Final prompt (${result.model}${iterationLabel}):`, 'system')
        pushHistoryRef.current(result.finalPrompt, 'system')

        lastGeneratedPromptUpdateRef.current?.(result.finalPrompt)
        if (result.telemetry) {
          setLatestTelemetry(result.telemetry)
          const activeRunId = activeRunIdRef.current
          if (activeRunId && tokenUsageStoreRef.current) {
            tokenUsageStoreRef.current.recordTelemetry(activeRunId, result.telemetry)
          }
          pushHistoryRef.current(
            `Telemetry · total ${result.telemetry.totalTokens} · intent ${result.telemetry.intentTokens} · files ${result.telemetry.fileTokens} · system ${result.telemetry.systemTokens}`,
            'system',
          )
        }
        if (jsonOutputEnabled) {
          pushHistoryRef.current('JSON payload:', 'system')
          const prettyPayload = JSON.stringify(result.payload, null, 2)
          const wrapWidth = Math.max(40, terminalColumnsRef.current - 6)
          prettyPayload.split('\n').forEach((line) => {
            const wrapped = wrapAnsi(line, wrapWidth, { trim: false, hard: true })
            wrapped.split('\n').forEach((wrappedLine) => {
              pushHistoryRef.current(wrappedLine, 'system')
            })
          })
        }

        if (copyEnabled) {
          await maybeCopyToClipboard(true, result.finalPrompt, false)
          pushHistoryRef.current('Copied prompt to clipboard.', 'system')
        }

        if (chatGptEnabled) {
          await maybeOpenChatGpt(true, result.finalPrompt, false)
          pushHistoryRef.current('Opened ChatGPT with generated prompt.', 'system')
        }

        stopStatusMessage = 'Complete'
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown generation error.'
        pushHistoryRef.current(`Generation failed: ${message}`)
        onReasoningUpdate?.(null)
        stopStatusMessage = 'Failed'
      } finally {
        submitRefinement('')
        dispatch({
          type: 'generation-stop',
          ...(stopStatusMessage ? { statusMessage: stopStatusMessage } : {}),
        })
      }
    },
    [
      chatGptEnabled,
      copyEnabled,
      currentModel,
      targetModel,
      files,
      urls,
      images,
      videos,
      polishEnabled,
      jsonOutputEnabled,
      smartContextEnabled,
      smartContextRoot,
      normalizedMetaInstructions,
      interactiveTransportPathRef,
      pushHistoryRef,
      terminalColumnsRef,
      tokenUsageStoreRef,
      handleStreamEvent,
      interactiveDelegate,
      submitRefinement,
      ensureProviderReady,
      lastGeneratedPromptUpdateRef,
      onReasoningUpdate,
      setLatestTelemetry,
      setStatusMessage,
    ],
  )

  const runSeriesGeneration = useCallback(
    async (intent: string) => {
      let generationModel = currentModel.trim() || 'gpt-4o-mini'
      if (videos.length > 0 && !isGemini(generationModel)) {
        generationModel = 'gemini-3-pro-preview'
        pushHistoryRef.current(
          '[series] Switching to gemini-3-pro-preview for video support.',
          'progress',
        )
      }

      const runtimeTargetModel = (targetModel ?? '').trim() || generationModel

      const providerReady = await ensureProviderReady(generationModel)
      if (!providerReady) {
        return
      }

      dispatch({ type: 'generation-start', statusMessage: 'Series: resolving context…' })
      pushHistoryRef.current('[series] Starting series generation…', 'progress')

      const seriesDir = path.join(
        path.resolve(process.cwd(), 'generated', 'series'),
        buildSeriesOutputDirName(intent),
      )

      let canWriteFiles = true
      try {
        await fs.mkdir(seriesDir, { recursive: true })
      } catch (error) {
        canWriteFiles = false
        const message = error instanceof Error ? error.message : 'Unknown filesystem error.'
        pushHistoryRef.current(
          `[series] Failed to prepare output directory: ${message}`,
          'progress',
        )
      }

      try {
        let resolvedContext = await resolveFileContext(Array.from(files) as string[])
        if (resolvedContext.length > 0) {
          pushHistoryRef.current(
            `[series] Added ${resolvedContext.length} file context entr${resolvedContext.length === 1 ? 'y' : 'ies'}.`,
            'progress',
          )
        }

        if (urls.length > 0) {
          pushHistoryRef.current(`[series] Fetching ${urls.length} URL source(s)…`, 'progress')

          try {
            const urlFiles = await resolveUrlContext(urls, {
              onProgress: (message: string) => {
                pushHistoryRef.current(`[series] ${message}`, 'progress')

                setStatusMessage(`Series: ${message}`)
              },
            })
            if (urlFiles.length > 0) {
              resolvedContext = [...resolvedContext, ...urlFiles]
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown URL context error.'
            pushHistoryRef.current(`[series] URL context failed: ${message}`, 'progress')
          }
        }

        if (smartContextEnabled) {
          if (notify) {
            notify('Smart context: resolving…', { kind: 'progress' })
          } else {
            pushHistoryRef.current('[series] Resolving smart context…', 'progress')
          }

          try {
            const smartFiles = await resolveSmartContextFiles(
              intent,
              resolvedContext,
              (message: string) => {
                if (notify) {
                  notify(`Smart context: ${message}`, { kind: 'progress' })
                } else {
                  pushHistoryRef.current(`[series] ${message}`, 'progress')
                }
                setStatusMessage(`Series: ${message}`)
              },
              smartContextRoot ?? undefined,
            )
            if (smartFiles.length > 0) {
              resolvedContext = [...resolvedContext, ...smartFiles]
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown smart context error.'
            pushHistoryRef.current(`[series] Smart context failed: ${message}`, 'progress')
          }
        }

        pushHistoryRef.current(
          `[series] Context ready (${resolvedContext.length} file(s)).`,
          'progress',
        )

        const handleUploadState: UploadStateChange = (state, detail) => {
          const action = state === 'start' ? 'Uploading' : 'Uploaded'
          const message = `${action} ${detail.kind}: ${detail.filePath}`

          if (notify) {
            notify(message, { kind: 'progress', autoDismissMs: state === 'start' ? 6000 : 2600 })
            return
          }

          pushHistoryRef.current(`[series] ${message}`, 'progress')
        }

        const request: PromptGenerationRequest = {
          intent,
          model: generationModel,
          targetModel: runtimeTargetModel,
          fileContext: resolvedContext,
          images: [...images],
          videos: [...videos],
          onUploadStateChange: handleUploadState,
          onSeriesRepairAttempt: ({ attempt, maxAttempts, validationError }) => {
            const normalizedError = validationError.replace(/\s+/g, ' ').trim()
            const shortError =
              normalizedError.length > 140 ? `${normalizedError.slice(0, 137)}…` : normalizedError

            pushHistoryRef.current(
              `[series] Validation failed; attempting automatic repair (${attempt}/${maxAttempts})… Reason: ${shortError}`,
              'progress',
            )

            if (process.env.DEBUG || process.env.VERBOSE) {
              pushHistoryRef.current(
                `[series][debug] Full validation error: ${normalizedError}`,
                'progress',
              )
            }
          },
          ...(normalizedMetaInstructions ? { metaInstructions: normalizedMetaInstructions } : {}),
        }

        setStatusMessage('Series: generating…')
        const series: SeriesResponse = await generatePromptSeries(request)

        const totalPrompts = 1 + series.atomicPrompts.length
        let writeResult: WriteSeriesArtifactsResult | null = null

        if (canWriteFiles) {
          try {
            writeResult = await writeSeriesArtifacts(seriesDir, series)
            writeResult.errors.forEach((entry) => {
              pushHistoryRef.current(
                `[series] Failed to write ${entry.fileName}: ${entry.message}`,
                'progress',
              )
            })
          } catch (error) {
            canWriteFiles = false
            const message = error instanceof Error ? error.message : 'Unknown filesystem error.'
            pushHistoryRef.current(
              `[series] Failed to write series artifacts: ${message}`,
              'progress',
            )
          }
        }

        pushHistoryRef.current('[series] Overview ready.', 'progress')

        series.atomicPrompts.forEach((step, index) => {
          const stepNumber = index + 1
          const validationSection = extractValidationSection(step.content)

          if (validationSection) {
            pushHistoryRef.current(
              `[Step ${stepNumber}: ${step.title}] Validation section:\n${validationSection}`,
              'system',
            )

            return
          }

          pushHistoryRef.current(
            `[Step ${stepNumber}: ${step.title}] (no Validation section found)`,
            'system',
          )
        })

        if (canWriteFiles) {
          const relativeDir = path.relative(process.cwd(), seriesDir) || seriesDir
          const writtenCount = writeResult?.writtenCount ?? 0
          pushHistoryRef.current(
            `[Series] Saved ${writtenCount}/${totalPrompts} prompts to ${relativeDir}`,
            'system',
          )
        } else {
          pushHistoryRef.current(`[Series] Generated ${totalPrompts} prompts (not saved)`, 'system')
        }

        dispatch({ type: 'generation-stop', statusMessage: 'Series complete' })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown series generation error.'
        pushHistoryRef.current(`[series] Failed: ${message}`, 'progress')
        dispatch({ type: 'generation-stop', statusMessage: 'Series failed' })
      } finally {
        dispatch({ type: 'generation-stop' })
      }
    },
    [
      currentModel,
      targetModel,
      files,

      urls,
      images,
      videos,
      smartContextEnabled,
      smartContextRoot,
      normalizedMetaInstructions,
      pushHistoryRef,
      notify,
      ensureProviderReady,
      setStatusMessage,
    ],
  )

  const statusChips = useMemo(() => {
    const effectiveStatusMessage = isGenerating
      ? statusMessage
      : isTestCommandRunning
        ? 'Running tests'
        : statusMessage

    const statusChip = `[status:${effectiveStatusMessage}]`
    const normalizedTarget = (targetModel ?? '').trim() || currentModel
    const chips = [statusChip, `[${currentModel}]`, `[target:${normalizedTarget}]`]
    if (latestTelemetry) {
      chips.push(`[tokens:${formatCompactTokens(latestTelemetry.totalTokens)}]`)
    }
    chips.push(`[polish:${polishEnabled ? 'on' : 'off'}]`)
    chips.push(`[copy:${copyEnabled ? 'on' : 'off'}]`)
    chips.push(`[chatgpt:${chatGptEnabled ? 'on' : 'off'}]`)
    chips.push(`[json:${jsonOutputEnabled ? 'on' : 'off'}]`)
    chips.push(`[files:${files.length}]`)
    chips.push(`[urls:${urls.length}]`)
    chips.push(`[smart:${smartContextEnabled ? 'on' : 'off'}]`)
    chips.push(`[tests:${isTestCommandRunning ? 'running' : 'idle'}]`)
    if (smartContextRoot) {
      chips.push(`[root:${smartContextRoot}]`)
    }

    return chips
  }, [
    isGenerating,
    statusMessage,
    currentModel,
    targetModel,
    latestTelemetry,

    polishEnabled,
    copyEnabled,
    chatGptEnabled,
    jsonOutputEnabled,
    files.length,
    urls.length,
    smartContextEnabled,
    smartContextRoot,
    isTestCommandRunning,
  ])

  return {
    isGenerating,
    statusMessage,
    runGeneration,
    runSeriesGeneration,
    statusChips,
    isAwaitingRefinement,
    submitRefinement,
    awaitingInteractiveMode,
  }
}
