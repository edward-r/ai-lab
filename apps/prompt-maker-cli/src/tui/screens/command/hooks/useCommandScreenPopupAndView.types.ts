import type { NotifyOptions } from '../../../notifier'
import type { HistoryEntry, ModelOption, ProviderStatusMap } from '../../../types'

export type PushHistory = (content: string, kind?: HistoryEntry['kind']) => void

export type UseCommandScreenPopupAndViewOptions = {
  interactiveTransportPath?: string | undefined
  onPopupVisibilityChange?: ((isOpen: boolean) => void) | undefined
  commandMenuSignal?: number | undefined
  helpOpen: boolean
  reservedRows: number
  notify: (message: string, options?: NotifyOptions) => void

  stdout: import('node:tty').WriteStream | undefined

  // context state
  files: string[]
  urls: string[]
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
  toggleSmartContext: () => void
  setSmartRoot: (value: string) => void
  setMetaInstructions: (value: string) => void
  resetContext: () => void

  // model/generation
  currentModel: ModelOption['id']
  modelOptions: ModelOption[]
  providerStatuses: ProviderStatusMap
  selectModel: (nextId: ModelOption['id']) => void
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
  lastUserIntentRef: import('react').MutableRefObject<string | null>
  lastTypedIntentRef: import('react').MutableRefObject<string>

  // suppression
  consumeSuppressedTextInputChange: () => boolean
  suppressNextInput: () => void
  updateLastTypedIntent: (next: string) => void

  // history/test plumbing
  pushHistoryRef: import('react').MutableRefObject<PushHistory>
  pushHistoryProxy: PushHistory
  clearHistoryRef: import('react').MutableRefObject<() => void>
  scrollToRef: import('react').MutableRefObject<(row: number) => void>
  scrollToProxy: (row: number) => void
  closeTestPopupRef: import('react').MutableRefObject<() => void>

  commandHistoryValues: string[]
  addCommandHistoryEntry: (value: string) => void

  isTestCommandRunning: boolean
  lastTestFile: string | null
  runTestsFromCommandProxy: (value: string) => void
  onTestPopupSubmit: (value: string) => void

  onDebugKeyEvent: (
    event: import('../../../components/core/MultilineTextInput').DebugKeyEvent,
  ) => void
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
