import fs from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline'

import yaml from 'js-yaml'
import yargs from 'yargs'
import type { ArgumentsCamelCase } from 'yargs'

import { resolveFileContext, type FileContext } from './file-context'
import {
  createPromptGeneratorService,
  resolveDefaultGenerateModel,
  type PromptGenerationRequest,
} from './prompt-generator-service'
import { resolveSmartContextFiles } from './smart-context-service'
import { parsePromptTestSuite, type PromptTestSuite, type PromptTest } from './testing/test-schema'
import { evaluatePrompt } from './testing/evaluator'

const DEFAULT_TEST_FILE = 'prompt-tests.yaml'
const PROGRESS_BAR_WIDTH = 24

type TestArgs = {
  file: string
}

export type TestResult = {
  name: string
  pass: boolean
  reason: string
}

type TestProgressReporter = {
  startTest: (ordinal: number, testName: string) => void
  completeTest: () => void
  completeAll: () => void
}

export type PromptTestRunReporter = {
  onSuiteLoaded?: (suite: PromptTestSuite, filePath: string) => void
  onTestStart?: (ordinal: number, test: PromptTest) => void
  onTestComplete?: (ordinal: number, result: TestResult) => void
  onComplete?: (results: TestResult[]) => void
}

export type PromptTestRunOptions = {
  reporter?: PromptTestRunReporter
}

export const runPromptTestSuite = async (
  filePath: string,
  options: PromptTestRunOptions = {},
): Promise<TestResult[]> => {
  const absolutePath = path.resolve(process.cwd(), filePath)
  const suite = await loadTestSuite(absolutePath)
  options.reporter?.onSuiteLoaded?.(suite, absolutePath)
  const results = await executePromptTests(suite, options.reporter)
  options.reporter?.onComplete?.(results)
  return results
}

export const runTestCommand = async (argv: string[]): Promise<void> => {
  const { file } = parseTestArgs(argv)
  const filePath = path.resolve(process.cwd(), file)

  let progressReporter: TestProgressReporter | null = null
  const reporter: PromptTestRunReporter = {
    onSuiteLoaded: (suite, loadedPath) => {
      console.log(`Loaded ${suite.tests.length} test(s) from ${formatDisplayPath(loadedPath)}.`)
      progressReporter = createTestProgressReporter(suite.tests.length)
    },
    onTestStart: (ordinal, test) => {
      progressReporter?.startTest(ordinal, test.name)
    },
    onTestComplete: () => {
      progressReporter?.completeTest()
    },
    onComplete: () => {
      progressReporter?.completeAll()
    },
  }

  const results = await runPromptTestSuite(filePath, { reporter })

  console.log('\nTest Results')
  console.log('────────────')
  for (const result of results) {
    const status = result.pass ? 'PASS' : 'FAIL'
    console.log(`${status.padEnd(4)}  ${result.name} - ${result.reason}`)
  }

  const failures = results.filter((result) => !result.pass)
  if (failures.length > 0) {
    console.log(`\n${failures.length} test(s) failed.`)
    process.exitCode = 1
  } else {
    console.log('\nAll tests passed!')
  }
}

const parseTestArgs = (argv: string[]): TestArgs => {
  const parser = yargs(argv)
    .scriptName('prompt-maker-cli test')
    .usage('prompt-maker-cli test [file]')
    .command('$0 [file]', 'Run prompt quality tests', (cmd) =>
      cmd.positional('file', {
        type: 'string',
        describe: 'Path to a prompt test definition file (YAML)',
        default: DEFAULT_TEST_FILE,
      }),
    )
    .help('help')
    .alias('help', 'h')
    .exitProcess(false)
    .showHelpOnFail(false)
    .parserConfiguration({ 'halt-at-non-option': true })
    .strict(false)

  const parsed = parser.parseSync() as ArgumentsCamelCase<{ file?: string }>
  const file =
    typeof parsed.file === 'string' && parsed.file.trim().length > 0
      ? parsed.file
      : DEFAULT_TEST_FILE
  return { file }
}

