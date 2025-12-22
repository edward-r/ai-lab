import fs from 'node:fs'

import { useCallback } from 'react'

import type { HistoryEntry, ModelOption, PopupState } from '../../../types'

import { useContextPopupGlue } from './useContextPopupGlue'
import { useHistoryPopupGlue } from './useHistoryPopupGlue'
import { useIntentPopupGlue } from './useIntentPopupGlue'
import { useIntentSubmitHandler } from './useIntentSubmitHandler'
import { useMiscPopupDraftHandlers } from './useMiscPopupDraftHandlers'
import { useModelPopupData } from './useModelPopupData'
import { usePasteManager } from './usePasteManager'
import { usePopupKeyboardShortcuts } from './usePopupKeyboardShortcuts'
import { useReasoningPopup } from './useReasoningPopup'

export type UseCommandScreenPopupBindingsOptions = {
  inputValue: string
  setInputValue: (value: string | ((prev: string) => string)) => void
  setPasteActive: (active: boolean) => void

  popupState: PopupState
  setPopupState: import('react').Dispatch<import('react').SetStateAction<PopupState>>
  isPopupOpen: boolean
  helpOpen: boolean

  // suppression
  consumeSuppressedTextInputChange: () => boolean
  suppressNextInput: () => void
  updateLastTypedIntent: (next: string) => void

  // popup actions
  closePopup: () => void
  handleCommandSelection: (
    commandId: import('../../../types').CommandDescriptor['id'],
    argsRaw?: string,
  ) => void
  handleModelPopupSubmit: (option?: ModelOption) => void
  applyToggleSelection: (field: 'polish' | 'copy' | 'chatgpt' | 'json', value: boolean) => void
  handleIntentFileSubmit: (value: string) => void
  handleSeriesIntentSubmit: (value: string) => void

  // command menu
  isCommandMenuActive: boolean
  selectedCommandId: import('../../../types').CommandDescriptor['id'] | null
  commandMenuArgsRaw: string
  isCommandMode: boolean

  // generation
  isGenerating: boolean
  isAwaitingRefinement: boolean
  submitRefinement: (value: string) => void
  runGeneration: (payload: { intent?: string; intentFile?: string }) => Promise<void>

  // /new /reuse
  handleNewCommand: (argsRaw: string) => void
  handleReuseCommand: () => void

  // intent
  intentFilePath: string
  lastUserIntentRef: import('react').MutableRefObject<string | null>

  // history
  pushHistory: (content: string, kind?: HistoryEntry['kind']) => void
  addCommandHistoryEntry: (value: string) => void
  commandHistoryValues: string[]

  // context
  droppedFilePath: string | null
  files: string[]
  urls: string[]
  smartContextEnabled: boolean
  smartContextRoot: string | null
  addFile: (value: string) => void
  removeFile: (index: number) => void
  addUrl: (value: string) => void
  removeUrl: (index: number) => void
  toggleSmartContext: () => void
  setSmartRoot: (value: string) => void
  notify: (message: string) => void

  // model popup
  modelOptions: ModelOption[]

  // reasoning popup
  lastReasoning: string | null
  terminalColumns: number
  reasoningPopupHeight: number
}

export type UseCommandScreenPopupBindingsResult = {
  // input
  tokenLabel: (token: string) => string | null
  handleInputChange: (next: string) => void
  handleSubmit: (value: string) => void

  // popup data
  modelPopupOptions: ModelOption[]
  modelPopupRecentCount: number
  modelPopupSelection: number

  historyPopupItems: string[]

  intentPopupSuggestions: string[]
  intentPopupSuggestionSelectionIndex: number
  intentPopupSuggestionsFocused: boolean
  onIntentPopupDraftChange: (next: string) => void

  filePopupSuggestions: string[]
  filePopupSuggestionSelectionIndex: number
  filePopupSuggestionsFocused: boolean
  onFilePopupDraftChange: (next: string) => void
  onAddFile: (value: string) => void
  onRemoveFile: (index: number) => void

  onUrlPopupDraftChange: (next: string) => void
  onAddUrl: (value: string) => void
  onRemoveUrl: (index: number) => void

  smartPopupSuggestions: string[]
  smartPopupSuggestionSelectionIndex: number
  smartPopupSuggestionsFocused: boolean
  onSmartPopupDraftChange: (next: string) => void
  onSmartRootSubmit: (value: string) => void
  onSmartToggle: (nextEnabled: boolean) => void

  onHistoryPopupDraftChange: (next: string) => void
  onHistoryPopupSubmit: (value: string) => void

  onModelPopupQueryChange: (next: string) => void
  onSeriesDraftChange: (next: string) => void
  onInstructionsDraftChange: (next: string) => void
  onTestDraftChange: (next: string) => void

  onSeriesSubmit: (value: string) => void

  reasoningPopupLines: HistoryEntry[]
  reasoningPopupVisibleRows: number
}

