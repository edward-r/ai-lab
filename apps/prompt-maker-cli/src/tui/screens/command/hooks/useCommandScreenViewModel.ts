import { useMemo } from 'react'

import type { DebugKeyEvent } from '../../../components/core/MultilineTextInput'
import type {
  CommandDescriptor,
  HistoryEntry,
  ModelOption,
  PopupState,
  ProviderStatusMap,
} from '../../../types'
import type { TokenUsageBreakdown, TokenUsageRun } from '../../../token-usage-store'

import type { CommandInputProps } from '../components/CommandInput'
import type { CommandMenuPaneProps } from '../components/CommandMenuPane'
import type { HistoryPaneProps } from '../components/HistoryPane'
import type { PopupAreaProps } from '../components/PopupArea'

export type UseCommandScreenViewModelOptions = {
  // Transport
  isAwaitingTransportInput: boolean

  // History pane
  history: HistoryEntry[]
  historyRows: number
  scrollOffset: number

  // Popup area
  popupState: PopupState
  helpOpen: boolean
  overlayHeight: number
  modelPopupOptions: ModelOption[]
  modelPopupSelection: number
  modelPopupRecentCount: number
  providerStatuses: ProviderStatusMap
  onModelPopupQueryChange: (next: string) => void
  onModelPopupSubmit: (option?: ModelOption) => void

  files: string[]
  filePopupSuggestions: string[]
  filePopupSuggestionSelectionIndex: number
  filePopupSuggestionsFocused: boolean
  onFilePopupDraftChange: (next: string) => void
  onAddFile: (value: string) => void

  urls: string[]
  onUrlPopupDraftChange: (next: string) => void
  onAddUrl: (value: string) => void

  historyPopupItems: string[]
  onHistoryPopupDraftChange: (next: string) => void
  onHistoryPopupSubmit: (value: string) => void

  intentPopupSuggestions: string[]
  intentPopupSuggestionSelectionIndex: number
  intentPopupSuggestionsFocused: boolean
  onIntentPopupDraftChange: (next: string) => void
  onIntentFileSubmit: (value: string) => void

  onInstructionsDraftChange: (next: string) => void
  onInstructionsSubmit: (value: string) => void

  isGenerating: boolean
  onSeriesDraftChange: (next: string) => void
  onSeriesSubmit: (value: string) => void

  isTestCommandRunning: boolean
  onTestDraftChange: (next: string) => void
  onTestSubmit: (value: string) => void

  tokenUsageRun: TokenUsageRun | null
  tokenUsageBreakdown: TokenUsageBreakdown | null

  statusChips: string[]

  reasoningPopupLines: HistoryEntry[]
  reasoningPopupVisibleRows: number

  smartContextEnabled: boolean
  smartContextRoot: string | null
  smartPopupSuggestions: string[]
  smartPopupSuggestionSelectionIndex: number
  smartPopupSuggestionsFocused: boolean
  onSmartPopupDraftChange: (next: string) => void
  onSmartRootSubmit: (value: string) => void

  // Command menu
  isCommandMenuActive: boolean
  menuHeight: number
  visibleCommands: readonly CommandDescriptor[]
  commandSelectionIndex: number

  // Input bar
  inputValue: string
  onInputChange: (next: string) => void
  onInputSubmit: (value: string) => void
  isPasteActive: boolean
  hint: string | undefined
  debugLine: string | undefined
  tokenLabel: (token: string) => string | null
  debugKeysEnabled: boolean
  onDebugKeyEvent: (event: DebugKeyEvent) => void

  isPopupOpen: boolean
  isAwaitingRefinement: boolean
}

export type UseCommandScreenViewModelResult = {
  transportMessage: string | null
  historyPaneProps: HistoryPaneProps
  popupAreaProps: PopupAreaProps
  commandMenuPaneProps: CommandMenuPaneProps
  commandInputProps: CommandInputProps
}

