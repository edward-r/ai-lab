#!/usr/bin/env node

import fs from 'node:fs/promises'
import { createInterface, Interface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import {
  callLLM,
  diagnose,
  generateQuestions,
  improve,
  type ClarifyingQ,
  type CriterionKey,
  type Diagnosis,
  type ImproveResult,
  type PromptSections,
} from '@prompt-maker/core'

const CRITERION_LABELS: Record<CriterionKey, string> = {
  outcome: 'Outcome',
  outputFormat: 'Output Format',
  constraints: 'Constraints',
  context: 'Context',
  processRubric: 'Process & Rubric',
  uncertainty: 'Uncertainty',
}

const CRITERION_KEYS = Object.keys(CRITERION_LABELS) as CriterionKey[]

const DEFAULT_SECTIONS: Partial<PromptSections> = {
  constraints: ['Functional TypeScript', 'No classes', "No 'any'"],
  outputFormat: ['Exact sections with headings', 'One ```ts``` block when code is requested'],
  process: ['Assumptions→Plan→Draft→Critique→Final'],
  rubric: ['Concrete, balanced, actionable; fails if generic.'],
  audienceUse: 'For immediate decision or copy/paste into tools.',
  role: 'Senior assistant tuned for accuracy and specificity',
  objective: 'Produce a clear, testable deliverable.',
  uncertainty: 'If data is missing, ask 3 clarifying questions and propose safe defaults.',
}

type AnswerMap = Partial<Record<CriterionKey, string>>

type CliArgs = {
  prompt?: string
  promptFile?: string
  answersJson?: string
  answersFile?: string
  defaultsFile?: string
  maxQuestions?: number
  json: boolean
  interactive: boolean
  polish: boolean
  model?: string
  help: boolean
}

type CliOutput = {
  prompt: string
  diagnosis: Diagnosis
  questions: ClarifyingQ[]
  answers: AnswerMap
  result: ImproveResult
}

const run = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printUsage()
    return
  }

  let rl: Interface | null = null

  try {
    const interactive = args.interactive && process.stdin.isTTY && process.stdout.isTTY
    const prompt = await resolvePrompt(args, interactive, () => {
      rl ??= createInterface({ input, output })
      return rl
    })

    const answers = await loadAnswerMap(args)
    const defaults = await loadDefaults(args)

    const diagnosis = diagnose(prompt)
    const questions = generateQuestions(diagnosis, args.maxQuestions ?? 4)

    if (interactive && questions.length > 0) {
      rl ??= createInterface({ input, output })
      await collectAnswersInteractively(questions, answers, rl)
    }

    const improved = improve({
      original: prompt,
      answers,
      defaults: {
        ...DEFAULT_SECTIONS,
        ...defaults,
      },
    })

    const result: ImproveResult = {
      ...improved,
      questionsAsked: questions,
    }

    if (args.polish) {
      const model = args.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
      try {
        const polishedPrompt = await callLLM(
          [
            {
              role: 'system',
              content:
                'You refine prompt contracts for language models. Preserve headings, bullet ordering, and constraints. Only tighten wording and fix inconsistencies.',
            },
            {
              role: 'user',
              content: [
                'Original prompt:',
                prompt,
                '---',
                'Improved prompt candidate:',
                result.improvedPrompt,
                '---',
                'Return the polished prompt text, preserving exact sections.',
              ].join('\n'),
            },
          ],
          model,
        )

        result.polishedPrompt = polishedPrompt
        result.model = model
        delete result.polishError
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to polish prompt.'
        result.polishError = message
      }
    }

    const payload: CliOutput = { prompt, diagnosis, questions, answers, result }

    if (args.json) {
      console.log(JSON.stringify(payload, null, 2))
    } else {
      displayHumanReadable(payload)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected CLI error.'
    console.error(`Error: ${message}`)
    process.exitCode = 1
  } finally {
    if (rl) {
      rl.close()
    }
  }
}

