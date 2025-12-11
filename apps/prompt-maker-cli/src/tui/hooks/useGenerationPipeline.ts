import { useCallback, useEffect, useMemo, useState } from 'react'

import wrapAnsi from 'wrap-ansi'

import {
  maybeCopyToClipboard,
  maybeOpenChatGpt,
  runGeneratePipeline,
  type GenerateArgs,
  type GeneratePipelineOptions,
  type GeneratePipelineResult,
  type StreamEventInput,
} from '../../generate-command'
import { generatePromptSeries, isGemini } from '../../prompt-generator-service'
import type { PromptGenerationRequest, SeriesResponse } from '../../prompt-generator-service'
import { resolveFileContext } from '../../file-context'
import { resolveSmartContextFiles } from '../../smart-context-service'
import { resolveUrlContext } from '../../url-context'
import type { UploadStateChange } from '../../prompt-generator-service'
import type { HistoryEntry } from '../types'

const SPINNER_FRAMES = ['◴', '◷', '◶', '◵'] as const

export type UseGenerationPipelineOptions = {
  pushHistory: (content: string, kind?: HistoryEntry['kind']) => void
  files: string[]
  urls: string[]
  images: string[]
  videos: string[]
  smartContextEnabled: boolean
  smartContextRoot: string | null
  currentModel: string
  interactiveTransportPath?: string | undefined
  terminalColumns: number
  polishEnabled: boolean
  jsonOutputEnabled: boolean
  copyEnabled: boolean
  chatGptEnabled: boolean
  isTestCommandRunning: boolean
}

