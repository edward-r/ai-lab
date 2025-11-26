import fs from 'node:fs/promises'
import { createInterface, Interface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import clipboard from 'clipboardy'
import open from 'open'

import { callLLM } from '@prompt-maker/core'

import { readFromStdin } from './io'
import {
  createPromptGeneratorService,
  ensureModelCredentials,
  resolveDefaultGenerateModel,
} from './prompt-generator-service'

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
}

type LoopContext = {
  intent: string
  refinements: string[]
  model: string
}

type GenerateJsonPayload = {
  intent: string
  model: string
  prompt: string
  refinements: string[]
  iterations: number
  interactive: boolean
  polishedPrompt?: string
  polishModel?: string
}

const POLISH_SYSTEM_PROMPT =
  'You refine prompt contracts for language models. Preserve headings, bullet ordering, and constraints. Only tighten wording and fix inconsistencies.'

export const runGenerateCommand = async (argv: string[]): Promise<void> => {
  const args = parseGenerateArgs(argv)

  if (args.help) {
    printGenerateUsage()
    return
  }

  if (args.json && args.interactive) {
    throw new Error('--json cannot be combined with --interactive.')
  }

  const intent = await resolveIntent(args)
  const service = await createPromptGeneratorService()
  const model = args.model ?? (await resolveDefaultGenerateModel())
  const refinements: string[] = []
  const interactive = args.interactive && input.isTTY && output.isTTY

  if (args.interactive && !interactive) {
    console.warn('Interactive mode requested but no TTY detected; continuing non-interactive run.')
  }

  const shouldDisplay = !args.json
  const showProgress = args.progress && !interactive
  const stopGenerationProgress = showProgress ? startProgress('Generating prompt') : null
  const { prompt: generatedPrompt, iterations } = await runGenerationWorkflow({
    service,
    context: { intent, refinements, model },
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

  if (args.json) {
    const payload: GenerateJsonPayload = {
      intent,
      model,
      prompt: generatedPrompt,
      refinements: [...refinements],
      iterations,
      interactive,
    }

    if (polishedPrompt) {
      payload.polishedPrompt = polishedPrompt
      payload.polishModel = polishModel
    }

    console.log(JSON.stringify(payload, null, 2))
    return
  }

  if (polishedPrompt) {
    displayPolishedPrompt(polishedPrompt, polishModel)
  }
}

const parseGenerateArgs = (argv: string[]): GenerateArgs => {
  const args: GenerateArgs = {
    interactive: false,
    copy: false,
    openChatGpt: false,
    polish: false,
    json: false,
    progress: true,
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
      case '--polish-model': {
        const value = argv[i + 1]
        if (!value) {
          throw new Error('Missing value for --polish-model flag.')
        }
        args.polishModel = value
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
      case '--polish':
        args.polish = true
        break
      case '--json':
        args.json = true
        break
      case '--progress':
        args.progress = true
        break
      case '--no-progress':
        args.progress = false
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
  let latest = ''

  if (interactive) {
    const rl = createInterface({ input, output })

    try {
      iteration += 1
      latest = await generateAndMaybeDisplay(service, { ...context, iteration }, display)

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
        latest = await generateAndMaybeDisplay(service, { ...context, iteration }, display)
      }
    } finally {
      rl.close()
    }
  } else {
    iteration = 1
    latest = await generateAndMaybeDisplay(service, { ...context, iteration }, display)
  }

  return { prompt: latest, iterations: iteration }
}

const generateAndMaybeDisplay = async (
  service: PromptGenerator,
  context: LoopContext & { iteration: number },
  display: boolean,
): Promise<string> => {
  const prompt = await service.generatePrompt({
    intent: context.intent,
    refinements: context.refinements,
    model: context.model,
  })

  if (display) {
    displayPrompt(prompt, context.iteration)
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

const displayPrompt = (prompt: string, iteration: number): void => {
  const label = iteration === 1 ? 'Generated prompt' : `Generated prompt (iteration ${iteration})`
  console.log('\nAI Prompt Generator')
  console.log('────────────────────')
  console.log(`${label}:\n`)
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

const printGenerateUsage = () => {
  console.log(`Prompt Maker CLI (generate-only)

Usage:
  prompt-maker-cli [intent] [options]
  prompt-maker-cli generate [intent] [options]

Options:
  <intent>                  Rough intent text (quoted)
  -f, --intent-file <path>  Read intent from file
      --model <name>        Override model for generation (default from config)
  -i, --interactive         Enable interactive refinement loop
      --polish              Run the polish pass after generation
      --polish-model <name> Override the model used for polishing
      --json                Emit machine-readable JSON (non-interactive only)
      --no-progress         Disable progress indicator (stderr)
      --copy                Copy the final prompt to the clipboard
      --open-chatgpt        Open https://chatgpt.com with the final prompt
  -h, --help                Show this help message
`)
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
