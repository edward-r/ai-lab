import { runGenerateCommand } from './generate-command'
import { runTestCommand } from './test-command'

import type { FileContext } from './file-context'
import type { GenerateJsonPayload, StreamEventInput, StreamMode } from './generate-command'
import type { PromptTestSuite } from './testing/test-schema'

export type GenerateIntentSource =
  | { kind: 'inline'; value: string }
  | { kind: 'file'; path: string }
  | { kind: 'stdin' }

export type GenerateContextRequest = {
  files?: string[]
  urls?: string[]
  showResolved?: boolean
  format?: 'text' | 'json'
  outputFile?: { path: string; format: 'text' | 'json' }
  template?: string
  smartContext?: { enabled: boolean; root?: string }
}

export type GenerateMediaRequest = {
  images?: string[]
  videos?: string[]
}

export type GenerateInteractiveOptions = {
  enabled: boolean
  transportPath?: string
  mode?: 'tty' | 'transport'
}

export type GeneratePolishOptions = {
  enabled: boolean
  model?: string
}

export type GenerateOutputOptions = {
  copyToClipboard?: boolean
  openChatGpt?: boolean
  json?: boolean
  quiet?: boolean
  progress?: boolean
  streamMode?: StreamMode
}

export type GenerateCoreOptions = {
  intent: GenerateIntentSource
  model?: string
  context?: GenerateContextRequest
  media?: GenerateMediaRequest
  interactive?: GenerateInteractiveOptions
  polish?: GeneratePolishOptions
  output?: GenerateOutputOptions
  history?: boolean
  telemetry?: boolean
  inlineIntentAfterInteractive?: boolean
  resolvedContext?: FileContext[]
  legacyArgs?: string[]
}

export type GenerateCoreResult = {
  payload?: GenerateJsonPayload
  finalPrompt?: string
  renderedPrompt?: string
  iterations?: number
  delegated?: boolean
}

export type GenerateCoreEvent = StreamEventInput

export const runGenerateCore = async (
  options: GenerateCoreOptions,
  _onEvent?: (event: GenerateCoreEvent) => void,
): Promise<GenerateCoreResult> => {
  if (options.legacyArgs) {
    await runGenerateCommand(options.legacyArgs)
    return { delegated: true }
  }

  throw new Error(
    'runGenerateCore currently requires options.legacyArgs for delegation until the headless core is implemented.',
  )
}

export type TestSuiteSource =
  | { kind: 'file'; path: string }
  | { kind: 'inline'; suite: PromptTestSuite }

export type TestCoreOptions = {
  suite: TestSuiteSource
  workingDirectory?: string
  legacyArgs?: string[]
}

export type TestCaseResult = {
  name: string
  pass: boolean
  reason: string
}

export type TestCoreResult = {
  total: number
  passed: number
  failed: number
  results: TestCaseResult[]
  delegated?: boolean
}

export type TestCoreEvent =
  | { type: 'test:start'; index: number; total: number; name: string }
  | {
      type: 'test:complete'
      index: number
      total: number
      name: string
      pass: boolean
      reason: string
    }
  | { type: 'test:summary'; passed: number; failed: number }

export const runTestCore = async (
  options: TestCoreOptions,
  _onEvent?: (event: TestCoreEvent) => void,
): Promise<TestCoreResult> => {
  if (options.legacyArgs) {
    await runTestCommand(options.legacyArgs)
    return { total: 0, passed: 0, failed: 0, results: [], delegated: true }
  }

  throw new Error(
    'runTestCore currently requires options.legacyArgs for delegation until the headless core is implemented.',
  )
}
