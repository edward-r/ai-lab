import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'

import {
  runGeneratePipeline,
  type GenerateArgs,
  type TokenTelemetry,
  type GeneratePipelineResult,
  maybeCopyToClipboard,
  maybeOpenChatGpt,
} from '../generate-command'
import { resolveDefaultGenerateModel } from '../prompt-generator-service'
import { formatTokenCount } from '../token-counter'

const focusOrder = ['intent', 'model', 'actions'] as const

type FocusField = (typeof focusOrder)[number]

type GenerationSummary = {
  telemetry: TokenTelemetry
  generatedPrompt: string
  polishedPrompt?: string
  finalPrompt: string
  iterations: number
  model: string
}

type StatusState = 'idle' | 'running'

const nextFocus = (current: FocusField): FocusField => {
  const index = focusOrder.indexOf(current)
  return focusOrder[(index + 1) % focusOrder.length] as FocusField
}

const previousFocus = (current: FocusField): FocusField => {
  const index = focusOrder.indexOf(current)
  return focusOrder[(index - 1 + focusOrder.length) % focusOrder.length] as FocusField
}

export const GenerateScreen: React.FC = () => {
  const [intent, setIntent] = useState('')
  const [model, setModel] = useState('gpt-4o-mini')
  const [modelTouched, setModelTouched] = useState(false)
  const [polish, setPolish] = useState(false)
  const [copyEnabled, setCopyEnabled] = useState(false)
  const [openChatGpt, setOpenChatGpt] = useState(false)
  const [focus, setFocus] = useState<FocusField>('intent')
  const [status, setStatus] = useState<StatusState>('idle')
  const [error, setError] = useState<string | undefined>()
  const [feedback, setFeedback] = useState<string | undefined>()
  const [summary, setSummary] = useState<GenerationSummary | null>(null)

  useEffect(() => {
    let isMounted = true
    void resolveDefaultGenerateModel()
      .then((defaultModel) => {
        if (isMounted && !modelTouched && defaultModel) {
          setModel(defaultModel)
        }
      })
      .catch(() => {
        /* ignore */
      })
    return () => {
      isMounted = false
    }
  }, [modelTouched])

  const canSubmit = useMemo(
    () => intent.trim().length > 0 && status !== 'running',
    [intent, status],
  )

  const buildRunArgs = useCallback(
    (trimmedIntent: string): GenerateArgs => {
      const normalizedModel = model.trim()
      const args: GenerateArgs = {
        intent: trimmedIntent,
        interactive: false,
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
        context: [],
        urls: [],
        images: [],
        video: [],
        smartContext: false,
      }

      if (normalizedModel) {
        args.model = normalizedModel
      }

      if (polish && normalizedModel) {
        args.polishModel = normalizedModel
      }

      return args
    },
    [model, polish],
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
    try {
      const args = buildRunArgs(trimmedIntent)
      const result: GeneratePipelineResult = await runGeneratePipeline(args)
      const nextSummary: GenerationSummary = {
        telemetry: result.telemetry,
        generatedPrompt: result.generatedPrompt,
        finalPrompt: result.finalPrompt,
        iterations: result.iterations,
        model: result.model,
        ...(result.polishedPrompt ? { polishedPrompt: result.polishedPrompt } : {}),
      }
      setSummary(nextSummary)

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
      setStatus('idle')
    }
  }, [buildRunArgs, copyEnabled, intent, openChatGpt, status])

  useInput((input, key) => {
    if (key.tab && key.shift) {
      setFocus((current) => previousFocus(current))
      return
    }

    if (key.tab) {
      setFocus((current) => nextFocus(current))
      return
    }

    if (focus !== 'actions' || status === 'running') {
      return
    }

    if (key.return && canSubmit) {
      void handleRun()
      return
    }

    const lower = input.toLowerCase()
    switch (lower) {
      case 'i':
        setFocus('intent')
        return
      case 'm':
        setFocus('model')
        return
      case 'p':
        setPolish((prev) => !prev)
        return
      case 'y':
        setCopyEnabled((prev) => !prev)
        return
      case 'o':
        setOpenChatGpt((prev) => !prev)
        return
      case 'g':
        if (canSubmit) {
          void handleRun()
        }
        return
      default:
        break
    }
  })

  const renderTelemetry = (telemetry: TokenTelemetry): React.ReactNode => (
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

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>{focus === 'intent' ? <Text color="green">Intent</Text> : <Text>Intent</Text>}</Box>
      <Box borderStyle="round" borderColor={focus === 'intent' ? 'green' : 'gray'} paddingX={1}>
        <TextInput
          value={intent}
          onChange={setIntent}
          placeholder="Describe what you want to generate…"
          focus={focus === 'intent'}
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
          focus={focus === 'model'}
          onSubmit={() => setFocus('actions')}
        />
      </Box>

      <Box marginTop={1} flexDirection="column">
        {focus === 'actions' ? (
          <Text color="green">Actions & Toggles</Text>
        ) : (
          <Text>Actions & Toggles</Text>
        )}
        <Text>Polish: {polish ? 'on' : 'off'} (toggle with "p")</Text>
        <Text>Copy to clipboard: {copyEnabled ? 'on' : 'off'} (toggle with "y")</Text>
        <Text>Open ChatGPT: {openChatGpt ? 'on' : 'off'} (toggle with "o")</Text>
        <Text color="gray">
          Use Tab to cycle fields. When actions are focused, press "g" or Enter to run, "i" to edit
          intent, "m" to edit model.
        </Text>
      </Box>

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
  )
}
