import fs from 'node:fs/promises'
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
  '--smart-context-root',
])

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
  progress: boolean
  stream: StreamMode
  showContext: boolean
  contextFile?: string
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

type GenerateJsonPayload = {
  intent: string
  model: string
  prompt: string
  refinements: string[]
  iterations: number
  interactive: boolean
  timestamp: string
  polishedPrompt?: string
  polishModel?: string
}

type StreamMode = 'none' | 'jsonl'

type StreamEventBase<EventName extends string, Payload extends object> = {
  event: EventName
  timestamp: string
} & Payload

type ContextTelemetryStreamEvent = StreamEventBase<
  'context.telemetry',
  { telemetry: TokenTelemetry }
>
type ProgressStreamEvent = StreamEventBase<
  'progress.update',
  {
    label: string
    state: 'start' | 'update' | 'stop'
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
  | GenerationFinalStreamEvent

type StreamEventInput = {
  [EventName in StreamEvent['event']]: Omit<Extract<StreamEvent, { event: EventName }>, 'timestamp'>
}[StreamEvent['event']]

type StreamWriter = (chunk: string) => void

type StreamDispatcher = {
  mode: StreamMode
  emit: (event: StreamEventInput) => void
}

const createStreamDispatcher = (
  mode: StreamMode,
  writer: StreamWriter = (chunk) => {
    output.write(chunk)
  },
): StreamDispatcher => {
  if (mode !== 'jsonl') {
    return { mode, emit: () => {} }
  }

  return {
    mode,
    emit: (event) => {
      const payload = { ...event, timestamp: new Date().toISOString() }
      writer(`${JSON.stringify(payload)}\n`)
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

  if (args.json && args.interactive) {
    throw new Error('--json cannot be combined with --interactive.')
  }

  const intent = await resolveIntent(args)
  let fileContext = await resolveFileContext(args.context)
  const service = await createPromptGeneratorService()
  let model = args.model ?? (await resolveDefaultGenerateModel())

  if (args.video.length > 0 && !isGemini(model)) {
    model = await resolveGeminiVideoModel()
    console.warn('Switching to Gemini 1.5 Pro to support video input.')
  }

  const refinements: string[] = []
  const interactive = args.interactive && input.isTTY && output.isTTY
  const streamDispatcher = createStreamDispatcher(args.stream)

  if (args.interactive && !interactive) {
    console.warn('Interactive mode requested but no TTY detected; continuing non-interactive run.')
  }

  const shouldDisplay = !args.json
  const showProgress = args.progress && !interactive

  if (args.urls.length > 0) {
    const urlProgress = showProgress ? startProgress('Fetching URL context') : null
    const urlOptions: ResolveUrlContextOptions | undefined = showProgress
      ? {
          onProgress: (message: string) => {
            urlProgress?.setLabel(message)
          },
        }
      : undefined

    try {
      const urlFiles = await resolveUrlContext(args.urls, urlOptions)
      if (urlFiles.length > 0) {
        fileContext = [...fileContext, ...urlFiles]
      }
    } finally {
      urlProgress?.stop('URL context ready')
    }
  }

  if (args.smartContext) {
    const smartContextProgress = showProgress ? startProgress('Preparing smart context') : null
    try {
      const smartFiles = await resolveSmartContextFiles(
        intent,
        fileContext,
        showProgress ? (message) => smartContextProgress?.setLabel(message) : undefined,
        args.smartContextRoot,
      )
      if (smartFiles.length > 0) {
        fileContext = [...fileContext, ...smartFiles]
      }
    } finally {
      smartContextProgress?.stop()
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

  if (args.contextFile) {
    await writeContextFile(args.contextFile, args.contextFormat, fileContext)
  }

  const generationProgress = showProgress ? startProgress('Generating prompt') : null
  const handleUploadStateChange =
    generationProgress || streamDispatcher.mode !== 'none'
      ? createUploadStateTracker(generationProgress, 'Generating prompt', streamDispatcher)
      : undefined

  const { prompt: generatedPrompt, iterations } = await runGenerationWorkflow({
    service,
    context: { intent, refinements, model, fileContext, images: args.images, videos: args.video },
    interactive,
    display: shouldDisplay,
    stream: streamDispatcher,
    ...(handleUploadStateChange ? { onUploadStateChange: handleUploadStateChange } : {}),
  })
  generationProgress?.stop('Generated prompt ✓')

  const polishModel = args.polishModel ?? process.env.PROMPT_MAKER_POLISH_MODEL ?? model
  let polishedPrompt: string | undefined

  if (args.polish) {
    const polishProgress = showProgress ? startProgress('Polishing prompt') : null
    try {
      polishedPrompt = await polishPrompt(intent, generatedPrompt, polishModel)
    } finally {
      polishProgress?.stop('Polished prompt ✓')
    }
  }

  const artifact = polishedPrompt ?? generatedPrompt

  await maybeCopyToClipboard(args.copy, artifact)
  await maybeOpenChatGpt(args.openChatGpt, artifact)

  const payload: GenerateJsonPayload = {
    intent,
    model,
    prompt: generatedPrompt,
    refinements: [...refinements],
    iterations,
    interactive,
    timestamp: new Date().toISOString(),
  }

  if (polishedPrompt) {
    payload.polishedPrompt = polishedPrompt
    payload.polishModel = polishModel
  }

  streamDispatcher.emit({ event: 'generation.final', result: payload })

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2))
    await appendToHistory(payload)
    return
  }

  if (polishedPrompt) {
    displayPolishedPrompt(polishedPrompt, polishModel)
  }

  await appendToHistory(payload)
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
  interactive,
  display,
  stream,
  onUploadStateChange,
}: {
  service: PromptGenerator
  context: LoopContext
  interactive: boolean
  display: boolean
  stream: StreamDispatcher
  onUploadStateChange?: UploadStateChange
}): Promise<{ prompt: string; iterations: number }> => {
  let iteration = 0
  let currentPrompt = ''

  const fileSummaries = context.fileContext.map((file) => ({
    path: file.path,
    tokens: countTokens(file.content),
  }))
  const fileTokens = fileSummaries.reduce((acc, file) => acc + file.tokens, 0)
  const intentTokens = countTokens(context.intent)
  const totalInputTokens = fileTokens + intentTokens
  const telemetry: TokenTelemetry = {
    files: fileSummaries,
    intentTokens,
    fileTokens,
    totalTokens: totalInputTokens,
  }

  stream.emit({ event: 'context.telemetry', telemetry })

  if (display) {
    displayTokenSummary(telemetry)
  }

  iteration += 1
  currentPrompt = await generateAndMaybeDisplay(
    service,
    { ...context, iteration },
    display,
    stream,
    interactive,
    onUploadStateChange,
  )

  if (interactive) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const wantsRefine = await askShouldRefine()
      if (!wantsRefine) {
        break
      }

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
        interactive,
        onUploadStateChange,
      )
    }
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

const maybeCopyToClipboard = async (shouldCopy: boolean, prompt: string): Promise<void> => {
  if (!shouldCopy) {
    return
  }

  try {
    await clipboard.write(prompt)
    console.log(chalk.green('✓ Copied prompt to clipboard.'))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown clipboard error.'
    console.warn(chalk.yellow(`Failed to copy prompt to clipboard: ${message}`))
  }
}

const maybeOpenChatGpt = async (shouldOpen: boolean, prompt: string): Promise<void> => {
  if (!shouldOpen) {
    return
  }

  const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`

  try {
    await open(url)
    console.log(chalk.green('✓ Opened ChatGPT with the generated prompt.'))
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

const startProgress = (label: string): ProgressHandle => {
  const spinner = ora({
    text: chalk.dim(label),
    color: 'cyan',
    spinner: 'dots',
  }).start()
  let stopped = false

  const stop = (finalMessage?: string): void => {
    if (stopped) {
      return
    }
    stopped = true
    if (finalMessage) {
      spinner.succeed(finalMessage)
      return
    }
    spinner.succeed(chalk.green(`${label} ✓`))
  }

  const setLabel = (nextLabel: string): void => {
    if (stopped) {
      return
    }
    spinner.text = chalk.dim(nextLabel)
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
