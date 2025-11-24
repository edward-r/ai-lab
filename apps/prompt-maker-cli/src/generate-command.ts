import fs from 'node:fs/promises'
import { createInterface, Interface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import clipboard from 'clipboardy'
import open from 'open'

import { readFromStdin } from './io'
import {
  createPromptGeneratorService,
  resolveDefaultGenerateModel,
} from './prompt-generator-service'

type PromptGenerator = Awaited<ReturnType<typeof createPromptGeneratorService>>

export const runGenerateCommand = async (argv: string[]): Promise<void> => {
  const args = parseGenerateArgs(argv)

  if (args.help) {
    printGenerateUsage()
    return
  }

  const intent = await resolveIntent(args)
  const service = await createPromptGeneratorService()
  const model = args.model ?? (await resolveDefaultGenerateModel())
  const refinements: string[] = []
  const interactive = args.interactive && input.isTTY && output.isTTY

  if (args.interactive && !interactive) {
    console.warn('Interactive mode requested but no TTY detected; continuing non-interactive run.')
  }

  let finalPrompt: string

  if (interactive) {
    finalPrompt = await runInteractiveLoop(service, { intent, refinements, model })
  } else {
    finalPrompt = await generateAndReport(service, { intent, refinements, model, iteration: 1 })
  }

  await maybeCopyToClipboard(args.copy, finalPrompt)
  await maybeOpenChatGpt(args.openChatGpt, finalPrompt)
}

type GenerateArgs = {
  intent?: string
  intentFile?: string
  model?: string
  interactive: boolean
  copy: boolean
  openChatGpt: boolean
  help: boolean
}

type LoopContext = {
  intent: string
  refinements: string[]
  model: string
}

const parseGenerateArgs = (argv: string[]): GenerateArgs => {
  const args: GenerateArgs = {
    interactive: false,
    copy: false,
    openChatGpt: false,
    help: false,
  }

  let capturedIntent = false

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token) {
      continue
    }

    if (!token.startsWith('-') && !capturedIntent) {
      args.intent = token
      capturedIntent = true
      continue
    }

    switch (token) {
      case '--intent-file':
      case '-f': {
        const value = argv[i + 1]
        if (!value) {
          throw new Error('Missing value for --intent-file flag.')
        }
        args.intentFile = value
        i += 1
        break
      }
      case '--model': {
        const value = argv[i + 1]
        if (!value) {
          throw new Error('Missing value for --model flag.')
        }
        args.model = value
        i += 1
        break
      }
      case '--interactive':
      case '-i':
        args.interactive = true
        break
      case '--copy':
        args.copy = true
        break
      case '--open-chatgpt':
        args.openChatGpt = true
        break
      case '--help':
      case '-h':
        args.help = true
        break
      default:
        throw new Error(`Unknown flag for generate command: ${token}`)
    }
  }

  return args
}

const resolveIntent = async (args: GenerateArgs): Promise<string> => {
  if (args.intent && args.intentFile) {
    throw new Error('Provide either an inline intent argument or --intent-file, not both.')
  }

  if (args.intentFile) {
    const data = await fs.readFile(args.intentFile, 'utf8')
    const trimmed = data.trim()
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

const runInteractiveLoop = async (
  service: PromptGenerator,
  context: LoopContext,
): Promise<string> => {
  const rl = createInterface({ input, output })
  let iteration = 0
  let latest = ''

  try {
    iteration = 1
    latest = await generateAndReport(service, { ...context, iteration })

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const wantsRefine = await promptYesNo(rl, 'Refine? (y/n): ')
      if (!wantsRefine) {
        return latest
      }

      const refinement = await collectRefinement(rl)
      if (!refinement) {
        console.log('No refinement provided. Ending interactive session.')
        return latest
      }

      context.refinements.push(refinement)
      iteration += 1
      latest = await generateAndReport(service, { ...context, iteration })
    }
  } finally {
    rl.close()
  }
}

const generateAndReport = async (
  service: PromptGenerator,
  context: LoopContext & { iteration: number },
): Promise<string> => {
  const prompt = await service.generatePrompt({
    intent: context.intent,
    refinements: context.refinements,
    model: context.model,
  })

  displayPrompt(prompt, context.iteration)
  return prompt
}

const displayPrompt = (prompt: string, iteration: number): void => {
  const label = iteration === 1 ? 'Generated prompt' : `Generated prompt (iteration ${iteration})`
  console.log('\nAI Prompt Generator')
  console.log('────────────────────')
  console.log(`${label}:\n`)
  console.log(prompt)
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

const printGenerateUsage = () => {
  console.log(`prompt-maker-cli generate <intent>

Options:
  <intent>                 Rough intent text (quoted)
  -f, --intent-file <path> Read intent from file
      --model <name>       Override model (default from config)
  -i, --interactive        Enable interactive refinement loop
      --copy               Copy the final prompt to the clipboard
      --open-chatgpt       Open https://chatgpt.com with the prompt
  -h, --help               Show this help message
`)
}