export const useCommandScreenPopupBindings = ({
  inputValue,
  setInputValue,
  setPasteActive,
  popupState,
  setPopupState,
  isPopupOpen,
  helpOpen,
  consumeSuppressedTextInputChange,
  suppressNextInput,
  updateLastTypedIntent,
  closePopup,
  handleCommandSelection,
  handleModelPopupSubmit,
  applyToggleSelection,
  handleIntentFileSubmit,
  handleSeriesIntentSubmit,
  isCommandMenuActive,
  selectedCommandId,
  commandMenuArgsRaw,
  isCommandMode,
  isGenerating,
  isAwaitingRefinement,
  submitRefinement,
  runGeneration,
  handleNewCommand,
  handleReuseCommand,
  intentFilePath,
  lastUserIntentRef,
  pushHistory,
  addCommandHistoryEntry,
  commandHistoryValues,
  droppedFilePath,
  files,
  urls,
  smartContextEnabled,
  smartContextRoot,
  addFile,
  removeFile,
  addUrl,
  removeUrl,
  toggleSmartContext,
  setSmartRoot,
  notify,
  modelOptions,
  lastReasoning,
  terminalColumns,
  reasoningPopupHeight,
}: UseCommandScreenPopupBindingsOptions): UseCommandScreenPopupBindingsResult => {
  const { tokenLabel, handleInputChange, expandInputForSubmit } = usePasteManager({
    inputValue,
    popupState,
    helpOpen,
    setInputValue,
    setPasteActive,
    consumeSuppressedTextInputChange,
    suppressNextInput,
    updateLastTypedIntent,
  })

  const contextGlue = useContextPopupGlue({
    inputValue,
    popupState,
    helpOpen,
    isPopupOpen,
    isCommandMode,
    isCommandMenuActive,
    isGenerating,
    droppedFilePath,
    files,
    urls,
    smartContextEnabled,
    smartContextRoot,
    addFile,
    removeFile,
    addUrl,
    removeUrl,
    toggleSmartContext,
    setSmartRoot,
    setInputValue,
    setPopupState,
    suppressNextInput,
    notify,
    pushHistory,
    addCommandHistoryEntry,
    handleCommandSelection,
    consumeSuppressedTextInputChange,
    isFilePath: (candidate: string) => {
      try {
        const stats = fs.statSync(candidate)
        return stats.isFile()
      } catch {
        return false
      }
    },
  })

  const historyGlue = useHistoryPopupGlue({
    popupState,
    setPopupState,
    closePopup,
    setInputValue,
    consumeSuppressedTextInputChange,
    suppressNextInput,
    commandHistoryValues,
  })

  const intentGlue = useIntentPopupGlue({ popupState, setPopupState })

  const { modelPopupOptions, modelPopupRecentCount, modelPopupSelection } = useModelPopupData({
    popupState,
    modelOptions,
  })

  const { reasoningPopupVisibleRows, reasoningPopupLines } = useReasoningPopup({
    lastReasoning,
    terminalColumns,
    popupHeight: reasoningPopupHeight,
  })

  usePopupKeyboardShortcuts({
    popupState,
    helpOpen,
    setPopupState,
    closePopup,
    modelPopupOptions,
    onModelPopupSubmit: handleModelPopupSubmit,
    applyToggleSelection,
    files,
    filePopupSuggestions: contextGlue.filePopupSuggestions,
    onRemoveFile: contextGlue.onRemoveFile,
    urls,
    onRemoveUrl: contextGlue.onRemoveUrl,
    historyPopupItems: historyGlue.historyPopupItems,
    smartPopupSuggestions: contextGlue.smartPopupSuggestions,
    smartContextEnabled,
    smartContextRoot,
    onSmartToggle: contextGlue.onSmartToggle,
    onSmartRootSubmit: contextGlue.onSmartRootSubmit,
    intentPopupSuggestions: intentGlue.intentPopupSuggestions,
    onIntentFileSubmit: handleIntentFileSubmit,
    reasoningPopupLines,
    reasoningPopupVisibleRows,
  })

  const handleSubmit = useIntentSubmitHandler({
    popupState,
    isAwaitingRefinement,
    submitRefinement,
    isCommandMenuActive,
    selectedCommandId,
    commandMenuArgsRaw,
    isCommandMode,
    intentFilePath,
    isGenerating,
    expandInputForSubmit,
    setInputValue,
    pushHistory,
    addCommandHistoryEntry,
    runGeneration,
    handleCommandSelection,
    handleNewCommand,
    handleReuseCommand,
    lastUserIntentRef,
  })

  const onSeriesSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      if (trimmed) {
        addCommandHistoryEntry(`/series ${trimmed}`)
      }
      handleSeriesIntentSubmit(value)
    },
    [addCommandHistoryEntry, handleSeriesIntentSubmit],
  )

  const miscDraftHandlers = useMiscPopupDraftHandlers({
    setPopupState,
    consumeSuppressedTextInputChange,
  })

  return {
    tokenLabel,
    handleInputChange,
    handleSubmit,
    modelPopupOptions,
    modelPopupRecentCount,
    modelPopupSelection,
    historyPopupItems: historyGlue.historyPopupItems,
    intentPopupSuggestions: intentGlue.intentPopupSuggestions,
    intentPopupSuggestionSelectionIndex: intentGlue.intentPopupSuggestionSelectionIndex,
    intentPopupSuggestionsFocused: intentGlue.intentPopupSuggestionsFocused,
    onIntentPopupDraftChange: intentGlue.onIntentPopupDraftChange,
    filePopupSuggestions: contextGlue.filePopupSuggestions,
    filePopupSuggestionSelectionIndex: contextGlue.filePopupSuggestionSelectionIndex,
    filePopupSuggestionsFocused: contextGlue.filePopupSuggestionsFocused,
    onFilePopupDraftChange: contextGlue.onFilePopupDraftChange,
    onAddFile: contextGlue.onAddFile,
    onRemoveFile: contextGlue.onRemoveFile,
    onUrlPopupDraftChange: contextGlue.onUrlPopupDraftChange,
    onAddUrl: contextGlue.onAddUrl,
    onRemoveUrl: contextGlue.onRemoveUrl,
    smartPopupSuggestions: contextGlue.smartPopupSuggestions,
    smartPopupSuggestionSelectionIndex: contextGlue.smartPopupSuggestionSelectionIndex,
    smartPopupSuggestionsFocused: contextGlue.smartPopupSuggestionsFocused,
    onSmartPopupDraftChange: contextGlue.onSmartPopupDraftChange,
    onSmartRootSubmit: contextGlue.onSmartRootSubmit,
    onSmartToggle: contextGlue.onSmartToggle,
    onHistoryPopupDraftChange: historyGlue.onHistoryPopupDraftChange,
    onHistoryPopupSubmit: historyGlue.onHistoryPopupSubmit,
    onModelPopupQueryChange: miscDraftHandlers.onModelPopupQueryChange,
    onSeriesDraftChange: miscDraftHandlers.onSeriesDraftChange,
    onInstructionsDraftChange: miscDraftHandlers.onInstructionsDraftChange,
    onTestDraftChange: miscDraftHandlers.onTestDraftChange,
    onSeriesSubmit,
    reasoningPopupLines,
    reasoningPopupVisibleRows,
  }
}