const executePromptTests = async (
  suite: PromptTestSuite,
  reporter?: PromptTestRunReporter,
): Promise<TestResult[]> => {
  const service = await createPromptGeneratorService()
  const defaultModel = await resolveDefaultGenerateModel()
  const results: TestResult[] = []

  for (const [index, test] of suite.tests.entries()) {
    const ordinal = index + 1
    reporter?.onTestStart?.(ordinal, test)
    const result = await runSingleTest({ test, service, model: defaultModel })
    results.push(result)
    reporter?.onTestComplete?.(ordinal, result)
  }

  return results
}

const runSingleTest = async ({
  test,
  service,
  model,
}: {
  test: PromptTest
  service: Awaited<ReturnType<typeof createPromptGeneratorService>>
  model: string
}): Promise<TestResult> => {
  try {
    let fileContext = await resolveContextFiles(test.context)

    if (test.smartContext) {
      const smartFiles = await resolveSmartContextFiles(
        test.intent,
        fileContext,
        () => undefined,
        test.smartContextRoot,
      )
      if (smartFiles.length > 0) {
        fileContext = [...fileContext, ...smartFiles]
      }
    }

    const promptRequest: PromptGenerationRequest = {
      intent: test.intent,
      model,
      targetModel: model,
      fileContext,
      images: test.image ?? [],
      videos: test.video ?? [],
    }

    const generatedPrompt = await service.generatePrompt(promptRequest)
    const verdict = await evaluatePrompt(generatedPrompt, test.expect)

    return {
      name: test.name,
      pass: verdict.pass,
      reason: verdict.reason,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown test error.'
    return {
      name: test.name,
      pass: false,
      reason: message,
    }
  }
}

const resolveContextFiles = async (patterns: string[]): Promise<FileContext[]> => {
  if (!patterns || patterns.length === 0) {
    return []
  }

  return await resolveFileContext(patterns)
}

const loadTestSuite = async (filePath: string): Promise<PromptTestSuite> => {
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf8')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown file error.'
    throw new Error(`Failed to read test file ${formatDisplayPath(filePath)}: ${message}`)
  }

  let parsedYaml: unknown
  try {
    parsedYaml = yaml.load(raw) ?? {}
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown YAML error.'
    throw new Error(`Failed to parse YAML in ${formatDisplayPath(filePath)}: ${message}`)
  }

  try {
    return parsePromptTestSuite(parsedYaml)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown schema error.'
    throw new Error(`Test file ${formatDisplayPath(filePath)} is invalid: ${message}`)
  }
}

const createTestProgressReporter = (total: number): TestProgressReporter => {
  if (total <= 0) {
    return {
      startTest: () => undefined,
      completeTest: () => undefined,
      completeAll: () => undefined,
    }
  }

  if (!process.stdout.isTTY) {
    let completed = 0
    return {
      startTest(ordinal, testName) {
        console.log(`Running test ${ordinal}/${total}: ${testName}`)
      },
      completeTest() {
        completed = Math.min(completed + 1, total)
        console.log(`Progress ${completed}/${total}`)
      },
      completeAll() {
        console.log('All tests complete.')
      },
    }
  }

  return createTtyProgressReporter(total)
}

const createTtyProgressReporter = (total: number): TestProgressReporter => {
  let completed = 0
  let currentLabel = ''
  let hasRendered = false

  const render = (): void => {
    if (!hasRendered) {
      process.stdout.write('\n')
      hasRendered = true
    }

    const ratio = total === 0 ? 1 : completed / total
    const filledUnits = Math.min(PROGRESS_BAR_WIDTH, Math.round(ratio * PROGRESS_BAR_WIDTH))
    const emptyUnits = PROGRESS_BAR_WIDTH - filledUnits
    const bar = `${'█'.repeat(filledUnits)}${'░'.repeat(emptyUnits)}`
    const line = `[${bar}] ${completed}/${total} ${currentLabel}`

    readline.clearLine(process.stdout, 0)
    readline.cursorTo(process.stdout, 0)
    process.stdout.write(line)
  }

  return {
    startTest(ordinal, testName) {
      currentLabel = `Running test ${ordinal}/${total}: ${testName}`
      render()
    },
    completeTest() {
      completed = Math.min(completed + 1, total)
      render()
    },
    completeAll() {
      currentLabel = 'All tests complete'
      render()
      process.stdout.write('\n')
    },
  }
}

const formatDisplayPath = (absolutePath: string): string => {
  const relative = path.relative(process.cwd(), absolutePath)
  return relative && !relative.startsWith('..') ? relative : absolutePath
}
