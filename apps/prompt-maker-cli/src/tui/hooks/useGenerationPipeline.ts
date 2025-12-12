import fs from 'node:fs/promises'
import path from 'node:path'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import wrapAnsi from 'wrap-ansi'

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
import { MODEL_PROVIDER_LABELS } from '../../model-providers'
import { checkModelProviderStatus } from '../provider-status'
import type { HistoryEntry, ProviderStatus } from '../types'

const SPINNER_FRAMES = ['◴', '◷', '◶', '◵'] as const

const padTwoDigits = (value: number): string => value.toString().padStart(2, '0')

const formatSeriesTimestamp = (date: Date = new Date()): string => {
  const year = date.getFullYear().toString()
  const month = padTwoDigits(date.getMonth() + 1)
  const day = padTwoDigits(date.getDate())
  const hours = padTwoDigits(date.getHours())
  const minutes = padTwoDigits(date.getMinutes())
  const seconds = padTwoDigits(date.getSeconds())
  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

const sanitizeForPathSegment = (value: string, fallback: string, maxLength?: number): string => {
  const normalized = value.trim().toLowerCase()
  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  const candidate = slug || fallback
  if (!maxLength || candidate.length <= maxLength) {
    return candidate
  }

  const truncated = candidate.slice(0, maxLength).replace(/-+$/g, '')
  return truncated || fallback
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
  onProviderStatusUpdate?: (status: ProviderStatus) => void
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
  onProviderStatusUpdate,
}: UseGenerationPipelineOptions) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [spinnerIndex, setSpinnerIndex] = useState(0)
  const [statusMessage, setStatusMessage] = useState('Idle')
  const [isAwaitingRefinement, setIsAwaitingRefinement] = useState(false)

  type PendingRefinement = {
    requestId: number
    resolveText: (text: string) => void
  }

  const pendingRefinementRef = useRef<PendingRefinement | null>(null)
  const refinementRequestIdRef = useRef(0)
  const isGeneratingRef = useRef(false)

  useEffect(() => {
    isGeneratingRef.current = isGenerating
  }, [isGenerating])

  const submitRefinement = useCallback((text: string): void => {
    const pending = pendingRefinementRef.current
    if (!pending) {
      return
    }
    pendingRefinementRef.current = null
    setIsAwaitingRefinement(false)
    pending.resolveText(text)
  }, [])

  useEffect(() => {
    if (isGenerating) {
      return
    }
    submitRefinement('')
    setIsAwaitingRefinement(false)
  }, [isGenerating, submitRefinement])

  useEffect(() => {
    return () => {
      submitRefinement('')
    }
  }, [submitRefinement])

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
        case 'generation.iteration.complete': {
          pushHistory(`Iteration ${event.iteration} complete (${event.tokens} tokens)`, 'progress')
          pushHistory(`Prompt (iteration ${event.iteration}):`, 'system')

          const wrapWidth = Math.max(40, terminalColumns - 6)
          event.prompt.split('\n').forEach((line) => {
            const wrapped = wrapAnsi(line, wrapWidth, { trim: false, hard: true })
            wrapped.split('\n').forEach((wrappedLine) => {
              pushHistory(wrappedLine, 'system')
            })
          })

          return
        }
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
    [pushHistory, terminalColumns],
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

        setIsAwaitingRefinement(true)
        pushHistory(
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
                    pushHistory('Interactive refinement complete.', 'system')
                    resolve({ type: 'finish' })
                    return
                  }
                  pushHistory(`> [refine] ${trimmed}`, 'user')
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
            setIsAwaitingRefinement(false)
          }
        }
      },
    }),
    [pushHistory, submitRefinement],
  )

  const ensureProviderReady = useCallback(
    async (modelId: string): Promise<boolean> => {
      try {
        const status = await checkModelProviderStatus(modelId)
        onProviderStatusUpdate?.(status)
        if (status.status === 'ok') {
          return true
        }
        const providerLabel = MODEL_PROVIDER_LABELS[status.provider]
        pushHistory(
          `Generation aborted: ${providerLabel} unavailable (${status.message}).`,
          'system',
        )
        return false
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown provider check error.'
        pushHistory(`Generation aborted: provider check failed (${message}).`, 'system')
        return false
      }
    },
    [onProviderStatusUpdate, pushHistory],
  )

  const runGeneration = useCallback(
    async (intentInput: { intent?: string; intentFile?: string }) => {
      const trimmedIntent = intentInput.intent?.trim() ?? ''
      const trimmedIntentFile = intentInput.intentFile?.trim() ?? ''
      if (!trimmedIntent && !trimmedIntentFile) {
        pushHistory('No intent provided. Enter text or set an intent file.', 'system')
        return
      }
      const normalizedModel = currentModel.trim() || 'gpt-4o-mini'
      const providerReady = await ensureProviderReady(normalizedModel)
      if (!providerReady) {
        return
      }
      setIsGenerating(true)
      setStatusMessage('Preparing generation…')
      pushHistory('Starting generation…')
      try {
        const usesTransportInteractive = Boolean(interactiveTransportPath)

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
        if (interactiveTransportPath) {
          args.interactiveTransport = interactiveTransportPath
        }

        const options: GeneratePipelineOptions = {
          onStreamEvent: handleStreamEvent,
          ...(usesTuiInteractiveDelegate ? { interactiveDelegate } : {}),
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
        submitRefinement('')
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
      interactiveDelegate,
      submitRefinement,
      pushHistory,
      ensureProviderReady,
    ],
  )

  const runSeriesGeneration = useCallback(
    async (intent: string) => {
      let targetModel = currentModel.trim() || 'gpt-4o-mini'
      if (videos.length > 0 && !isGemini(targetModel)) {
        targetModel = 'gemini-3-pro-preview'
        pushHistory('[series] Switching to gemini-3-pro-preview for video support.', 'progress')
      }
      const providerReady = await ensureProviderReady(targetModel)
      if (!providerReady) {
        return
      }

      setIsGenerating(true)
      setStatusMessage('Series: resolving context…')
      pushHistory('[series] Starting series generation…', 'progress')

      const seriesDir = path.join(
        path.resolve(process.cwd(), 'generated', 'series'),
        `${formatSeriesTimestamp()}-${sanitizeForPathSegment(intent, 'intent')}`,
      )

      let canWriteFiles = true
      try {
        await fs.mkdir(seriesDir, { recursive: true })
      } catch (error) {
        canWriteFiles = false
        const message = error instanceof Error ? error.message : 'Unknown filesystem error.'
        pushHistory(`[series] Failed to prepare output directory: ${message}`, 'progress')
      }

      try {
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

        const totalPrompts = 1 + series.atomicPrompts.length
        let writeResult: WriteSeriesArtifactsResult | null = null

        if (canWriteFiles) {
          try {
            writeResult = await writeSeriesArtifacts(seriesDir, series)
            writeResult.errors.forEach((entry) => {
              pushHistory(
                `[series] Failed to write ${entry.fileName}: ${entry.message}`,
                'progress',
              )
            })
          } catch (error) {
            canWriteFiles = false
            const message = error instanceof Error ? error.message : 'Unknown filesystem error.'
            pushHistory(`[series] Failed to write series artifacts: ${message}`, 'progress')
          }
        }

        pushHistory('[series] Overview ready.', 'progress')

        series.atomicPrompts.forEach((step, index) => {
          const stepNumber = index + 1
          const validationSection = extractValidationSection(step.content)

          if (validationSection) {
            pushHistory(
              `[Step ${stepNumber}: ${step.title}] Validation section:\n${validationSection}`,
              'system',
            )
            return
          }

          pushHistory(`[Step ${stepNumber}: ${step.title}] (no Validation section found)`, 'system')
        })

        if (canWriteFiles) {
          const relativeDir = path.relative(process.cwd(), seriesDir) || seriesDir
          const writtenCount = writeResult?.writtenCount ?? 0
          pushHistory(
            `[Series] Saved ${writtenCount}/${totalPrompts} prompts to ${relativeDir}`,
            'system',
          )
        } else {
          pushHistory(`[Series] Generated ${totalPrompts} prompts (not saved)`, 'system')
        }

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
      ensureProviderReady,
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
    isAwaitingRefinement,
    submitRefinement,
  }
}
