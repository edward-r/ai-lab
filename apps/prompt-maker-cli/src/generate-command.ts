import fs from 'node:fs/promises'
import net from 'node:net'
import { stdin as input, stdout as output } from 'node:process'

import boxen from 'boxen'
import chalk from 'chalk'
import Table from 'cli-table3'
import clipboard from 'clipboardy'
import enquirer from 'enquirer'
import open from 'open'
import ora from 'ora'
import yargs from 'yargs'
import type { ArgumentsCamelCase } from 'yargs'

import { callLLM } from '@prompt-maker/core'

import { loadCliConfig } from './config'
import { readFromStdin } from './io'
import { resolveFileContext, type FileContext } from './file-context'
import { appendToHistory } from './history-logger'
import { resolveSmartContextFiles } from './smart-context-service'
import { resolveUrlContext, type ResolveUrlContextOptions } from './url-context'
import { countTokens, formatTokenCount } from './token-counter'

import {
  createPromptGeneratorService,
  ensureModelCredentials,
  isGemini,
  resolveDefaultGenerateModel,
  type PromptGenerationRequest,
  type UploadDetail,
  type UploadState,
  type UploadStateChange,
} from './prompt-generator-service'

const { prompt } = enquirer as typeof import('enquirer')

const MAX_INTENT_FILE_BYTES = 512 * 1024

const VALUE_FLAGS = new Set([
  '--intent-file',
  '-f',
  '--model',
  '--polish-model',
  '--context',
  '-c',
  '--image',
  '--video',
  '--url',
  '--context-file',
  '--context-format',
  '--context-template',
  '--smart-context-root',
])

const CONTEXT_TEMPLATE_PLACEHOLDER = '{{prompt}}'
const BUILT_IN_CONTEXT_TEMPLATES: Record<string, string> = {
  nvim: [
    '## NeoVim Prompt Buffer',
    'Paste this block into a scratch buffer (e.g., :enew) so you can keep prompts beside your work.',
    CONTEXT_TEMPLATE_PLACEHOLDER,
  ].join('\n\n'),
}

type PromptGenerator = Awaited<ReturnType<typeof createPromptGeneratorService>>

type GenerateArgs = {
  intent?: string
  intentFile?: string
  model?: string
  interactive: boolean
  copy: boolean
  openChatGpt: boolean
  polish: boolean
  polishModel?: string
  json: boolean
  quiet: boolean
  progress: boolean
  stream: StreamMode
  showContext: boolean
  contextTemplate?: string
  contextFile?: string
  interactiveTransport?: string
  contextFormat: 'text' | 'json'
  help: boolean
  context: string[]
  urls: string[]
  images: string[]
  video: string[]
  smartContext: boolean
  smartContextRoot?: string
}

type ParsedArgs = {
  args: GenerateArgs
  showHelp: () => void
}

type LoopContext = {
  intent: string
  refinements: string[]
  model: string
  fileContext: FileContext[]
  images: string[]
  videos: string[]
}

type ContextPathSource = 'intent' | 'file' | 'url' | 'smart'

type ContextPathMetadata = {
  path: string
  source: ContextPathSource
}

type GenerateJsonPayload = {
  intent: string
  model: string
  prompt: string
  refinements: string[]
  iterations: number
  interactive: boolean
  timestamp: string
  contextPaths: ContextPathMetadata[]
  outputPath?: string
  polishedPrompt?: string
  polishModel?: string
  contextTemplate?: string
  renderedPrompt?: string
}

type StreamMode = 'none' | 'jsonl'

type StreamEventBase<EventName extends string, Payload extends object> = {
  event: EventName
  timestamp: string
} & Payload

type InteractiveMode = 'transport' | 'tty' | 'none'
type ProgressScope = 'url' | 'smart' | 'generate' | 'polish' | 'generic'

type ContextTelemetryStreamEvent = StreamEventBase<
  'context.telemetry',
  { telemetry: TokenTelemetry }
>
type ProgressStreamEvent = StreamEventBase<
  'progress.update',
  {
    label: string
    state: 'start' | 'update' | 'stop'
    scope?: ProgressScope
  }
>
type UploadStreamEvent = StreamEventBase<
  'upload.state',
  { state: UploadState; detail: UploadDetail }
>
type GenerationIterationStartEvent = StreamEventBase<
  'generation.iteration.start',
  {
    iteration: number
    intent: string
    model: string
    interactive: boolean
    inputTokens: number
    refinements: string[]
    latestRefinement?: string
  }
>
type GenerationIterationCompleteEvent = StreamEventBase<
  'generation.iteration.complete',
  {
    iteration: number
    prompt: string
    tokens: number
  }
>
type InteractiveMilestoneStreamEvent = StreamEventBase<
  'interactive.state',
  {
    phase: 'start' | 'prompt' | 'refine' | 'complete'
    iteration: number
  }
>
type InteractiveAwaitingStreamEvent = StreamEventBase<
  'interactive.awaiting',
  { mode: InteractiveMode }
>
type TransportListeningEvent = StreamEventBase<'transport.listening', { path: string }>
type TransportClientConnectedEvent = StreamEventBase<
  'transport.client.connected',
  { status: 'connected' }
>
type TransportClientDisconnectedEvent = StreamEventBase<
  'transport.client.disconnected',
  { status: 'disconnected' }
>
type TransportEvent =
  | TransportListeningEvent
  | TransportClientConnectedEvent
  | TransportClientDisconnectedEvent

type GenerationFinalStreamEvent = StreamEventBase<
  'generation.final',
  { result: GenerateJsonPayload }
>

