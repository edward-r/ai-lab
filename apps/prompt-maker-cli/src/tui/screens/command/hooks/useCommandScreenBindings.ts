import { POPUP_HEIGHTS } from '../../../config'
import { useStableCallback } from '../../../hooks/useStableCallback'

import { useCommandScreenChips } from './useCommandScreenChips'
import { useCommandScreenPopupBindings } from './useCommandScreenPopupBindings'
import { useCommandScreenPopupManager } from './useCommandScreenPopupManager'
import { useCommandScreenPopupVisibility } from './useCommandScreenPopupVisibility'
import { useCommandScreenShell } from './useCommandScreenShell'
import { useDroppedFilePath } from './useDroppedFilePath'

import type {
  PushHistory,
  UseCommandScreenPopupAndViewOptions,
} from './useCommandScreenPopupAndView.types'

export type UseCommandScreenBindingsResult = {
  popupManager: ReturnType<typeof useCommandScreenPopupManager>
  shell: ReturnType<typeof useCommandScreenShell>
  bindings: ReturnType<typeof useCommandScreenPopupBindings>
  enhancedStatusChips: string[]
}

export const useCommandScreenBindings = (
  options: UseCommandScreenPopupAndViewOptions,
): UseCommandScreenBindingsResult => {
  const { context, input, popup, history, generation } = options

  const popupManager = useCommandScreenPopupManager({
    currentModel: generation.currentModel,
    currentTargetModel: generation.currentTargetModel,
    modelOptions: generation.modelOptions,
    smartContextEnabled: context.smartContextEnabled,
    smartContextRoot: context.smartContextRoot,
    toggleSmartContext: context.toggleSmartContext,
    setSmartRoot: context.setSmartRoot,
    images: context.images,
    videos: context.videos,
    addImage: context.addImage,
    addVideo: context.addVideo,
    lastTestFile: history.lastTestFile,
    ...(context.interactiveTransportPath
      ? { interactiveTransportPath: context.interactiveTransportPath }
      : {}),
    isGenerating: generation.isGenerating,
    lastUserIntentRef: input.lastUserIntentRef,
    lastTypedIntentRef: input.lastTypedIntentRef,
    pushHistoryProxy: history.pushHistoryProxy,
    notify: context.notify,
    setInputValue: input.setInputValue,
    runSeriesGeneration: generation.runSeriesGeneration,
    runTestsFromCommandProxy: history.runTestsFromCommandProxy,
    setCurrentModel: generation.selectModel,
    setCurrentTargetModel: generation.selectTargetModel,
    setPolishEnabled: input.setPolishEnabled,
    setCopyEnabled: input.setCopyEnabled,
    setChatGptEnabled: input.setChatGptEnabled,
    setJsonOutputEnabled: input.setJsonOutputEnabled,
    intentFilePath: input.intentFilePath,
    setIntentFilePath: input.setIntentFilePath,
    metaInstructions: context.metaInstructions,
    setMetaInstructions: context.setMetaInstructions,
    polishEnabled: input.polishEnabled,
    copyEnabled: input.copyEnabled,
    chatGptEnabled: input.chatGptEnabled,
    jsonOutputEnabled: input.jsonOutputEnabled,
  })

  history.closeTestPopupRef.current = () => {
    popupManager.setPopupState((prev) => (prev?.type === 'test' ? null : prev))
  }

  useCommandScreenPopupVisibility({
    isPopupOpen: popupManager.isPopupOpen,
    onPopupVisibilityChange: popup.onPopupVisibilityChange,
  })

  const pushHistory: PushHistory = useStableCallback((content, kind) => {
    history.pushHistoryRef.current(content, kind)
  })

  const droppedFilePath = useDroppedFilePath(input.inputValue)

  const shell = useCommandScreenShell({
    stdout: context.stdout,
    setTerminalSize: input.setTerminalSize,
    ...(context.interactiveTransportPath
      ? { interactiveTransportPath: context.interactiveTransportPath }
      : {}),
    terminalRows: input.terminalRows,
    inputValue: input.inputValue,
    debugKeyLine: input.debugKeyLine,
    debugKeysEnabled: input.debugKeysEnabled,
    helpOpen: popup.helpOpen,
    reservedRows: popup.reservedRows,
    popupState: popupManager.popupState,
    isPopupOpen: popupManager.isPopupOpen,
    setPopupState: popupManager.setPopupState,
    ...(popup.commandMenuSignal !== undefined
      ? { commandMenuSignal: popup.commandMenuSignal }
      : {}),
    commandSelectionIndex: input.commandSelectionIndex,
    setCommandSelectionIndex: input.setCommandSelectionIndex,
    isGenerating: generation.isGenerating,
    awaitingInteractiveMode: generation.awaitingInteractiveMode,
    files: context.files,
    urls: context.urls,
    lastGeneratedPrompt: context.lastGeneratedPrompt,
    resetContext: context.resetContext,
    lastUserIntentRef: input.lastUserIntentRef,
    lastTypedIntentRef: input.lastTypedIntentRef,
    setInputValue: input.setInputValue,
    setIntentFilePath: input.setIntentFilePath,
    setMetaInstructions: context.setMetaInstructions,
    scrollToRef: history.scrollToRef,
    clearHistoryRef: history.clearHistoryRef,
    pushHistoryRef: history.pushHistoryRef,
    scrollToProxy: history.scrollToProxy,
  })

  const { enhancedStatusChips } = useCommandScreenChips({
    currentModel: generation.currentModel,
    providerStatuses: generation.providerStatuses,
    statusChips: generation.statusChips,
    intentFilePath: input.intentFilePath,
    metaInstructions: context.metaInstructions,
  })

  const bindings = useCommandScreenPopupBindings({
    inputValue: input.inputValue,
    setInputValue: input.setInputValue,
    setPasteActive: input.setPasteActive,
    popupState: popupManager.popupState,
    setPopupState: popupManager.setPopupState,
    isPopupOpen: popupManager.isPopupOpen,
    helpOpen: popup.helpOpen,
    consumeSuppressedTextInputChange: input.consumeSuppressedTextInputChange,
    suppressNextInput: input.suppressNextInput,
    updateLastTypedIntent: input.updateLastTypedIntent,
    closePopup: popupManager.actions.closePopup,
    handleCommandSelection: popupManager.actions.handleCommandSelection,
    handleModelPopupSubmit: popupManager.actions.handleModelPopupSubmit,
    applyToggleSelection: popupManager.actions.applyToggleSelection,
    handleIntentFileSubmit: popupManager.actions.handleIntentFileSubmit,
    handleSeriesIntentSubmit: popupManager.actions.handleSeriesIntentSubmit,
    isCommandMenuActive: shell.isCommandMenuActive,
    selectedCommandId: shell.selectedCommand?.id ?? null,
    commandMenuArgsRaw: shell.commandMenuArgsRaw,
    isCommandMode: shell.isCommandMode,
    isGenerating: generation.isGenerating,
    isAwaitingRefinement: generation.isAwaitingRefinement,
    submitRefinement: generation.submitRefinement,
    runGeneration: generation.runGeneration,
    handleNewCommand: shell.handleNewCommand,
    handleReuseCommand: shell.handleReuseCommand,
    intentFilePath: input.intentFilePath,
    lastUserIntentRef: input.lastUserIntentRef,
    pushHistory,
    addCommandHistoryEntry: history.addCommandHistoryEntry,
    commandHistoryValues: history.commandHistoryValues,
    droppedFilePath,
    files: context.files,
    urls: context.urls,
    images: context.images,
    videos: context.videos,
    smartContextEnabled: context.smartContextEnabled,
    smartContextRoot: context.smartContextRoot,
    addFile: context.addFile,
    removeFile: context.removeFile,
    addUrl: context.addUrl,
    removeUrl: context.removeUrl,
    addImage: context.addImage,
    removeImage: context.removeImage,
    addVideo: context.addVideo,
    removeVideo: context.removeVideo,
    toggleSmartContext: context.toggleSmartContext,
    setSmartRoot: context.setSmartRoot,
    notify: (message) => context.notify(message),
    modelOptions: generation.modelOptions,
    lastReasoning: context.lastReasoning,
    terminalColumns: input.terminalColumns,
    reasoningPopupHeight: POPUP_HEIGHTS.reasoning,
  })

  return {
    popupManager,
    shell,
    bindings,
    enhancedStatusChips,
  }
}
