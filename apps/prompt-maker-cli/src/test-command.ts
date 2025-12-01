import fs from 'node:fs/promises'
import path from 'node:path'

import yaml from 'js-yaml'
import yargs from 'yargs'
import type { ArgumentsCamelCase } from 'yargs'

import { resolveFileContext, type FileContext } from './file-context'
import {
  createPromptGeneratorService,
  resolveDefaultGenerateModel,
  type PromptGenerationRequest,
} from './prompt-generator-service'
import { parsePromptTestSuite, type PromptTestSuite, type PromptTest } from './testing/test-schema'
import { evaluatePrompt } from './testing/evaluator'

const DEFAULT_TEST_FILE = 'prompt-tests.yaml'

type TestArgs = {
  file: string
}

type TestResult = {
  name: string
  pass: boolean
  reason: string
}

export const runTestCommand = async (argv: string[]): Promise<void> => {
  const { file } = parseTestArgs(argv)
  const filePath = path.resolve(process.cwd(), file)

  const suite = await loadTestSuite(filePath)
  console.log(`Loaded ${suite.tests.length} test(s) from ${formatDisplayPath(filePath)}.`)

  const results = await executePromptTests(suite)

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

const executePromptTests = async (suite: PromptTestSuite): Promise<TestResult[]> => {
  const service = await createPromptGeneratorService()
  const defaultModel = await resolveDefaultGenerateModel()
  const results: TestResult[] = []

  for (const test of suite.tests) {
    const result = await runSingleTest({ test, service, model: defaultModel })
    results.push(result)
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
    const contextFiles = await resolveContextFiles(test.context)

    const promptRequest: PromptGenerationRequest = {
      intent: test.intent,
      model,
      fileContext: contextFiles,
      images: [],
      videos: [],
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

const formatDisplayPath = (absolutePath: string): string => {
  const relative = path.relative(process.cwd(), absolutePath)
  return relative && !relative.startsWith('..') ? relative : absolutePath
}
