import type { HistoryEntry, ModelOption, PopupState } from '../../../types'

import { useMiscPopupDraftHandlers } from './useMiscPopupDraftHandlers'
import { useModelPopupData } from './useModelPopupData'
import { usePopupKeyboardShortcuts } from './usePopupKeyboardShortcuts'
import { useReasoningPopup } from './useReasoningPopup'
import { useThemePopupGlue } from './useThemePopupGlue'
import { useThemeModePopupGlue } from './useThemeModePopupGlue'

import {
  useCommandScreenPasteBindings,
  type UseCommandScreenPasteBindingsOptions,
} from './useCommandScreenPasteBindings'
import {
  useCommandScreenContextPopupBindings,
  type UseCommandScreenContextPopupBindingsOptions,
} from './useCommandScreenContextPopupBindings'
import {
  useCommandScreenHistoryIntentPopupBindings,
  type UseCommandScreenHistoryIntentPopupBindingsOptions,
} from './useCommandScreenHistoryIntentPopupBindings'
import {
  useCommandScreenSubmitBindings,
  type UseCommandScreenSubmitBindingsOptions,
} from './useCommandScreenSubmitBindings'

export type UseCommandScreenPopupBindingsOptions = {
  inputValue: string
  setInputValue: (value: string | ((prev: string) => string)) => void
  setPasteActive: (active: boolean) => void

  popupState: PopupState
  setPopupState: import('react').Dispatch<import('react').SetStateAction<PopupState>>
  isPopupOpen: boolean
  helpOpen: boolean

  consumeSuppressedTextInputChange: () => boolean
  suppressNextInput: () => void
  updateLastTypedIntent: (next: string) => void

  closePopup: () => void
  handleCommandSelection: (
    commandId: import('../../../types').CommandDescriptor['id'],
    argsRaw?: string,
  ) => void
  handleModelPopupSubmit: (option?: ModelOption) => void
  applyToggleSelection: (field: 'polish' | 'copy' | 'chatgpt' | 'json', value: boolean) => void
  handleIntentFileSubmit: (value: string) => void
  handleSeriesIntentSubmit: (value: string) => void

  isCommandMenuActive: boolean
  selectedCommandId: import('../../../types').CommandDescriptor['id'] | null
  commandMenuArgsRaw: string
  isCommandMode: boolean

  isGenerating: boolean
  isAwaitingRefinement: boolean
  submitRefinement: (value: string) => void
  runGeneration: (payload: { intent?: string; intentFile?: string }) => Promise<void>

  handleNewCommand: (argsRaw: string) => void
  handleReuseCommand: () => void

  intentFilePath: string
  lastUserIntentRef: import('react').MutableRefObject<string | null>

  pushHistory: (content: string, kind?: HistoryEntry['kind']) => void
  addCommandHistoryEntry: (value: string) => void
  commandHistoryValues: string[]

  droppedFilePath: string | null
  files: string[]
  urls: string[]
  images: string[]
  videos: string[]
  smartContextEnabled: boolean
  smartContextRoot: string | null
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
  notify: (message: string) => void

  modelOptions: ModelOption[]

  lastReasoning: string | null
  terminalColumns: number
  reasoningPopupHeight: number
}