const parseArgs = (argv: string[]): CliArgs => {
  const args: CliArgs = {
    json: false,
    interactive: true,
    polish: false,
    help: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]

    switch (token) {
      case '--prompt':
      case '-p': {
        const value = argv[i + 1]
        if (!value) {
          throw new Error('Missing value for --prompt flag.')
        }
        args.prompt = value
        i += 1
        break
      }
      case '--prompt-file':
      case '-f': {
        const value = argv[i + 1]
        if (!value) {
          throw new Error('Missing value for --prompt-file flag.')
        }
        args.promptFile = value
        i += 1
        break
      }
      case '--answers-json': {
        const value = argv[i + 1]
        if (!value) {
          throw new Error('Missing value for --answers-json flag.')
        }
        args.answersJson = value
        i += 1
        break
      }
      case '--answers-file': {
        const value = argv[i + 1]
        if (!value) {
          throw new Error('Missing value for --answers-file flag.')
        }
        args.answersFile = value
        i += 1
        break
      }
      case '--defaults-file': {
        const value = argv[i + 1]
        if (!value) {
          throw new Error('Missing value for --defaults-file flag.')
        }
        args.defaultsFile = value
        i += 1
        break
      }
      case '--max-questions':
      case '-q': {
        const value = argv[i + 1]
        if (!value) {
          throw new Error('Missing value for --max-questions flag.')
        }
        const count = Number.parseInt(value, 10)
        if (Number.isNaN(count) || count < 0) {
          throw new Error('--max-questions must be a non-negative integer.')
        }
        args.maxQuestions = count
        i += 1
        break
      }
      case '--json':
        args.json = true
        break
      case '--no-interactive':
        args.interactive = false
        break
      case '--polish':
        args.polish = true
        break
      case '--model': {
        const value = argv[i + 1]
        if (!value) {
          throw new Error('Missing value for --model flag.')
        }
        args.model = value
        i += 1
        break
      }
      case '--help':
      case '-h':
        args.help = true
        break
      default:
        throw new Error(`Unknown flag: ${token}`)
    }
  }

  return args
}

const printUsage = () => {
  console.log(
    `Prompt Maker CLI\n\nUsage:\n  prompt-maker-cli [options]\n\nOptions:\n  -p, --prompt <text>          Inline prompt text\n  -f, --prompt-file <path>     Read prompt from file\n      --answers-json <json>     Provide clarifying answers as JSON\n      --answers-file <path>     Provide clarifying answers JSON file\n      --defaults-file <path>    Override contract defaults via JSON file\n  -q, --max-questions <n>     Number of clarifying questions (default 4)\n      --json                   Output machine-readable JSON\n      --no-interactive         Disable interactive questions even in a TTY\n      --polish                 Run OpenAI polish pass (requires OPENAI_API_KEY)\n      --model <name>           Override OPENAI model for polishing\n  -h, --help                  Show this help text\n`,
  )
}

const resolvePrompt = async (
  args: CliArgs,
  interactive: boolean,
  ensureInterface: () => Interface,
): Promise<string> => {
  if (args.prompt?.trim()) {
    return args.prompt.trim()
  }

  if (args.promptFile) {
    const fileContents = await fs.readFile(args.promptFile, 'utf8')
    const trimmed = fileContents.trim()
    if (!trimmed) {
      throw new Error(`Prompt file ${args.promptFile} is empty.`)
    }
    return trimmed
  }

  const piped = await readFromStdin()
  if (piped?.trim()) {
    return piped.trim()
  }

  if (!interactive) {
    throw new Error('Prompt text is required. Use --prompt, --prompt-file, or pipe stdin.')
  }

  const rl = ensureInterface()
  console.log('Paste your draft prompt. Submit an empty line to finish.')
  const lines: string[] = []
  let collecting = true
  while (collecting) {
    const line = await rl.question('> ')
    if (!line.trim()) {
      collecting = false
    } else {
      lines.push(line)
    }
  }

  const prompt = lines.join('\n').trim()
  if (!prompt) {
    throw new Error('Prompt cannot be empty.')
  }

  return prompt
}

const readFromStdin = async (): Promise<string | null> => {
  if (process.stdin.isTTY) {
    return null
  }

  const chunks: Buffer[] = []

  return await new Promise<string>((resolve, reject) => {
    process.stdin.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk)
    })
    process.stdin.on('error', reject)
    process.stdin.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
  })
}

const loadAnswerMap = async (args: CliArgs): Promise<AnswerMap> => {
  let answers: AnswerMap = {}

  if (args.answersFile) {
    const parsed = await readJsonFile(args.answersFile)
    answers = parseAnswerRecord(parsed, 'answers file')
  }

  if (args.answersJson) {
    const parsed = safeJsonParse(args.answersJson, '--answers-json')
    answers = { ...answers, ...parseAnswerRecord(parsed, '--answers-json') }
  }

  return Object.fromEntries(
    Object.entries(answers).map(([key, value]) => [key, value?.trim() ?? '']),
  ) as AnswerMap
}

const loadDefaults = async (args: CliArgs): Promise<Partial<PromptSections>> => {
  if (!args.defaultsFile) {
    return {}
  }

  const parsed = await readJsonFile(args.defaultsFile)
  return parsePromptSections(parsed, 'defaults file')
}