type StreamEvent =
  | ContextTelemetryStreamEvent
  | ProgressStreamEvent
  | UploadStreamEvent
  | GenerationIterationStartEvent
  | GenerationIterationCompleteEvent
  | InteractiveMilestoneStreamEvent
  | InteractiveAwaitingStreamEvent
  | TransportEvent
  | GenerationFinalStreamEvent

export type StreamEventInput = {
  [EventName in StreamEvent['event']]: Omit<Extract<StreamEvent, { event: EventName }>, 'timestamp'>
}[StreamEvent['event']]

type TransportLifecycleEventInput = Extract<
  StreamEventInput,
  {
    event: 'transport.listening' | 'transport.client.connected' | 'transport.client.disconnected'
  }
>

type StreamWriter = (chunk: string) => void

type StreamDispatcher = {
  mode: StreamMode
  emit: (event: StreamEventInput) => void
}

type StreamDispatcherOptions = {
  writer?: StreamWriter
  taps?: StreamWriter[]
}

const createStreamDispatcher = (
  mode: StreamMode,
  options: StreamDispatcherOptions = {},
): StreamDispatcher => {
  const writer =
    options.writer ??
    ((chunk: string): void => {
      output.write(chunk)
    })
  const taps = options.taps ?? []

  const emitToTaps = (serialized: string): void => {
    taps.forEach((tap) => {
      tap(serialized)
    })
  }

  if (mode !== 'jsonl') {
    return {
      mode,
      emit: (event) => {
        if (taps.length === 0) {
          return
        }
        const payload = { ...event, timestamp: new Date().toISOString() }
        const serialized = `${JSON.stringify(payload)}\n`
        emitToTaps(serialized)
      },
    }
  }

  return {
    mode,
    emit: (event) => {
      const payload = { ...event, timestamp: new Date().toISOString() }
      const serialized = `${JSON.stringify(payload)}\n`
      writer(serialized)
      emitToTaps(serialized)
    },
  }
}

const POLISH_SYSTEM_PROMPT =
  'You refine prompt contracts for language models. Preserve headings, bullet ordering, and constraints. Only tighten wording and fix inconsistencies.'