export const useCommandScreenViewModel = ({
  isAwaitingTransportInput,
  history,
  historyRows,
  scrollOffset,
  popupState,
  helpOpen,
  overlayHeight,
  modelPopupOptions,
  modelPopupSelection,
  modelPopupRecentCount,
  providerStatuses,
  onModelPopupQueryChange,
  onModelPopupSubmit,
  files,
  filePopupSuggestions,
  filePopupSuggestionSelectionIndex,
  filePopupSuggestionsFocused,
  onFilePopupDraftChange,
  onAddFile,
  urls,
  onUrlPopupDraftChange,
  onAddUrl,
  historyPopupItems,
  onHistoryPopupDraftChange,
  onHistoryPopupSubmit,
  intentPopupSuggestions,
  intentPopupSuggestionSelectionIndex,
  intentPopupSuggestionsFocused,
  onIntentPopupDraftChange,
  onIntentFileSubmit,
  onInstructionsDraftChange,
  onInstructionsSubmit,
  isGenerating,
  onSeriesDraftChange,
  onSeriesSubmit,
  isTestCommandRunning,
  onTestDraftChange,
  onTestSubmit,
  tokenUsageRun,
  tokenUsageBreakdown,
  statusChips,
  reasoningPopupLines,
  reasoningPopupVisibleRows,
  smartContextEnabled,
  smartContextRoot,
  smartPopupSuggestions,
  smartPopupSuggestionSelectionIndex,
  smartPopupSuggestionsFocused,
  onSmartPopupDraftChange,
  onSmartRootSubmit,
  isCommandMenuActive,
  menuHeight,
  visibleCommands,
  commandSelectionIndex,
  inputValue,
  onInputChange,
  onInputSubmit,
  isPasteActive,
  hint,
  debugLine,
  tokenLabel,
  debugKeysEnabled,
  onDebugKeyEvent,
  isPopupOpen,
  isAwaitingRefinement,
}: UseCommandScreenViewModelOptions): UseCommandScreenViewModelResult => {
  const transportMessage = isAwaitingTransportInput
    ? 'Waiting for interactive transport input (send refine/finish).'
    : null

  const historyPaneProps = useMemo<HistoryPaneProps>(
    () => ({ lines: history, visibleRows: historyRows, scrollOffset }),
    [history, historyRows, scrollOffset],
  )

  const popupAreaProps = useMemo<PopupAreaProps>(
    () => ({
      popupState,
      helpOpen,
      overlayHeight,
      modelPopupOptions,
      modelPopupSelection,
      modelPopupRecentCount,
      providerStatuses,
      onModelPopupQueryChange,
      onModelPopupSubmit,
      files,
      filePopupSuggestions,
      filePopupSuggestionSelectionIndex,
      filePopupSuggestionsFocused,
      onFilePopupDraftChange,
      onAddFile,
      urls,
      onUrlPopupDraftChange,
      onAddUrl,
      historyPopupItems,
      onHistoryPopupDraftChange,
      onHistoryPopupSubmit,
      intentPopupSuggestions,
      intentPopupSuggestionSelectionIndex,
      intentPopupSuggestionsFocused,
      onIntentPopupDraftChange,
      onIntentFileSubmit,
      onInstructionsDraftChange,
      onInstructionsSubmit,
      isGenerating,
      onSeriesDraftChange,
      onSeriesSubmit,
      isTestCommandRunning,
      onTestDraftChange,
      onTestSubmit,
      tokenUsageRun,
      tokenUsageBreakdown,
      statusChips,
      reasoningPopupLines,
      reasoningPopupVisibleRows,
      smartContextEnabled,
      smartContextRoot,
      smartPopupSuggestions,
      smartPopupSuggestionSelectionIndex,
      smartPopupSuggestionsFocused,
      onSmartPopupDraftChange,
      onSmartRootSubmit,
    }),
    [
      filePopupSuggestionSelectionIndex,
      filePopupSuggestions,
      filePopupSuggestionsFocused,
      files,
      helpOpen,
      historyPopupItems,
      intentPopupSuggestionSelectionIndex,
      intentPopupSuggestions,
      intentPopupSuggestionsFocused,
      isGenerating,
      isTestCommandRunning,
      modelPopupOptions,
      modelPopupRecentCount,
      modelPopupSelection,
      onAddFile,
      onAddUrl,
      onFilePopupDraftChange,
      onHistoryPopupDraftChange,
      onHistoryPopupSubmit,
      onInstructionsDraftChange,
      onInstructionsSubmit,
      onIntentFileSubmit,
      onIntentPopupDraftChange,
      onModelPopupQueryChange,
      onModelPopupSubmit,
      onSeriesDraftChange,
      onSeriesSubmit,
      onSmartPopupDraftChange,
      onSmartRootSubmit,
      onTestDraftChange,
      onTestSubmit,
      onUrlPopupDraftChange,
      overlayHeight,
      popupState,
      providerStatuses,
      reasoningPopupLines,
      reasoningPopupVisibleRows,
      smartContextEnabled,
      smartContextRoot,
      smartPopupSuggestionSelectionIndex,
      smartPopupSuggestions,
      smartPopupSuggestionsFocused,
      statusChips,
      tokenUsageBreakdown,
      tokenUsageRun,
      urls,
    ],
  )

  const commandMenuPaneProps = useMemo<CommandMenuPaneProps>(
    () => ({
      isActive: isCommandMenuActive,
      height: menuHeight,
      commands: visibleCommands,
      selectedIndex: commandSelectionIndex,
    }),
    [commandSelectionIndex, isCommandMenuActive, menuHeight, visibleCommands],
  )

  const commandInputProps = useMemo<CommandInputProps>(
    () => ({
      value: inputValue,
      onChange: onInputChange,
      onSubmit: onInputSubmit,
      mode: isAwaitingRefinement ? 'refinement' : 'intent',
      isDisabled: isPopupOpen || helpOpen,
      isPasteActive,
      statusChips,
      hint,
      debugLine,
      tokenLabel,
      onDebugKeyEvent: debugKeysEnabled ? onDebugKeyEvent : undefined,
      placeholder: isAwaitingRefinement
        ? 'Describe refinement (or empty to finish)...'
        : 'Describe your goal or type /command',
    }),
    [
      debugKeysEnabled,
      debugLine,
      helpOpen,
      hint,
      inputValue,
      isAwaitingRefinement,
      isPasteActive,
      isPopupOpen,
      onDebugKeyEvent,
      onInputChange,
      onInputSubmit,
      statusChips,
      tokenLabel,
    ],
  )

  return {
    transportMessage,
    historyPaneProps,
    popupAreaProps,
    commandMenuPaneProps,
    commandInputProps,
  }
}
