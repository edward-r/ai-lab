import fs from 'node:fs/promises'
import path from 'node:path'

import yaml from 'js-yaml'
import yargs from 'yargs'
import type { ArgumentsCamelCase } from 'yargs'

import { parsePromptTestSuite, type PromptTestSuite } from './testing/test-schema'

const DEFAULT_TEST_FILE = 'prompt-tests.yaml'

type TestArgs = {
  file: string
}

export const runTestCommand = async (argv: string[]): Promise<void> => {
  const { file } = parseTestArgs(argv)
  const filePath = path.resolve(process.cwd(), file)

  const suite = await loadTestSuite(filePath)

  console.log(`Loaded ${suite.tests.length} test(s) from ${formatDisplayPath(filePath)}.`)
  console.log('Test execution not yet implemented; iterating over test cases:')

  for (const test of suite.tests) {
    console.log(`- ${test.name} (${test.context.length} context file(s))`)
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