export const runGenerateCommand = async (argv: string[]): Promise<void> => {
  const { args, showHelp } = parseGenerateArgs(argv)

  if (args.help) {
    showHelp()
    return
  }

  const interactiveTransportPath = args.interactiveTransport?.trim()

  if (args.interactiveTransport && !interactiveTransportPath) {
    throw new Error('--interactive-transport requires a non-empty path.')
  }

  const wantsInteractiveSession = args.interactive || Boolean(interactiveTransportPath)

  if (args.json && wantsInteractiveSession) {
    throw new Error('--json cannot be combined with --interactive.')
  }

  const contextTemplateName = args.contextTemplate?.trim()

  if (args.contextTemplate && !contextTemplateName) {
    throw new Error('--context-template requires a non-empty template name.')
  }

  const transportCleanupHandlers: Array<{ event: NodeJS.Signals | 'exit'; handler: () => void }> =
    []
  const interactiveTransport = interactiveTransportPath
    ? new InteractiveTransport(interactiveTransportPath)
    : null

  try {
    const intent = await resolveIntent(args)

    const contextPaths: ContextPathMetadata[] = []
    const recordContextPaths = (entries: FileContext[], source: ContextPathSource): void => {
      entries.forEach((entry) => {
        contextPaths.push({ path: entry.path, source })
      })
    }

    const intentMetadataPath = args.intentFile
      ? args.intentFile
      : args.intent?.trim()
        ? 'inline-intent'
        : 'stdin-intent'
    contextPaths.push({ path: intentMetadataPath, source: 'intent' })

    let fileContext = await resolveFileContext(args.context)
    recordContextPaths(fileContext, 'file')

    const service = await createPromptGeneratorService()
    let model = args.model ?? (await resolveDefaultGenerateModel())

    if (args.video.length > 0 && !isGemini(model)) {
      model = await resolveGeminiVideoModel()
      console.warn('Switching to Gemini 1.5 Pro to support video input.')
    }

    const contextTemplateDefinition = contextTemplateName
      ? await resolveContextTemplate(contextTemplateName)
      : null

    const refinements: string[] = []
    const streamDispatcher = createStreamDispatcher(args.stream, {
      ...(interactiveTransport ? { taps: [interactiveTransport.getEventWriter()] } : {}),
    })
    interactiveTransport?.setEventEmitter((event) => {
      streamDispatcher.emit(event)
    })

    if (interactiveTransport) {
      await interactiveTransport.start()
      const signals: Array<NodeJS.Signals | 'exit'> = ['SIGINT', 'SIGTERM', 'exit']
      signals.forEach((signal) => {
        const handler = (): void => {
          void interactiveTransport.stop()
        }
        process.once(signal, handler)
        transportCleanupHandlers.push({ event: signal, handler })
      })
    }

    const interactiveMode: InteractiveMode = interactiveTransport
      ? 'transport'
      : args.interactive && input.isTTY && output.isTTY
        ? 'tty'
        : 'none'

    if (args.interactive && interactiveMode === 'none') {
      console.warn(
        'Interactive mode requested but no TTY detected; continuing non-interactive run.',
      )
    }

    const uiSuppressed = args.quiet || streamDispatcher.mode !== 'none'
    const shouldDisplay = !args.json && !args.quiet
    const progressSpinnersEnabled = args.progress && interactiveMode === 'none'
    const startSpinner = (label: string): ProgressHandle | null =>
      progressSpinnersEnabled ? startProgress(label, { showSpinner: !uiSuppressed }) : null

    const emitProgress = (
      label: string,
      state: 'start' | 'update' | 'stop',
      scope: ProgressScope = 'generic',
    ): void => {
      streamDispatcher.emit({ event: 'progress.update', label, state, scope })
    }

    emitProgress('Resolving context', 'start', 'generic')

    if (args.urls.length > 0) {
      const label = 'Fetching URL context'
      emitProgress(label, 'start', 'url')
      const urlSpinner = startSpinner(label)
      const urlOptions: ResolveUrlContextOptions = {
        onProgress: (message: string) => {
          urlSpinner?.setLabel(message)
          emitProgress(message, 'update', 'url')
        },
      }

      try {
        const urlFiles = await resolveUrlContext(args.urls, urlOptions)
        if (urlFiles.length > 0) {
          fileContext = [...fileContext, ...urlFiles]
          recordContextPaths(urlFiles, 'url')
        }
      } finally {
        urlSpinner?.stop('URL context ready')
        emitProgress(label, 'stop', 'url')
      }
    }

    if (args.smartContext) {
      const label = 'Preparing smart context'
      emitProgress(label, 'start', 'smart')
      const smartSpinner = startSpinner(label)
      try {
        const smartFiles = await resolveSmartContextFiles(
          intent,
          fileContext,
          (message) => {
            smartSpinner?.setLabel(message)
            emitProgress(message, 'update', 'smart')
          },
          args.smartContextRoot,
        )

        if (smartFiles.length > 0) {
          fileContext = [...fileContext, ...smartFiles]
          recordContextPaths(smartFiles, 'smart')
        }
      } finally {
        smartSpinner?.stop('Smart context ready')
        emitProgress(label, 'stop', 'smart')
      }
    }

    if (args.showContext) {
      const writeLine = args.json
        ? (value: string): void => {
            console.error(value)
          }
        : (value: string): void => {
            console.log(value)
          }
      displayContextFiles(fileContext, args.contextFormat, writeLine)
    }

    let outputPath: string | undefined

    if (args.contextFile) {
      await writeContextFile(args.contextFile, args.contextFormat, fileContext)
      outputPath = args.contextFile
    }

    emitProgress('Resolving context', 'stop', 'generic')

    const telemetry = buildTokenTelemetry(intent, fileContext)
    streamDispatcher.emit({ event: 'context.telemetry', telemetry })

    emitProgress('Generating prompt', 'start', 'generate')
    const generationSpinner = startSpinner('Generating prompt')
    const handleUploadStateChange = createUploadStateTracker(
      generationSpinner,
      'Generating prompt',
      streamDispatcher,
    )

    const { prompt: generatedPrompt, iterations } = await runGenerationWorkflow({
      service,
      context: { intent, refinements, model, fileContext, images: args.images, videos: args.video },
      telemetry,
      interactiveMode,
      interactiveTransport,
      display: shouldDisplay,
      stream: streamDispatcher,
      onUploadStateChange: handleUploadStateChange,
    })
    generationSpinner?.stop('Generated prompt ✓')
    emitProgress('Generating prompt', 'stop', 'generate')

    const polishModel = args.polishModel ?? process.env.PROMPT_MAKER_POLISH_MODEL ?? model
    let polishedPrompt: string | undefined

    if (args.polish) {
      const label = 'Polishing prompt'
      emitProgress(label, 'start', 'polish')
      const polishSpinner = startSpinner(label)
      try {
        polishedPrompt = await polishPrompt(intent, generatedPrompt, polishModel)
      } finally {
        polishSpinner?.stop('Polished prompt ✓')
        emitProgress(label, 'stop', 'polish')
      }
    }

    const artifact = polishedPrompt ?? generatedPrompt
    const renderedPrompt = contextTemplateDefinition
      ? renderContextTemplate(contextTemplateDefinition, artifact)
      : undefined
    const finalArtifact = renderedPrompt ?? artifact

    await maybeCopyToClipboard(args.copy, finalArtifact, shouldDisplay)
    await maybeOpenChatGpt(args.openChatGpt, finalArtifact, shouldDisplay)

    const payload: GenerateJsonPayload = {
      intent,
      model,
      prompt: generatedPrompt,
      refinements: [...refinements],
      iterations,
      interactive: interactiveMode !== 'none',
      timestamp: new Date().toISOString(),
      contextPaths,
      ...(outputPath ? { outputPath } : {}),
    }

    if (polishedPrompt) {
      payload.polishedPrompt = polishedPrompt
      payload.polishModel = polishModel
    }

    if (contextTemplateName && renderedPrompt) {
      payload.contextTemplate = contextTemplateName
      payload.renderedPrompt = renderedPrompt
    }

    streamDispatcher.emit({ event: 'generation.final', result: payload })

    if (args.json) {
      console.log(JSON.stringify(payload, null, 2))
      await appendToHistory(payload)
      return
    }

    if (renderedPrompt && shouldDisplay && contextTemplateName) {
      displayContextTemplatePrompt(renderedPrompt, contextTemplateName)
    } else if (polishedPrompt && shouldDisplay) {
      displayPolishedPrompt(polishedPrompt, polishModel)
    }

    await appendToHistory(payload)
  } finally {
    transportCleanupHandlers.forEach(({ event, handler }) => {
      process.off(event, handler)
    })
    await interactiveTransport?.stop()
  }
}