export const useGenerationPipeline = ({
  pushHistory,
  files,
  urls,
  images,
  videos,
  smartContextEnabled,
  smartContextRoot,
  currentModel,
  interactiveTransportPath,
  terminalColumns,
  polishEnabled,
  jsonOutputEnabled,
  copyEnabled,
  chatGptEnabled,
  isTestCommandRunning,
}: UseGenerationPipelineOptions) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [spinnerIndex, setSpinnerIndex] = useState(0)
  const [statusMessage, setStatusMessage] = useState('Idle')

  useEffect(() => {
    if (!isGenerating) {
      setSpinnerIndex(0)
      return
    }
    const timer = setInterval(() => {
      setSpinnerIndex((prev) => (prev + 1) % SPINNER_FRAMES.length)
    }, 120)
    return () => clearInterval(timer)
  }, [isGenerating])

  const handleStreamEvent = useCallback(
    (event: StreamEventInput) => {
      switch (event.event) {
        case 'progress.update': {
          const scope = event.scope ? `[${event.scope}] ` : ''
          const message = `${scope}${event.label} (${event.state})`
          pushHistory(message, 'progress')
          setStatusMessage(message)
          return
        }
        case 'upload.state': {
          const action = event.state === 'start' ? 'Uploading' : 'Uploaded'
          pushHistory(`${action} ${event.detail.kind}: ${event.detail.filePath}`, 'progress')
          return
        }
        case 'generation.iteration.start':
          pushHistory(`Iteration ${event.iteration} started`, 'progress')
          return
        case 'generation.iteration.complete':
          pushHistory(`Iteration ${event.iteration} complete`, 'progress')
          return
        case 'context.telemetry': {
          const telemetry = event.telemetry
          pushHistory(
            `Telemetry · total ${telemetry.totalTokens} · intent ${telemetry.intentTokens} · files ${telemetry.fileTokens}`,
            'progress',
          )
          return
        }
        case 'generation.final':
          pushHistory('Generation stream finalized.', 'progress')
          return
        case 'transport.listening':
          pushHistory(`Transport listening on ${event.path}`, 'progress')
          return
        case 'transport.client.connected':
          pushHistory('Transport client connected.', 'progress')
          return
        case 'transport.client.disconnected':
          pushHistory('Transport client disconnected.', 'progress')
          return
        case 'interactive.awaiting':
          pushHistory(`Awaiting ${event.mode} input`, 'progress')
          return
        case 'interactive.state':
          pushHistory(`Interactive ${event.phase} (iteration ${event.iteration})`, 'progress')
          return
        default:
          return
      }
    },
    [pushHistory],
  )

  const runGeneration = useCallback(
    async (intent: string) => {
      setIsGenerating(true)
      setStatusMessage('Preparing generation…')
      pushHistory('Starting generation…')
      try {
        const normalizedModel = currentModel.trim() || 'gpt-4o-mini'
        const args: GenerateArgs = {
          intent,
          interactive: Boolean(interactiveTransportPath),
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
        }
        if (polishEnabled) {
          args.polishModel = normalizedModel
        }
        if (smartContextEnabled && smartContextRoot) {
          args.smartContextRoot = smartContextRoot
        }
        if (interactiveTransportPath) {
          args.interactiveTransport = interactiveTransportPath
        }

        const options: GeneratePipelineOptions = {
          onStreamEvent: handleStreamEvent,
        }

        const result: GeneratePipelineResult = await runGeneratePipeline(args, options)
        setStatusMessage('Finalizing prompt…')
        const iterationLabel = result.iterations ? ` · ${result.iterations} iterations` : ''
        pushHistory(`Final prompt (${result.model}${iterationLabel}):`, 'system')
        pushHistory(result.finalPrompt, 'system')
        if (result.telemetry) {
          pushHistory(
            `Telemetry · total ${result.telemetry.totalTokens} · intent ${result.telemetry.intentTokens} · files ${result.telemetry.fileTokens}`,
            'system',
          )
        }
        if (jsonOutputEnabled) {
          pushHistory('JSON payload:', 'system')
          const prettyPayload = JSON.stringify(result.payload, null, 2)
          const wrapWidth = Math.max(40, terminalColumns - 6)
          prettyPayload.split('\n').forEach((line) => {
            const wrapped = wrapAnsi(line, wrapWidth, { trim: false, hard: true })
            wrapped.split('\n').forEach((wrappedLine) => {
              pushHistory(wrappedLine, 'system')
            })
          })
        }
        if (copyEnabled) {
          await maybeCopyToClipboard(true, result.finalPrompt, false)
          pushHistory('Copied prompt to clipboard.', 'system')
        }
        if (chatGptEnabled) {
          await maybeOpenChatGpt(true, result.finalPrompt, false)
          pushHistory('Opened ChatGPT with generated prompt.', 'system')
        }
        setStatusMessage('Complete')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown generation error.'
        pushHistory(`Generation failed: ${message}`)
        setStatusMessage('Failed')
      } finally {
        setIsGenerating(false)
      }
    },
    [
      chatGptEnabled,
      copyEnabled,
      currentModel,
      files,
      urls,
      images,
      videos,
      polishEnabled,
      jsonOutputEnabled,
      smartContextEnabled,
      smartContextRoot,
      interactiveTransportPath,
      terminalColumns,
      handleStreamEvent,
      pushHistory,
    ],
  )

  const runSeriesGeneration = useCallback(
    async (intent: string) => {
      setIsGenerating(true)
      setStatusMessage('Series: resolving context…')
      pushHistory('[series] Starting series generation…', 'progress')
      try {
        const normalizedModel = currentModel.trim() || 'gpt-4o-mini'
        let targetModel = normalizedModel
        if (videos.length > 0 && !isGemini(targetModel)) {
          targetModel = 'gemini-1.5-pro'
          pushHistory('[series] Switching to gemini-1.5-pro for video support.', 'progress')
        }

        let resolvedContext = await resolveFileContext(Array.from(files) as string[])
        if (resolvedContext.length > 0) {
          pushHistory(
            `[series] Added ${resolvedContext.length} file context entr${resolvedContext.length === 1 ? 'y' : 'ies'}.`,
            'progress',
          )
        }

        if (urls.length > 0) {
          pushHistory(`[series] Fetching ${urls.length} URL source(s)…`, 'progress')
          try {
            const urlFiles = await resolveUrlContext(urls, {
              onProgress: (message: string) => {
                pushHistory(`[series] ${message}`, 'progress')
                setStatusMessage(`Series: ${message}`)
              },
            })
            if (urlFiles.length > 0) {
              resolvedContext = [...resolvedContext, ...urlFiles]
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown URL context error.'
            pushHistory(`[series] URL context failed: ${message}`, 'progress')
          }
        }

        if (smartContextEnabled) {
          pushHistory('[series] Resolving smart context…', 'progress')
          try {
            const smartFiles = await resolveSmartContextFiles(
              intent,
              resolvedContext,
              (message: string) => {
                pushHistory(`[series] ${message}`, 'progress')
                setStatusMessage(`Series: ${message}`)
              },
              smartContextRoot ?? undefined,
            )
            if (smartFiles.length > 0) {
              resolvedContext = [...resolvedContext, ...smartFiles]
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown smart context error.'
            pushHistory(`[series] Smart context failed: ${message}`, 'progress')
          }
        }

        pushHistory(`[series] Context ready (${resolvedContext.length} file(s)).`, 'progress')

        const handleUploadState: UploadStateChange = (state, detail) => {
          const action = state === 'start' ? 'Uploading' : 'Uploaded'
          pushHistory(`[series] ${action} ${detail.kind}: ${detail.filePath}`, 'progress')
        }

        const request: PromptGenerationRequest = {
          intent,
          model: targetModel,
          fileContext: resolvedContext,
          images: [...images],
          videos: [...videos],
          onUploadStateChange: handleUploadState,
        }

        setStatusMessage('Series: generating…')
        const series: SeriesResponse = await generatePromptSeries(request)
        pushHistory('[series] Overview ready.', 'progress')
        pushHistory(`[Overview] ${series.overviewPrompt}`, 'system')
        series.atomicPrompts.forEach((step, index) => {
          const stepNumber = index + 1
          pushHistory(`[Step ${stepNumber}: ${step.title}] ${step.content}`, 'system')
        })
        setStatusMessage('Series complete')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown series generation error.'
        pushHistory(`[series] Failed: ${message}`, 'progress')
        setStatusMessage('Series failed')
      } finally {
        setIsGenerating(false)
      }
    },
    [
      currentModel,
      files,
      urls,
      images,
      videos,
      smartContextEnabled,
      smartContextRoot,
      pushHistory,
      setStatusMessage,
    ],
  )

  const statusChips = useMemo(() => {
    const statusChip = isGenerating
      ? `[status:${SPINNER_FRAMES[spinnerIndex]} ${statusMessage}]`
      : `[status:${statusMessage}]`
    const chips = [statusChip, `[${currentModel}]`]
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
    spinnerIndex,
    statusMessage,
    currentModel,
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
    spinnerIndex,
    runGeneration,
    runSeriesGeneration,
    statusChips,
  }
}
