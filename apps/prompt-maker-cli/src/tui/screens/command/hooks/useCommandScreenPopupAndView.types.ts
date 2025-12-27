import type { WriteStream } from 'node:tty'

import type { MutableRefObject } from 'react'

import type { NotifyOptions } from '../../../notifier'
import type { HistoryEntry, ModelOption, ProviderStatusMap } from '../../../types'

export type PushHistory = (content: string, kind?: HistoryEntry['kind']) => void

export type CommandContextOptions = {
  interactiveTransportPath?: string | undefined

  notify: (message: string, options?: NotifyOptions) => void
  stdout: WriteStream | undefined

  // context state
  files: string[]
  urls: string[]
  images: string[]
  videos: string[]
  smartContextEnabled: boolean
  smartContextRoot: string | null
  metaInstructions: string
  lastReasoning: string | null
  lastGeneratedPrompt: string | null

  // context dispatch
  addFile: (value: string) => void
  removeFile: (index: number) => void
  addUrl: (value: string) => void
  removeUrl: (index: number) => void
  addImage: (value: string) => void
  removeImage: (index: number) => void
  addVideo: (value: string) => void
  removeVideo: (index: number) => void
  toggleSmartContext: () => void
  setSmartRoot: (value: string) => void
  setMetaInstructions: (value: string) => void
  resetContext: () => void
}

export type CommandInputOptions = {
  // screen state
  terminalRows: number
  terminalColumns: number
  inputValue: string
  isPasteActive: boolean
  commandSelectionIndex: number
  debugKeyLine: string | null
  debugKeysEnabled: boolean

  setTerminalSize: (rows: number, columns: number) => void
  setInputValue: (value: string | ((prev: string) => string)) => void
  setPasteActive: (active: boolean) => void
  setCommandSelectionIndex: (next: number | ((prev: number) => number)) => void

  // input local
  intentFilePath: string
  setIntentFilePath: (value: string) => void
  polishEnabled: boolean
  setPolishEnabled: (value: boolean) => void
  copyEnabled: boolean
  setCopyEnabled: (value: boolean) => void
  chatGptEnabled: boolean
  setChatGptEnabled: (value: boolean) => void
  jsonOutputEnabled: boolean
  setJsonOutputEnabled: (value: boolean) => void

  // refs
  lastUserIntentRef: MutableRefObject<string | null>
  lastTypedIntentRef: MutableRefObject<string>

  // suppression
  consumeSuppressedTextInputChange: () => boolean
  suppressNextInput: () => void
  updateLastTypedIntent: (next: string) => void

  onDebugKeyEvent: (
    event: import('../../../components/core/MultilineTextInput').DebugKeyEvent,
  ) => void
}

export type CommandPopupOptions = {
  onPopupVisibilityChange?: ((isOpen: boolean) => void) | undefined
  commandMenuSignal?: number | undefined
  helpOpen: boolean
  reservedRows: number
}

export type CommandHistoryOptions = {
  // history/test plumbing
  pushHistoryRef: MutableRefObject<PushHistory>
  pushHistoryProxy: PushHistory
  clearHistoryRef: MutableRefObject<() => void>
  scrollToRef: MutableRefObject<(row: number) => void>
  scrollToProxy: (row: number) => void
  closeTestPopupRef: MutableRefObject<() => void>

  commandHistoryValues: string[]
  addCommandHistoryEntry: (value: string) => void

  isTestCommandRunning: boolean
  lastTestFile: string | null
  runTestsFromCommandProxy: (value: string) => void
  onTestPopupSubmit: (value: string) => void
}

export type CommandGenerationOptions = {
  // model/generation
  currentModel: ModelOption['id']
  currentTargetModel: ModelOption['id']
  modelOptions: ModelOption[]
  providerStatuses: ProviderStatusMap
  selectModel: (nextId: ModelOption['id']) => void
  selectTargetModel: (nextId: ModelOption['id']) => void
  isGenerating: boolean
  runGeneration: (payload: { intent?: string; intentFile?: string }) => Promise<void>
  runSeriesGeneration: (intent: string) => void
  statusChips: string[]
  isAwaitingRefinement: boolean
  submitRefinement: (value: string) => void
  awaitingInteractiveMode:
    | import('../../../generation-pipeline-reducer').InteractiveAwaitingMode
    | null
  tokenUsageRun: import('../../../token-usage-store').TokenUsageRun | null
  tokenUsageBreakdown: import('../../../token-usage-store').TokenUsageBreakdown | null
}

export type UseCommandScreenPopupAndViewOptions = {
  context: CommandContextOptions
  input: CommandInputOptions
  popup: CommandPopupOptions
  history: CommandHistoryOptions
  generation: CommandGenerationOptions
}

export type UseCommandScreenPopupAndViewResult = {
  transportMessage: string | null
  historyPaneProps: Parameters<
    typeof import('./useCommandScreenViewModel').useCommandScreenViewModel
  >[0]['panes']['history']
  popupAreaProps: ReturnType<
    typeof import('./useCommandScreenViewModel').useCommandScreenViewModel
  >['popupAreaProps']
  commandMenuPaneProps: Parameters<
    typeof import('./useCommandScreenViewModel').useCommandScreenViewModel
  >[0]['panes']['menu']
  commandInputProps: ReturnType<
    typeof import('./useCommandScreenViewModel').useCommandScreenViewModel
  >['commandInputProps']
}