const parseGenerateArgs = (argv: string[]): ParsedArgs => {
  const { optionArgs, positionalIntent } = extractIntentArg(argv)

  const parser = yargs(optionArgs)
    .scriptName('prompt-maker-cli')
    .usage('Prompt Maker CLI (generate-only)\n\nUsage:\n  prompt-maker-cli [intent] [options]')
    .option('intent-file', {
      alias: 'f',
      type: 'string',
      describe: 'Read intent from file',
    })
    .option('model', {
      type: 'string',
      describe: 'Override model for generation',
    })
    .option('polish-model', {
      type: 'string',
      describe: 'Override the model used for polishing',
    })
    .option('interactive', {
      alias: 'i',
      type: 'boolean',
      default: false,
      describe: 'Enable interactive refinement loop',
    })
    .option('copy', {
      type: 'boolean',
      default: false,
      describe: 'Copy the final prompt to the clipboard',
    })
    .option('open-chatgpt', {
      type: 'boolean',
      default: false,
      describe: 'Open ChatGPT with the final prompt',
    })
    .option('polish', {
      type: 'boolean',
      default: false,
      describe: 'Run the polish pass after generation',
    })
    .option('json', {
      type: 'boolean',
      default: false,
      describe: 'Emit machine-readable JSON (non-interactive only)',
    })
    .option('quiet', {
      type: 'boolean',
      default: false,
      describe: 'Suppress interactive UI output (telemetry, banners)',
    })
    .option('progress', {
      type: 'boolean',
      default: true,
      describe: 'Show progress indicator',
    })
    .option('stream', {
      type: 'string',
      choices: ['none', 'jsonl'] as const,
      default: 'none',
      describe: 'Emit structured events via stdout',
    })
    .option('context-template', {
      type: 'string',
      describe: 'Wrap the final prompt using a named template',
    })
    .option('interactive-transport', {
      type: 'string',
      describe: 'Listen on a local socket/pipe for interactive commands',
    })
    .option('show-context', {
      type: 'boolean',
      default: false,
      describe: 'Print resolved context files before generation',
    })
    .option('context', {
      alias: 'c',
      type: 'string',
      array: true,
      default: [],
      describe: 'Add file context via glob (repeatable)',
    })
    .option('url', {
      type: 'string',
      array: true,
      default: [],
      describe: 'Add URL context (repeatable)',
    })
    .option('image', {
      type: 'string',
      array: true,
      default: [],
      describe: 'Attach an image (repeatable)',
    })
    .option('video', {
      type: 'string',
      array: true,
      default: [],
      describe: 'Attach a video file (repeatable)',
    })
    .option('context-file', {
      type: 'string',
      describe: 'Write resolved context to the specified file',
    })
    .option('context-format', {
      type: 'string',
      choices: ['text', 'json'] as const,
      default: 'text',
      describe: 'Format for --show-context or --context-file output',
    })
    .option('smart-context', {
      type: 'boolean',
      default: false,
      describe: 'Automatically attach relevant files via local embeddings',
    })
    .option('smart-context-root', {
      type: 'string',
      describe: 'Override the base directory scanned when --smart-context is enabled',
    })
    .help('help')
    .alias('help', 'h')
    .exitProcess(false)
    .showHelpOnFail(false)
    .parserConfiguration({ 'halt-at-non-option': true })
    .strict(false)
    .fail((msg, err) => {
      throw err ?? new Error(msg ?? 'Invalid CLI arguments.')
    })

  const parsed = parser.parseSync() as ArgumentsCamelCase<{
    intentFile?: string
    model?: string
    polishModel?: string
    interactive: boolean
    copy: boolean
    openChatgpt: boolean
    polish: boolean
    json: boolean
    quiet: boolean
    progress: boolean
    help?: boolean
    context: string | string[]
    contextFile?: string
    contextFormat?: 'text' | 'json'
    url: string | string[]
    image: string | string[]
    video: string | string[]
    smartContext: boolean
    smartContextRoot?: string
    showContext: boolean
    contextTemplate?: string
    interactiveTransport?: string
    stream?: StreamMode
    _?: (string | number)[]
  }>

  const intent = positionalIntent ?? (typeof parsed._?.[0] === 'string' ? parsed._?.[0] : undefined)

  const normalizeListArg = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.map((entry) => entry.toString())
    }
    if (value === undefined || value === null) {
      return []
    }
    return [value.toString()]
  }

  const args: GenerateArgs = {
    interactive: parsed.interactive ?? false,
    copy: parsed.copy ?? false,
    openChatGpt: parsed.openChatgpt ?? false,
    polish: parsed.polish ?? false,
    json: parsed.json ?? false,
    quiet: parsed.quiet ?? false,
    progress: parsed.progress ?? true,
    stream: parsed.stream ?? 'none',
    showContext: parsed.showContext ?? false,
    contextFormat: parsed.contextFormat ?? 'text',
    help: Boolean(parsed.help),
    context: normalizeListArg(parsed.context),
    urls: normalizeListArg(parsed.url),
    images: normalizeListArg(parsed.image),
    video: normalizeListArg(parsed.video),
    smartContext: parsed.smartContext ?? false,
    ...(parsed.contextTemplate ? { contextTemplate: parsed.contextTemplate } : {}),
    ...(parsed.interactiveTransport ? { interactiveTransport: parsed.interactiveTransport } : {}),
    ...(parsed.contextFile ? { contextFile: parsed.contextFile } : {}),
    ...(parsed.smartContextRoot ? { smartContextRoot: parsed.smartContextRoot } : {}),
  }

  if (intent) {
    args.intent = intent
  }

  if (parsed.intentFile) {
    args.intentFile = parsed.intentFile
  }

  if (parsed.model) {
    args.model = parsed.model
  }

  if (parsed.polishModel) {
    args.polishModel = parsed.polishModel
  }

  return {
    args,
    showHelp: () => parser.showHelp(),
  }
}