const readJsonFile = async (filePath: string): Promise<unknown> => {
  const data = await fs.readFile(filePath, 'utf8')
  try {
    return JSON.parse(data) as unknown
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON.'
    throw new Error(`Failed to parse JSON from ${filePath}: ${message}`)
  }
}

const safeJsonParse = (value: string, label: string): unknown => {
  try {
    return JSON.parse(value) as unknown
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON.'
    throw new Error(`Failed to parse JSON in ${label}: ${message}`)
  }
}

const parseAnswerRecord = (value: unknown, label: string): AnswerMap => {
  if (!isRecord(value)) {
    throw new Error(`Expected ${label} to be a JSON object with string values.`)
  }

  const result: AnswerMap = {}
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== 'string') {
      throw new Error(`Answer for "${key}" in ${label} must be a string.`)
    }
    const criterion = assertCriterionKey(key, label)
    result[criterion] = raw
  }
  return result
}

const assertCriterionKey = (value: string, label: string): CriterionKey => {
  if (CRITERION_KEYS.includes(value as CriterionKey)) {
    return value as CriterionKey
  }
  throw new Error(
    `Unknown criterion key "${value}" in ${label}. Expected one of: ${CRITERION_KEYS.join(', ')}`,
  )
}

const parsePromptSections = (value: unknown, label: string): Partial<PromptSections> => {
  if (!isRecord(value)) {
    throw new Error(`Expected ${label} to be a JSON object.`)
  }

  const result: Partial<PromptSections> = {}
  const target = result as Record<string, unknown>

  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'string') {
      target[key] = raw
    } else if (Array.isArray(raw) && raw.every((item) => typeof item === 'string')) {
      target[key] = raw
    } else if (raw === null || raw === undefined) {
      continue
    } else {
      throw new Error(`Field "${key}" in ${label} must be a string or string array.`)
    }
  }

  return result
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const collectAnswersInteractively = async (
  questions: ClarifyingQ[],
  answers: AnswerMap,
  rl: Interface,
): Promise<void> => {
  console.log('\nAnswer the clarifying questions below. Leave blank to keep existing answers.')

  for (const question of questions) {
    const existing = answers[question.key]
    console.log(`\n${question.question}`)
    if (question.hint) {
      console.log(`Hint: ${question.hint}`)
    }
    if (question.options?.length) {
      console.log('Options:')
      question.options.forEach((option) => console.log(`  - ${option}`))
    }
    if (existing) {
      console.log(`Current answer: ${existing}`)
    }
    console.log('Enter response (blank line to skip):')
    const response = await rl.question('> ')
    const trimmed = response.trim()
    if (trimmed) {
      answers[question.key] = trimmed
    }
  }
}

const displayHumanReadable = (payload: CliOutput) => {
  const { questions, answers, result } = payload
  const baseline = result.diagnosisBefore
  const beforeOverall = formatPercent(baseline.overall)
  const afterOverall = formatPercent(result.diagnosisAfter.overall)
  const delta = result.diagnosisAfter.overall - baseline.overall

  console.log('\nPrompt Maker CLI Results')
  console.log('────────────────────────────')
  console.log(`Original prompt length: ${payload.prompt.length} chars`)
  console.log(`Baseline overall: ${beforeOverall}`)
  console.log(`Improved overall: ${afterOverall} (Δ ${formatPercent(delta)})`)

  console.log('\nCriterion scores:')
  CRITERION_KEYS.forEach((key) => {
    const label = CRITERION_LABELS[key].padEnd(18, ' ')
    console.log(`${label} ${formatPercent(baseline.scores[key])}`)
  })

  if (questions.length > 0) {
    console.log('\nClarifying questions:')
    questions.forEach((question, index) => {
      const answer = answers[question.key]
      console.log(`\n${index + 1}. ${question.question}`)
      if (question.hint) {
        console.log(`   Hint: ${question.hint}`)
      }
      if (question.options?.length) {
        console.log(`   Options: ${question.options.join(' | ')}`)
      }
      console.log(`   Answer: ${answer ? answer : '(not provided)'}`)
    })
  } else {
    console.log('\nNo clarifying questions needed — prompt covers all criteria sufficiently.')
  }

  console.log('\nImproved prompt:')
  console.log('────────────────────────────')
  console.log(result.improvedPrompt)

  if (result.polishedPrompt) {
    console.log('\nPolished prompt:')
    console.log('────────────────────────────')
    console.log(result.polishedPrompt)
    if (result.model) {
      console.log(`(Model: ${result.model})`)
    }
  } else if (result.polishError) {
    console.log('\nPolish error:')
    console.log(result.polishError)
  }
}

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`

void run()
