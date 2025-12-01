import fs from 'node:fs/promises'
import path from 'node:path'
import { createInterface, Interface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import clipboard from 'clipboardy'
import fg from 'fast-glob'
import open from 'open'
import yargs from 'yargs'
import type { ArgumentsCamelCase } from 'yargs'

import { callLLM } from '@prompt-maker/core'

import { loadCliConfig } from './config'
import { readFromStdin } from './io'
import { resolveFileContext, type FileContext } from './file-context'
import { appendToHistory } from './history-logger'
import { countTokens, formatTokenCount } from './token-counter'
import * as vectorStore from './rag/vector-store'

import {
  createPromptGeneratorService,
  ensureModelCredentials,
  isGemini,
  resolveDefaultGenerateModel,
  type PromptGenerationRequest,
} from './prompt-generator-service'

const MAX_INTENT_FILE_BYTES = 512 * 1024
const SMART_CONTEXT_PATTERNS = ['**/*.{ts,tsx,js,jsx,py,md,json}']
const SMART_CONTEXT_IGNORES = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/coverage/**',
]
const VALUE_FLAGS = new Set([
  '--intent-file',
  '-f',
  '--model',
  '--polish-model',
  '--context',
  '-c',
  '--image',
  '--video',
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
  help: boolean
  context: string[]
  images: string[]
  video: string[]
  smartContext: boolean
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

  if (args.interactive && !interactive) {
    console.warn('Interactive mode requested but no TTY detected; continuing non-interactive run.')
  }

  const shouldDisplay = !args.json
  const showProgress = args.progress && !interactive

  if (args.smartContext) {
    const smartFiles = await collectSmartContextFiles(intent, fileContext, showProgress)
    if (smartFiles.length > 0) {
      fileContext = [...fileContext, ...smartFiles]
    }
  }

  const stopGenerationProgress = showProgress ? startProgress('Generating prompt') : null
  const { prompt: generatedPrompt, iterations } = await runGenerationWorkflow({
    service,
    context: { intent, refinements, model, fileContext, images: args.images, videos: args.video },
    interactive,
    display: shouldDisplay,
  })
  stopGenerationProgress?.('Generated prompt ✓')

  const polishModel = args.polishModel ?? process.env.PROMPT_MAKER_POLISH_MODEL ?? model
  let polishedPrompt: string | undefined

  if (args.polish) {
    const stopPolishProgress = showProgress ? startProgress('Polishing prompt') : null
    try {
      polishedPrompt = await polishPrompt(intent, generatedPrompt, polishModel)
    } finally {
      stopPolishProgress?.('Polished prompt ✓')
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
    .option('context', {
      alias: 'c',
      type: 'string',
      array: true,
      default: [],
      describe: 'Add file context via glob (repeatable)',
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
    .option('smart-context', {
      type: 'boolean',
      default: false,
      describe: 'Automatically attach relevant files via local embeddings',
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
    context: string[]
    image: string[]
    video: string[]
    smartContext: boolean
    _?: (string | number)[]
  }>

  const intent = positionalIntent ?? (typeof parsed._?.[0] === 'string' ? parsed._?.[0] : undefined)

  const args: GenerateArgs = {
    interactive: parsed.interactive ?? false,
    copy: parsed.copy ?? false,
    openChatGpt: parsed.openChatgpt ?? false,
    polish: parsed.polish ?? false,
    json: parsed.json ?? false,
    progress: parsed.progress ?? true,
    help: Boolean(parsed.help),
    context: (parsed.context ?? []).map((value) => value.toString()),
    images: (parsed.image ?? []).map((value) => value.toString()),
    video: (parsed.video ?? []).map((value) => value.toString()),
    smartContext: parsed.smartContext ?? false,
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

const collectSmartContextFiles = async (
  intent: string,
  currentContext: FileContext[],
  showProgress: boolean,
): Promise<FileContext[]> => {
  const filesToIndex = await fg(SMART_CONTEXT_PATTERNS, {
    dot: true,
    absolute: true,
    ignore: SMART_CONTEXT_IGNORES,
  })

  if (filesToIndex.length === 0) {
    return []
  }

  const uniqueFiles = [...new Set(filesToIndex.map((filePath) => path.resolve(filePath)))]
  const stopSmartContextProgress = showProgress ? startProgress('Indexing smart context') : null

  try {
    await vectorStore.indexFiles(uniqueFiles)
    stopSmartContextProgress?.('Indexed smart context ✓')
  } catch (error) {
    stopSmartContextProgress?.('Failed to index smart context')
    const message = error instanceof Error ? error.message : 'Unknown smart context error.'
    console.warn(`Smart context indexing failed: ${message}`)
    return []
  }

  let relatedPaths: string[] = []
  try {
    relatedPaths = await vectorStore.search(intent, 5)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown smart context search error.'
    console.warn(`Smart context search failed: ${message}`)
    return []
  }

  const availableSet = new Set(uniqueFiles.map((filePath) => normalizePath(filePath)))
  const filtered = relatedPaths
    .map((filePath) => normalizePath(filePath))
    .filter((filePath) => availableSet.has(filePath))

  if (filtered.length === 0) {
    return []
  }

  return await readSmartContextFiles(filtered, currentContext)
}

const readSmartContextFiles = async (
  candidatePaths: string[],
  currentContext: FileContext[],
): Promise<FileContext[]> => {
  const existingPaths = new Set(currentContext.map((file) => normalizePath(file.path)))
  const results: FileContext[] = []

  for (const filePath of candidatePaths) {
    if (existingPaths.has(filePath)) {
      continue
    }

    try {
      const content = await fs.readFile(filePath, 'utf8')
      results.push({ path: toDisplayPath(filePath), content })
      existingPaths.add(filePath)
    } catch (error) {
      console.warn(`Warning: Failed to read smart context file ${filePath}`)
    }
  }

  return results
}

const normalizePath = (filePath: string): string => path.resolve(filePath)

const toDisplayPath = (absolutePath: string): string => {
  const cwd = process.cwd()
  const relative = path.relative(cwd, absolutePath)
  if (!relative || relative.startsWith('..')) {
    return absolutePath
  }
  return relative
}

const runGenerationWorkflow = async ({
  service,
  context,
  interactive,
  display,
}: {
  service: PromptGenerator
  context: LoopContext
  interactive: boolean
  display: boolean
}): Promise<{ prompt: string; iterations: number }> => {
  let iteration = 0
  let currentPrompt = ''

  const fileTokens = context.fileContext.reduce((acc, file) => acc + countTokens(file.content), 0)
  const intentTokens = countTokens(context.intent)
  const totalInputTokens = fileTokens + intentTokens

  if (display) {
    console.log(`\nContext Size: ${formatTokenCount(totalInputTokens)}`)
    if (fileTokens > 0) {
      console.log(
        `(Files: ~${formatTokenCount(fileTokens)}, Intent: ~${formatTokenCount(intentTokens)})`,
      )
    } else {
      console.log(`(Intent: ~${formatTokenCount(intentTokens)})`)
    }
  }

  iteration += 1
  currentPrompt = await generateAndMaybeDisplay(service, { ...context, iteration }, display)

  if (interactive) {
    const rl = createInterface({ input, output })

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const wantsRefine = await promptYesNo(rl, 'Refine? (y/n): ')
        if (!wantsRefine) {
          break
        }

        const refinement = await collectRefinement(rl)
        if (!refinement) {
          console.log('No refinement provided. Ending interactive session.')
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
        )
      }
    } finally {
      rl.close()
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
): Promise<string> => {
  const request: PromptGenerationRequest = {
    intent: context.intent,
    model: context.model,
    fileContext: context.fileContext,
    images: context.images,
    videos: context.videos,
  }

  if (context.previousPrompt && context.latestRefinement) {
    request.previousPrompt = context.previousPrompt
    request.refinementInstruction = context.latestRefinement
  }

  const prompt = await service.generatePrompt(request)

  if (display) {
    const outputTokens = countTokens(prompt)
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

const displayPrompt = (prompt: string, iteration: number, tokenCount?: number): void => {
  const label = iteration === 1 ? 'Generated prompt' : `Generated prompt (iteration ${iteration})`
  const meta = typeof tokenCount === 'number' ? ` [${formatTokenCount(tokenCount)}]` : ''
  console.log('\nAI Prompt Generator')
  console.log('────────────────────')
  console.log(`${label}${meta}:\n`)
  console.log(prompt)
}

const displayPolishedPrompt = (prompt: string, model: string): void => {
  console.log('\nPolished prompt')
  console.log('────────────────────')
  console.log(prompt)
  console.log(`\n(Model: ${model})`)
}

const promptYesNo = async (rl: Interface, question: string): Promise<boolean> => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = (await rl.question(question)).trim().toLowerCase()
    if (response === 'y' || response === 'yes') {
      return true
    }
    if (response === 'n' || response === 'no' || response === '') {
      return false
    }
    console.log('Please respond with y or n.')
  }
}

const collectRefinement = async (rl: Interface): Promise<string | null> => {
  console.log('\nDescribe the refinement. Submit an empty line to finish.')
  const lines: string[] = []

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const line = await rl.question('> ')
    if (!line.trim()) {
      break
    }
    lines.push(line)
  }

  const refinement = lines.join('\n').trim()
  return refinement || null
}

const maybeCopyToClipboard = async (shouldCopy: boolean, prompt: string): Promise<void> => {
  if (!shouldCopy) {
    return
  }

  try {
    await clipboard.write(prompt)
    console.log('Copied prompt to clipboard.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown clipboard error.'
    console.warn(`Failed to copy prompt to clipboard: ${message}`)
  }
}

const maybeOpenChatGpt = async (shouldOpen: boolean, prompt: string): Promise<void> => {
  if (!shouldOpen) {
    return
  }

  const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`

  try {
    await open(url)
    console.log('Opened ChatGPT with the generated prompt.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown browser error.'
    console.warn(`Failed to open ChatGPT: ${message}`)
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

const startProgress = (label: string): ((finalMessage?: string) => void) => {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let index = 0
  let active = true
  process.stderr.write(`${label} ${frames[index]}`)
  const timer = setInterval(() => {
    index = (index + 1) % frames.length
    process.stderr.write(`\r${label} ${frames[index]}`)
  }, 120)

  return (finalMessage?: string) => {
    if (!active) {
      return
    }
    active = false
    clearInterval(timer)
    const message = finalMessage ?? `${label} ✓`
    process.stderr.write(`\r${message}\n`)
  }
}