const resolveGeminiVideoModel = async (): Promise<string> => {
  const config = await loadCliConfig()
  const configured = config?.promptGenerator?.defaultGeminiModel?.trim()
  if (configured && isGemini(configured)) {
    return configured
  }
  return 'gemini-1.5-pro'
}

const resolveIntent = async (args: GenerateArgs): Promise<string> => {
  if (args.intent && args.intentFile) {
    throw new Error('Provide either an inline intent argument or --intent-file, not both.')
  }

  if (args.intentFile) {
    const stats = await fs.stat(args.intentFile)
    if (stats.size > MAX_INTENT_FILE_BYTES) {
      const sizeKb = (stats.size / 1024).toFixed(1)
      throw new Error(`Intent file ${args.intentFile} is too large (${sizeKb} KB).`)
    }

    const buffer = await fs.readFile(args.intentFile)
    if (buffer.includes(0)) {
      throw new Error(
        `Intent file ${args.intentFile} appears to be binary. Provide a UTF-8 text file.`,
      )
    }

    const trimmed = buffer.toString('utf8').trim()
    if (!trimmed) {
      throw new Error(`Intent file ${args.intentFile} is empty.`)
    }
    return trimmed
  }

  if (args.intent?.trim()) {
    return args.intent.trim()
  }

  const piped = await readFromStdin()
  if (piped?.trim()) {
    return piped.trim()
  }

  throw new Error(
    'Intent text is required. Provide a quoted argument, use --intent-file, or pipe text via stdin.',
  )
}

const runGenerationWorkflow = async ({
  service,
  context,
  telemetry,
  interactiveMode,
  interactiveTransport,
  display,
  stream,
  onUploadStateChange,
}: {
  service: PromptGenerator
  context: LoopContext
  telemetry: TokenTelemetry
  interactiveMode: InteractiveMode
  interactiveTransport?: InteractiveTransport | null
  display: boolean
  stream: StreamDispatcher
  onUploadStateChange?: UploadStateChange
}): Promise<{ prompt: string; iterations: number }> => {
  let iteration = 0
  let currentPrompt = ''

  if (display) {
    displayTokenSummary(telemetry)
  }

  const inputTokens = telemetry.totalTokens

  iteration += 1
  currentPrompt = await generateAndMaybeDisplay(
    service,
    { ...context, iteration },
    display,
    stream,
    inputTokens,
    interactiveMode !== 'none',
    onUploadStateChange,
  )

  if (interactiveMode !== 'none') {
    stream.emit({ event: 'interactive.state', phase: 'start', iteration })
    stream.emit({ event: 'interactive.state', phase: 'prompt', iteration })

    if (interactiveMode === 'transport' && interactiveTransport) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        stream.emit({ event: 'interactive.awaiting', mode: interactiveMode })
        const command = await interactiveTransport.nextCommand()
        if (!command || command.type === 'finish') {
          break
        }
        const instruction = command.instruction.trim()
        if (!instruction) {
          continue
        }
        stream.emit({ event: 'interactive.state', phase: 'refine', iteration })
        context.refinements.push(instruction)
        iteration += 1
        currentPrompt = await generateAndMaybeDisplay(
          service,
          {
            ...context,
            iteration,
            previousPrompt: currentPrompt,
            latestRefinement: instruction,
          },
          display,
          stream,
          inputTokens,
          true,
          onUploadStateChange,
        )

        stream.emit({ event: 'interactive.state', phase: 'prompt', iteration })
      }
    } else {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        stream.emit({ event: 'interactive.awaiting', mode: interactiveMode })
        const wantsRefine = await askShouldRefine()
        if (!wantsRefine) {
          break
        }

        stream.emit({ event: 'interactive.state', phase: 'refine', iteration })
        const refinement = await collectRefinementInstruction()
        if (!refinement) {
          console.log(chalk.dim('No refinement provided. Ending interactive session.'))
          break
        }

        context.refinements.push(refinement)
        iteration += 1
        currentPrompt = await generateAndMaybeDisplay(
          service,
          {
            ...context,
            iteration,
            previousPrompt: currentPrompt,
            latestRefinement: refinement,
          },
          display,
          stream,
          inputTokens,
          true,
          onUploadStateChange,
        )

        stream.emit({ event: 'interactive.state', phase: 'prompt', iteration })
      }
    }

    stream.emit({ event: 'interactive.state', phase: 'complete', iteration })
  }

  return { prompt: currentPrompt, iterations: iteration }
}

const generateAndMaybeDisplay = async (
  service: PromptGenerator,
  context: LoopContext & {
    iteration: number
    previousPrompt?: string
    latestRefinement?: string
  },
  display: boolean,
  stream: StreamDispatcher,
  inputTokens: number,
  interactive: boolean,
  onUploadStateChange?: UploadStateChange,
): Promise<string> => {
  const request: PromptGenerationRequest = {
    intent: context.intent,
    model: context.model,
    fileContext: context.fileContext,
    images: context.images,
    videos: context.videos,
  }

  if (onUploadStateChange) {
    request.onUploadStateChange = onUploadStateChange
  }

  if (context.previousPrompt && context.latestRefinement) {
    request.previousPrompt = context.previousPrompt
    request.refinementInstruction = context.latestRefinement
  }

  stream.emit({
    event: 'generation.iteration.start',
    iteration: context.iteration,
    intent: context.intent,
    model: context.model,
    interactive,
    inputTokens,
    refinements: [...context.refinements],
    ...(context.latestRefinement ? { latestRefinement: context.latestRefinement } : {}),
  })

  const prompt = await service.generatePrompt(request)
  const outputTokens = countTokens(prompt)

  stream.emit({
    event: 'generation.iteration.complete',
    iteration: context.iteration,
    prompt,
    tokens: outputTokens,
  })

  if (display) {
    displayPrompt(prompt, context.iteration, outputTokens)
  }

  return prompt
}