export type UseCommandScreenPopupBindingsResult = {
  tokenLabel: (token: string) => string | null
  handleInputChange: (next: string) => void
  handleSubmit: (value: string) => void

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

  imagePopupSuggestions: string[]
  imagePopupSuggestionSelectionIndex: number
  imagePopupSuggestionsFocused: boolean
  onImagePopupDraftChange: (next: string) => void
  onAddImage: (value: string) => void
  onRemoveImage: (index: number) => void

  videoPopupSuggestions: string[]
  videoPopupSuggestionSelectionIndex: number
  videoPopupSuggestionsFocused: boolean
  onVideoPopupDraftChange: (next: string) => void
  onAddVideo: (value: string) => void
  onRemoveVideo: (index: number) => void

  smartPopupSuggestions: string[]
  smartPopupSuggestionSelectionIndex: number
  smartPopupSuggestionsFocused: boolean
  onSmartPopupDraftChange: (next: string) => void
  onSmartRootSubmit: (value: string) => void

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

export const useCommandScreenPopupBindings = (
  options: UseCommandScreenPopupBindingsOptions,
): UseCommandScreenPopupBindingsResult => {
  const paste = useCommandScreenPasteBindings({
    inputValue: options.inputValue,
    popupState: options.popupState,
    helpOpen: options.helpOpen,
    setInputValue: options.setInputValue,
    setPasteActive: options.setPasteActive,
    consumeSuppressedTextInputChange: options.consumeSuppressedTextInputChange,
    suppressNextInput: options.suppressNextInput,
    updateLastTypedIntent: options.updateLastTypedIntent,
  } satisfies UseCommandScreenPasteBindingsOptions)

  const context = useCommandScreenContextPopupBindings({
    inputValue: options.inputValue,
    popupState: options.popupState,
    helpOpen: options.helpOpen,
    isPopupOpen: options.isPopupOpen,
    isCommandMode: options.isCommandMode,
    isCommandMenuActive: options.isCommandMenuActive,
    isGenerating: options.isGenerating,
    droppedFilePath: options.droppedFilePath,
    files: options.files,
    urls: options.urls,
    images: options.images,
    videos: options.videos,
    smartContextEnabled: options.smartContextEnabled,
    smartContextRoot: options.smartContextRoot,
    addFile: options.addFile,
    removeFile: options.removeFile,
    addUrl: options.addUrl,
    removeUrl: options.removeUrl,
    addImage: options.addImage,
    removeImage: options.removeImage,
    addVideo: options.addVideo,
    removeVideo: options.removeVideo,
    toggleSmartContext: options.toggleSmartContext,
    setSmartRoot: options.setSmartRoot,
    setInputValue: options.setInputValue,
    setPopupState: options.setPopupState,
    suppressNextInput: options.suppressNextInput,
    notify: options.notify,
    pushHistory: (content, kind = 'system') => options.pushHistory(content, kind),
    addCommandHistoryEntry: options.addCommandHistoryEntry,
    handleCommandSelection: options.handleCommandSelection,
    consumeSuppressedTextInputChange: options.consumeSuppressedTextInputChange,
  } satisfies UseCommandScreenContextPopupBindingsOptions)

  const historyAndIntent = useCommandScreenHistoryIntentPopupBindings({
    popupState: options.popupState,
    setPopupState: options.setPopupState,
    closePopup: options.closePopup,
    setInputValue: options.setInputValue,
    consumeSuppressedTextInputChange: options.consumeSuppressedTextInputChange,
    suppressNextInput: options.suppressNextInput,
    commandHistoryValues: options.commandHistoryValues,
  } satisfies UseCommandScreenHistoryIntentPopupBindingsOptions)

  const { modelPopupOptions, modelPopupRecentCount, modelPopupSelection } = useModelPopupData({
    popupState: options.popupState,
    modelOptions: options.modelOptions,
  })

  const { reasoningPopupVisibleRows, reasoningPopupLines } = useReasoningPopup({
    lastReasoning: options.lastReasoning,
    terminalColumns: options.terminalColumns,
    popupHeight: options.reasoningPopupHeight,
  })

  const themePopup = useThemePopupGlue({
    popupState: options.popupState,
    setPopupState: options.setPopupState,
    closePopup: options.closePopup,
  })

  const themeModePopup = useThemeModePopupGlue({
    popupState: options.popupState,
    setPopupState: options.setPopupState,
    closePopup: options.closePopup,
  })

  usePopupKeyboardShortcuts({
    popupState: options.popupState,
    helpOpen: options.helpOpen,
    setPopupState: options.setPopupState,
    closePopup: options.closePopup,
    modelPopupOptions,
    onModelPopupSubmit: options.handleModelPopupSubmit,
    applyToggleSelection: options.applyToggleSelection,
    themeCount: themePopup.themeCount,
    onThemeConfirm: themePopup.onThemeConfirm,
    onThemeCancel: themePopup.onThemeCancel,
    themeModeCount: themeModePopup.optionCount,
    onThemeModeConfirm: themeModePopup.onConfirm,
    onThemeModeCancel: themeModePopup.onCancel,
    files: options.files,
    filePopupSuggestions: context.filePopupSuggestions,
    onRemoveFile: context.onRemoveFile,
    urls: options.urls,
    onRemoveUrl: context.onRemoveUrl,
    images: options.images,
    imagePopupSuggestions: context.imagePopupSuggestions,
    onRemoveImage: context.onRemoveImage,
    videos: options.videos,
    videoPopupSuggestions: context.videoPopupSuggestions,
    onRemoveVideo: context.onRemoveVideo,
    historyPopupItems: historyAndIntent.history.historyPopupItems,
    smartPopupSuggestions: context.smartPopupSuggestions,
    smartContextRoot: options.smartContextRoot,
    onSmartRootSubmit: context.onSmartRootSubmit,
    intentPopupSuggestions: historyAndIntent.intent.intentPopupSuggestions,
    onIntentFileSubmit: options.handleIntentFileSubmit,
    reasoningPopupLines,
    reasoningPopupVisibleRows,
  })

  const submit = useCommandScreenSubmitBindings({
    popupState: options.popupState,
    isAwaitingRefinement: options.isAwaitingRefinement,
    submitRefinement: options.submitRefinement,
    isCommandMenuActive: options.isCommandMenuActive,
    selectedCommandId: options.selectedCommandId,
    commandMenuArgsRaw: options.commandMenuArgsRaw,
    isCommandMode: options.isCommandMode,
    intentFilePath: options.intentFilePath,
    isGenerating: options.isGenerating,
    expandInputForSubmit: paste.expandInputForSubmit,
    setInputValue: options.setInputValue,
    pushHistory: options.pushHistory,
    addCommandHistoryEntry: options.addCommandHistoryEntry,
    runGeneration: options.runGeneration,
    handleCommandSelection: options.handleCommandSelection,
    handleNewCommand: options.handleNewCommand,
    handleReuseCommand: options.handleReuseCommand,
    lastUserIntentRef: options.lastUserIntentRef,
    handleSeriesIntentSubmit: options.handleSeriesIntentSubmit,
  } satisfies UseCommandScreenSubmitBindingsOptions)

  const miscDraftHandlers = useMiscPopupDraftHandlers({
    setPopupState: options.setPopupState,
    consumeSuppressedTextInputChange: options.consumeSuppressedTextInputChange,
  })

  return {
    tokenLabel: paste.tokenLabel,
    handleInputChange: paste.handleInputChange,
    handleSubmit: submit.handleSubmit,

    modelPopupOptions,
    modelPopupRecentCount,
    modelPopupSelection,

    historyPopupItems: historyAndIntent.history.historyPopupItems,

    intentPopupSuggestions: historyAndIntent.intent.intentPopupSuggestions,
    intentPopupSuggestionSelectionIndex:
      historyAndIntent.intent.intentPopupSuggestionSelectionIndex,
    intentPopupSuggestionsFocused: historyAndIntent.intent.intentPopupSuggestionsFocused,
    onIntentPopupDraftChange: historyAndIntent.intent.onIntentPopupDraftChange,

    filePopupSuggestions: context.filePopupSuggestions,
    filePopupSuggestionSelectionIndex: context.filePopupSuggestionSelectionIndex,
    filePopupSuggestionsFocused: context.filePopupSuggestionsFocused,
    onFilePopupDraftChange: context.onFilePopupDraftChange,
    onAddFile: context.onAddFile,
    onRemoveFile: context.onRemoveFile,

    onUrlPopupDraftChange: context.onUrlPopupDraftChange,
    onAddUrl: context.onAddUrl,
    onRemoveUrl: context.onRemoveUrl,

    imagePopupSuggestions: context.imagePopupSuggestions,
    imagePopupSuggestionSelectionIndex: context.imagePopupSuggestionSelectionIndex,
    imagePopupSuggestionsFocused: context.imagePopupSuggestionsFocused,
    onImagePopupDraftChange: context.onImagePopupDraftChange,
    onAddImage: context.onAddImage,
    onRemoveImage: context.onRemoveImage,

    videoPopupSuggestions: context.videoPopupSuggestions,
    videoPopupSuggestionSelectionIndex: context.videoPopupSuggestionSelectionIndex,
    videoPopupSuggestionsFocused: context.videoPopupSuggestionsFocused,
    onVideoPopupDraftChange: context.onVideoPopupDraftChange,
    onAddVideo: context.onAddVideo,
    onRemoveVideo: context.onRemoveVideo,

    smartPopupSuggestions: context.smartPopupSuggestions,
    smartPopupSuggestionSelectionIndex: context.smartPopupSuggestionSelectionIndex,
    smartPopupSuggestionsFocused: context.smartPopupSuggestionsFocused,
    onSmartPopupDraftChange: context.onSmartPopupDraftChange,
    onSmartRootSubmit: context.onSmartRootSubmit,

    onHistoryPopupDraftChange: historyAndIntent.history.onHistoryPopupDraftChange,
    onHistoryPopupSubmit: historyAndIntent.history.onHistoryPopupSubmit,

    onModelPopupQueryChange: miscDraftHandlers.onModelPopupQueryChange,
    onSeriesDraftChange: miscDraftHandlers.onSeriesDraftChange,
    onInstructionsDraftChange: miscDraftHandlers.onInstructionsDraftChange,
    onTestDraftChange: miscDraftHandlers.onTestDraftChange,

    onSeriesSubmit: submit.onSeriesSubmit,

    reasoningPopupLines,
    reasoningPopupVisibleRows,
  }
}