const polishPrompt = async (
  originalIntent: string,
  prompt: string,
  model: string,
): Promise<string> => {
  await ensureModelCredentials(model)

  return await callLLM(
    [
      { role: 'system', content: POLISH_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          'Intent:',
          originalIntent,
          '---',
          'Generated prompt candidate:',
          prompt,
          '---',
          'Return the polished prompt text, preserving exact sections.',
        ].join('\n'),
      },
    ],
    model,
  )
}

type FileTokenSummary = {
  path: string
  tokens: number
}

type TokenTelemetry = {
  files: FileTokenSummary[]
  intentTokens: number
  fileTokens: number
  totalTokens: number
}

const buildTokenTelemetry = (intentText: string, files: FileContext[]): TokenTelemetry => {
  const fileSummaries = files.map((file) => ({
    path: file.path,
    tokens: countTokens(file.content),
  }))
  const fileTokens = fileSummaries.reduce((acc, file) => acc + file.tokens, 0)
  const intentTokens = countTokens(intentText)
  return {
    files: fileSummaries,
    intentTokens,
    fileTokens,
    totalTokens: intentTokens + fileTokens,
  }
}

const displayTokenSummary = ({
  files,
  intentTokens,
  fileTokens,
  totalTokens,
}: TokenTelemetry): void => {
  const telemetryLines = [
    `${chalk.gray('Total')}: ${chalk.white(formatTokenCount(totalTokens))}`,
    `${chalk.gray('Intent')}: ${chalk.white(formatTokenCount(intentTokens))}`,
    `${chalk.gray('Files')}: ${chalk.white(formatTokenCount(fileTokens))}`,
  ].join('\n')

  console.log('')
  console.log(
    boxen(telemetryLines, {
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
      borderColor: 'cyan',
      borderStyle: 'round',
      title: chalk.bold.cyan('Context Telemetry'),
      titleAlignment: 'left',
    }),
  )
  console.log('')

  if (files.length === 0) {
    return
  }

  const terminalWidth = Math.max(60, Math.min(output.columns ?? 100, 110))
  const numberColumnWidth = 4
  const tokensColumnWidth = 14
  const pathColumnWidth = Math.max(24, terminalWidth - numberColumnWidth - tokensColumnWidth)
  const table = new Table({
    head: [chalk.gray('#'), chalk.gray('Path'), chalk.gray('Tokens')],
    style: { head: [], border: [] },
    wordWrap: true,
    colWidths: [numberColumnWidth, pathColumnWidth, tokensColumnWidth],
  })

  files.slice(0, 10).forEach((file, index) => {
    table.push([
      chalk.dim(String(index + 1)),
      chalk.white(file.path),
      chalk.green(formatTokenCount(file.tokens)),
    ])
  })

  console.log(table.toString())
  console.log('')

  if (files.length > 10) {
    console.log(chalk.dim(`…and ${files.length - 10} more context files`))
  }
}

const displayPrompt = (prompt: string, iteration: number, tokenCount?: number): void => {
  const label = iteration === 1 ? 'Generated Prompt' : `Iteration ${iteration}`
  const meta = typeof tokenCount === 'number' ? chalk.dim(` · ${formatTokenCount(tokenCount)}`) : ''
  const title = chalk.bold.green(`${label}${meta}`)

  const boxed = boxen(prompt, {
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderColor: 'green',
    borderStyle: 'round',
    title,
    titleAlignment: 'left',
  })

  console.log(`\n${boxed}`)
}

const displayPolishedPrompt = (prompt: string, model: string): void => {
  const title = chalk.bold.magenta(`Polished Prompt · ${model}`)
  const boxed = boxen(prompt, {
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderColor: 'magenta',
    borderStyle: 'round',
    title,
    titleAlignment: 'left',
  })

  console.log(`\n${boxed}`)
}

const displayContextTemplatePrompt = (prompt: string, templateName: string): void => {
  const title = chalk.bold.blue(`Context Template · ${templateName}`)
  const boxed = boxen(prompt, {
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderColor: 'blue',
    borderStyle: 'round',
    title,
    titleAlignment: 'left',
  })

  console.log(`\n${boxed}`)
}

const askShouldRefine = async (): Promise<boolean> => {
  try {
    const response = await prompt<{ refine: boolean }>({
      type: 'confirm',
      name: 'refine',
      message: chalk.cyan('Refine the generated prompt?'),
      initial: false,
    })

    return Boolean(response.refine)
  } catch (error) {
    if (isPromptCancellation(error)) {
      console.log(chalk.dim('\nInteractive session cancelled.'))
      return false
    }
    throw error
  }
}

const collectRefinementInstruction = async (): Promise<string | null> => {
  try {
    const response = await prompt<{ refinement: string }>({
      type: 'input',
      name: 'refinement',
      message: chalk.cyan('Describe the refinement (blank to finish):'),
      multiline: true,
    })

    const refinement = response.refinement?.trim()
    return refinement || null
  } catch (error) {
    if (isPromptCancellation(error)) {
      console.log(chalk.dim('\nRefinement input cancelled.'))
      return null
    }
    throw error
  }
}

const isPromptCancellation = (error: unknown): boolean => {
  if (typeof error === 'string') {
    return true
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('cancel') || message.includes('abort')
  }

  return false
}

const maybeCopyToClipboard = async (
  shouldCopy: boolean,
  prompt: string,
  showFeedback: boolean,
): Promise<void> => {
  if (!shouldCopy) {
    return
  }

  try {
    await clipboard.write(prompt)
    if (showFeedback) {
      console.log(chalk.green('✓ Copied prompt to clipboard.'))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown clipboard error.'
    console.warn(chalk.yellow(`Failed to copy prompt to clipboard: ${message}`))
  }
}

const maybeOpenChatGpt = async (
  shouldOpen: boolean,
  prompt: string,
  showFeedback: boolean,
): Promise<void> => {
  if (!shouldOpen) {
    return
  }

  const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`

  try {
    await open(url)
    if (showFeedback) {
      console.log(chalk.green('✓ Opened ChatGPT with the generated prompt.'))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown browser error.'
    console.warn(chalk.yellow(`Failed to open ChatGPT: ${message}`))
  }
}

const extractIntentArg = (argv: string[]): { optionArgs: string[]; positionalIntent?: string } => {
  const optionArgs: string[] = []
  let positionalIntent: string | undefined

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === undefined) {
      continue
    }

    if (token === '--') {
      optionArgs.push(...argv.slice(i))
      break
    }

    if (token.startsWith('-')) {
      optionArgs.push(token)

      if (VALUE_FLAGS.has(token)) {
        const next = argv[i + 1]
        if (next !== undefined) {
          optionArgs.push(next)
          i += 1
        }
      }

      continue
    }

    if (!positionalIntent) {
      positionalIntent = token
      continue
    }

    optionArgs.push(token)
  }

  return positionalIntent ? { optionArgs, positionalIntent } : { optionArgs }
}

type ProgressHandle = {
  stop: (finalMessage?: string) => void
  setLabel: (label: string) => void
}

const startProgress = (label: string, options: { showSpinner: boolean }): ProgressHandle => {
  const spinner = options.showSpinner
    ? ora({
        text: chalk.dim(label),
        color: 'cyan',
        spinner: 'dots',
      }).start()
    : null
  let stopped = false

  const stop = (finalMessage?: string): void => {
    if (stopped) {
      return
    }
    stopped = true
    if (spinner) {
      if (finalMessage) {
        spinner.succeed(finalMessage)
      } else {
        spinner.succeed(chalk.green(`${label} ✓`))
      }
    }
  }

  const setLabel = (nextLabel: string): void => {
    if (stopped) {
      return
    }
    if (spinner) {
      spinner.text = chalk.dim(nextLabel)
    }
  }

  return { stop, setLabel }
}

const createUploadStateTracker = (
  progress: ProgressHandle | null,
  defaultLabel: string,
  stream?: StreamDispatcher,
): UploadStateChange => {
  let uploadsInFlight = 0
  const uploadLabel = 'Uploading...'

  return (state, detail) => {
    if (state === 'start') {
      uploadsInFlight += 1
      if (uploadsInFlight === 1) {
        progress?.setLabel(uploadLabel)
      }
    } else {
      uploadsInFlight = Math.max(0, uploadsInFlight - 1)
      if (uploadsInFlight === 0) {
        progress?.setLabel(defaultLabel)
      }
    }

    if (stream) {
      stream.emit({ event: 'upload.state', state, detail })
    }
  }
}

const renderContextTemplate = (template: string, prompt: string): string => {
  if (template.includes(CONTEXT_TEMPLATE_PLACEHOLDER)) {
    return template.split(CONTEXT_TEMPLATE_PLACEHOLDER).join(prompt)
  }

  const trimmedTemplate = template.trimEnd()
  if (!trimmedTemplate) {
    return prompt
  }
  return `${trimmedTemplate}\n\n${prompt}`
}

const resolveContextTemplate = async (name: string): Promise<string> => {
  const builtIn = BUILT_IN_CONTEXT_TEMPLATES[name]
  if (builtIn) {
    return builtIn
  }

  const config = await loadCliConfig()
  const fromConfig = config?.contextTemplates?.[name]
  if (fromConfig) {
    return fromConfig
  }

  const available = [
    ...Object.keys(BUILT_IN_CONTEXT_TEMPLATES),
    ...(config?.contextTemplates ? Object.keys(config.contextTemplates) : []),
  ]
  const availableList = available.length > 0 ? available.join(', ') : 'none'

  throw new Error(`Unknown context template "${name}". Available templates: ${availableList}.`)
}

type InteractiveCommand = { type: 'refine'; instruction: string } | { type: 'finish' }

const isWindowsNamedPipePath = (target: string): boolean => target.startsWith('\\\\.\\pipe\\')

const isFsNotFoundError = (error: unknown): boolean =>
  Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string' &&
      (error as { code: string }).code === 'ENOENT',
  )

export class InteractiveTransport {
  private server: net.Server | null = null
  private client: net.Socket | null = null
  private buffer = ''
  private commandQueue: InteractiveCommand[] = []
  private pendingResolvers: Array<(command: InteractiveCommand | null) => void> = []
  private stopped = false
  private lifecycleEmitter?: (event: TransportLifecycleEventInput) => void

  constructor(private readonly socketPath: string) {}

  setEventEmitter(callback: (event: TransportLifecycleEventInput) => void): void {
    this.lifecycleEmitter = callback
  }

  async start(): Promise<void> {
    if (!isWindowsNamedPipePath(this.socketPath)) {
      try {
        await fs.unlink(this.socketPath)
      } catch (error) {
        if (!isFsNotFoundError(error)) {
          throw error
        }
      }
    }

    await new Promise<void>((resolve, reject) => {
      const server = net.createServer((socket) => this.handleConnection(socket))
      const onError = (error: Error): void => {
        server.close()
        reject(error)
      }
      server.once('error', onError)
      server.listen(this.socketPath, () => {
        server.off('error', onError)
        this.server = server
        this.emitLifecycle({ event: 'transport.listening', path: this.socketPath })
        resolve()
      })
    })
  }

  async stop(): Promise<void> {
    if (this.stopped) {
      return
    }
    this.stopped = true

    if (this.client) {
      this.client.removeAllListeners()
      this.client.destroy()
      this.client = null
    }

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server?.close(() => resolve())
      })
      this.server = null
    }

    if (!isWindowsNamedPipePath(this.socketPath)) {
      try {
        await fs.unlink(this.socketPath)
      } catch (error) {
        if (!isFsNotFoundError(error)) {
          throw error
        }
      }
    }

    this.flushPending()
  }

  getEventWriter(): StreamWriter {
    return (chunk) => {
      if (this.client && !this.client.destroyed) {
        this.client.write(chunk)
      }
    }
  }

  async nextCommand(): Promise<InteractiveCommand | null> {
    if (this.commandQueue.length > 0) {
      return this.commandQueue.shift() ?? null
    }

    if (this.stopped) {
      return null
    }

    return await new Promise<InteractiveCommand | null>((resolve) => {
      this.pendingResolvers.push(resolve)
    })
  }

  private handleConnection(socket: net.Socket): void {
    if (this.client && !this.client.destroyed) {
      this.client.destroy()
    }
    this.client = socket
    this.buffer = ''
    this.emitLifecycle({ event: 'transport.client.connected', status: 'connected' })
    socket.setEncoding('utf8')
    socket.on('data', (data: string) => {
      this.handleData(data)
    })
    socket.on('close', () => {
      if (this.client === socket) {
        this.client = null
      }
      this.emitLifecycle({ event: 'transport.client.disconnected', status: 'disconnected' })
      this.flushPending()
    })
    socket.on('error', () => {
      if (this.client === socket) {
        this.client = null
        this.emitLifecycle({ event: 'transport.client.disconnected', status: 'disconnected' })
      }
    })
  }

  private handleData(data: string): void {
    this.buffer += data
    let newlineIndex = this.buffer.indexOf('\n')
    while (newlineIndex >= 0) {
      const raw = this.buffer.slice(0, newlineIndex).trim()
      this.buffer = this.buffer.slice(newlineIndex + 1)
      if (raw) {
        this.processRawCommand(raw)
      }
      newlineIndex = this.buffer.indexOf('\n')
    }
  }

  private processRawCommand(raw: string): void {
    try {
      const parsed = JSON.parse(raw) as { type?: string; instruction?: unknown }
      if (parsed.type === 'refine' && typeof parsed.instruction === 'string') {
        const instruction = parsed.instruction.trim()
        if (!instruction) {
          this.sendTransportError('Refinement instruction must be non-empty.')
          return
        }
        this.enqueueCommand({ type: 'refine', instruction })
        return
      }

      if (parsed.type === 'finish') {
        this.enqueueCommand({ type: 'finish' })
        return
      }

      this.sendTransportError('Unknown interactive command.')
    } catch (error) {
      this.sendTransportError('Invalid command payload; expected JSON.')
    }
  }

  private enqueueCommand(command: InteractiveCommand): void {
    if (this.pendingResolvers.length > 0) {
      const resolve = this.pendingResolvers.shift()
      resolve?.(command)
      return
    }
    this.commandQueue.push(command)
  }

  private flushPending(): void {
    while (this.pendingResolvers.length > 0) {
      const resolve = this.pendingResolvers.shift()
      resolve?.(null)
    }
    this.commandQueue = []
  }

  private sendTransportError(message: string): void {
    if (this.client && !this.client.destroyed) {
      this.client.write(`${JSON.stringify({ event: 'transport.error', message })}\n`)
    }
  }

  private emitLifecycle(event: TransportLifecycleEventInput): void {
    this.lifecycleEmitter?.(event)
  }
}

const displayContextFiles = (
  files: FileContext[],
  format: 'text' | 'json',
  writeLine: (line: string) => void,
): void => {
  if (format === 'json') {
    writeLine(
      JSON.stringify(
        files.map(({ path, content }) => ({ path, content })),
        null,
        2,
      ),
    )
    return
  }

  writeLine(`\n${chalk.bold.cyan('Context Files')}`)
  writeLine(chalk.dim('──────────────'))

  if (files.length === 0) {
    writeLine(chalk.dim('(none)'))
    return
  }

  files.forEach((file, index) => {
    writeLine(`<file path="${file.path}">`)
    writeLine(file.content)
    writeLine('</file>')
    if (index < files.length - 1) {
      writeLine('')
    }
  })
}

const writeContextFile = async (
  filePath: string,
  format: 'text' | 'json',
  files: FileContext[],
): Promise<void> => {
  const payload = format === 'json' ? serializeContextAsJson(files) : serializeContextAsText(files)
  await fs.writeFile(filePath, payload, 'utf8')
}

const serializeContextAsJson = (files: FileContext[]): string =>
  JSON.stringify(
    files.map(({ path, content }) => ({ path, content })),
    null,
    2,
  )

const serializeContextAsText = (files: FileContext[]): string => {
  if (files.length === 0) {
    return '(none)'
  }
  return files
    .map((file) => [`<file path="${file.path}">`, file.content, '</file>'].join('\n'))
    .join('\n\n')
}
