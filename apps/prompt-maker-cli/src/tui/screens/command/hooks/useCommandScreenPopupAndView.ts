/* eslint-disable react-hooks/exhaustive-deps */

import { useCallback } from 'react'

import { POPUP_HEIGHTS } from '../../../config'

import { useCommandScreenChips } from './useCommandScreenChips'
import { useCommandScreenPopupBindings } from './useCommandScreenPopupBindings'
import { useCommandScreenPopupManager } from './useCommandScreenPopupManager'
import { useCommandScreenPopupVisibility } from './useCommandScreenPopupVisibility'
import { useCommandScreenShell } from './useCommandScreenShell'
import { useCommandScreenViewModel } from './useCommandScreenViewModel'
import { useDroppedFilePath } from './useDroppedFilePath'

import type {
  PushHistory,
  UseCommandScreenPopupAndViewOptions,
  UseCommandScreenPopupAndViewResult,
} from './useCommandScreenPopupAndView.types'

export const useCommandScreenPopupAndView = (
  options: UseCommandScreenPopupAndViewOptions,
): UseCommandScreenPopupAndViewResult => {
  const popupManager = useCommandScreenPopupManager({
    currentModel: options.currentModel,
    modelOptions: options.modelOptions,
    smartContextRoot: options.smartContextRoot,
    images: options.images,
    videos: options.videos,
    addImage: options.addImage,
    addVideo: options.addVideo,
    lastTestFile: options.lastTestFile,
    ...(options.interactiveTransportPath
      ? { interactiveTransportPath: options.interactiveTransportPath }
      : {}),
    isGenerating: options.isGenerating,
    lastUserIntentRef: options.lastUserIntentRef,
    lastTypedIntentRef: options.lastTypedIntentRef,
    pushHistoryProxy: options.pushHistoryProxy,
    notify: options.notify,
    setInputValue: options.setInputValue,
    runSeriesGeneration: options.runSeriesGeneration,
    runTestsFromCommandProxy: options.runTestsFromCommandProxy,
    setCurrentModel: options.selectModel,
    setPolishEnabled: options.setPolishEnabled,
    setCopyEnabled: options.setCopyEnabled,
    setChatGptEnabled: options.setChatGptEnabled,
    setJsonOutputEnabled: options.setJsonOutputEnabled,
    intentFilePath: options.intentFilePath,
    setIntentFilePath: options.setIntentFilePath,
    metaInstructions: options.metaInstructions,
    setMetaInstructions: options.setMetaInstructions,
    polishEnabled: options.polishEnabled,
    copyEnabled: options.copyEnabled,
    chatGptEnabled: options.chatGptEnabled,
    jsonOutputEnabled: options.jsonOutputEnabled,
  })

  options.closeTestPopupRef.current = () => {
    popupManager.setPopupState((prev) => (prev?.type === 'test' ? null : prev))
  }

  useCommandScreenPopupVisibility({
    isPopupOpen: popupManager.isPopupOpen,
    onPopupVisibilityChange: options.onPopupVisibilityChange,
  })

  const pushHistory = useCallback<PushHistory>(
    (content, kind) => {
      options.pushHistoryRef.current(content, kind)
    },
    [options.pushHistoryRef],
  )

  const droppedFilePath = useDroppedFilePath(options.inputValue)

  const shell = useCommandScreenShell({
    stdout: options.stdout,
    setTerminalSize: options.setTerminalSize,
    ...(options.interactiveTransportPath
      ? { interactiveTransportPath: options.interactiveTransportPath }
      : {}),
    terminalRows: options.terminalRows,
    inputValue: options.inputValue,
    debugKeyLine: options.debugKeyLine,
    debugKeysEnabled: options.debugKeysEnabled,
    helpOpen: options.helpOpen,
    reservedRows: options.reservedRows,
    popupState: popupManager.popupState,
    isPopupOpen: popupManager.isPopupOpen,
    setPopupState: popupManager.setPopupState,
    ...(options.commandMenuSignal !== undefined
      ? { commandMenuSignal: options.commandMenuSignal }
      : {}),
    commandSelectionIndex: options.commandSelectionIndex,
    setCommandSelectionIndex: options.setCommandSelectionIndex,
    isGenerating: options.isGenerating,
    awaitingInteractiveMode: options.awaitingInteractiveMode,
    files: options.files,
    urls: options.urls,
    lastGeneratedPrompt: options.lastGeneratedPrompt,
    resetContext: options.resetContext,
    lastUserIntentRef: options.lastUserIntentRef,
    lastTypedIntentRef: options.lastTypedIntentRef,
    setInputValue: options.setInputValue,
    setIntentFilePath: options.setIntentFilePath,
    setMetaInstructions: options.setMetaInstructions,
    scrollToRef: options.scrollToRef,
    clearHistoryRef: options.clearHistoryRef,
    pushHistoryRef: options.pushHistoryRef,
    scrollToProxy: options.scrollToProxy,
  })

  const { enhancedStatusChips } = useCommandScreenChips({
    currentModel: options.currentModel,
    providerStatuses: options.providerStatuses,
    statusChips: options.statusChips,
    intentFilePath: options.intentFilePath,
    metaInstructions: options.metaInstructions,
  })

  const bindings = useCommandScreenPopupBindings({
    inputValue: options.inputValue,
    setInputValue: options.setInputValue,
    setPasteActive: options.setPasteActive,
    popupState: popupManager.popupState,
    setPopupState: popupManager.setPopupState,
    isPopupOpen: popupManager.isPopupOpen,
    helpOpen: options.helpOpen,
    consumeSuppressedTextInputChange: options.consumeSuppressedTextInputChange,
    suppressNextInput: options.suppressNextInput,
    updateLastTypedIntent: options.updateLastTypedIntent,
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
    isGenerating: options.isGenerating,
    isAwaitingRefinement: options.isAwaitingRefinement,
    submitRefinement: options.submitRefinement,
    runGeneration: options.runGeneration,
    handleNewCommand: shell.handleNewCommand,
    handleReuseCommand: shell.handleReuseCommand,
    intentFilePath: options.intentFilePath,
    lastUserIntentRef: options.lastUserIntentRef,
    pushHistory,
    addCommandHistoryEntry: options.addCommandHistoryEntry,
    commandHistoryValues: options.commandHistoryValues,
    droppedFilePath,
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
    notify: (message) => options.notify(message),
    modelOptions: options.modelOptions,
    lastReasoning: options.lastReasoning,
    terminalColumns: options.terminalColumns,
    reasoningPopupHeight: POPUP_HEIGHTS.reasoning,
  })

  const viewModel = useCommandScreenViewModel({
    transport: { isAwaitingTransportInput: shell.isAwaitingTransportInput },
    panes: {
      history: {
        lines: shell.history,
        visibleRows: shell.historyRows,
        scrollOffset: shell.scrollOffset,
      },
      menu: {
        isActive: shell.isCommandMenuActive,
        height: shell.menuHeight,
        commands: shell.visibleCommands,
        selectedIndex: options.commandSelectionIndex,
      },
    },
    popup: {
      base: {
        popupState: popupManager.popupState,
        helpOpen: options.helpOpen,
        overlayHeight: shell.overlayHeight,
      },
      model: {
        modelPopupOptions: bindings.modelPopupOptions,
        modelPopupSelection: bindings.modelPopupSelection,
        modelPopupRecentCount: bindings.modelPopupRecentCount,
        providerStatuses: options.providerStatuses,
        onModelPopupQueryChange: bindings.onModelPopupQueryChange,
        onModelPopupSubmit: popupManager.actions.handleModelPopupSubmit,
      },
      context: {
        files: options.files,
        filePopupSuggestions: bindings.filePopupSuggestions,
        filePopupSuggestionSelectionIndex: bindings.filePopupSuggestionSelectionIndex,
        filePopupSuggestionsFocused: bindings.filePopupSuggestionsFocused,
        onFilePopupDraftChange: bindings.onFilePopupDraftChange,
        onAddFile: bindings.onAddFile,
        urls: options.urls,
        onUrlPopupDraftChange: bindings.onUrlPopupDraftChange,
        onAddUrl: bindings.onAddUrl,
        images: options.images,
        imagePopupSuggestions: bindings.imagePopupSuggestions,
        imagePopupSuggestionSelectionIndex: bindings.imagePopupSuggestionSelectionIndex,
        imagePopupSuggestionsFocused: bindings.imagePopupSuggestionsFocused,
        onImagePopupDraftChange: bindings.onImagePopupDraftChange,
        onAddImage: bindings.onAddImage,
        videos: options.videos,
        videoPopupSuggestions: bindings.videoPopupSuggestions,
        videoPopupSuggestionSelectionIndex: bindings.videoPopupSuggestionSelectionIndex,
        videoPopupSuggestionsFocused: bindings.videoPopupSuggestionsFocused,
        onVideoPopupDraftChange: bindings.onVideoPopupDraftChange,
        onAddVideo: bindings.onAddVideo,
        smartContextEnabled: options.smartContextEnabled,
        smartContextRoot: options.smartContextRoot,
        smartPopupSuggestions: bindings.smartPopupSuggestions,
        smartPopupSuggestionSelectionIndex: bindings.smartPopupSuggestionSelectionIndex,
        smartPopupSuggestionsFocused: bindings.smartPopupSuggestionsFocused,
        onSmartPopupDraftChange: bindings.onSmartPopupDraftChange,
        onSmartRootSubmit: bindings.onSmartRootSubmit,
      },
      history: {
        historyPopupItems: bindings.historyPopupItems,
        onHistoryPopupDraftChange: bindings.onHistoryPopupDraftChange,
        onHistoryPopupSubmit: bindings.onHistoryPopupSubmit,
      },
      intent: {
        intentPopupSuggestions: bindings.intentPopupSuggestions,
        intentPopupSuggestionSelectionIndex: bindings.intentPopupSuggestionSelectionIndex,
        intentPopupSuggestionsFocused: bindings.intentPopupSuggestionsFocused,
        onIntentPopupDraftChange: bindings.onIntentPopupDraftChange,
        onIntentFileSubmit: popupManager.actions.handleIntentFileSubmit,
      },
      instructions: {
        onInstructionsDraftChange: bindings.onInstructionsDraftChange,
        onInstructionsSubmit: popupManager.actions.handleInstructionsSubmit,
      },
      series: {
        isGenerating: options.isGenerating,
        onSeriesDraftChange: bindings.onSeriesDraftChange,
        onSeriesSubmit: bindings.onSeriesSubmit,
      },
      test: {
        isTestCommandRunning: options.isTestCommandRunning,
        onTestDraftChange: bindings.onTestDraftChange,
        onTestSubmit: options.onTestPopupSubmit,
      },
      tokens: {
        tokenUsageRun: options.tokenUsageRun,
        tokenUsageBreakdown: options.tokenUsageBreakdown,
      },
      settings: { statusChips: enhancedStatusChips },
      reasoning: {
        reasoningPopupLines: bindings.reasoningPopupLines,
        reasoningPopupVisibleRows: bindings.reasoningPopupVisibleRows,
      },
    },
    input: {
      base: {
        value: options.inputValue,
        onChange: bindings.handleInputChange,
        onSubmit: bindings.handleSubmit,
        isPasteActive: options.isPasteActive,
        hint: shell.inputBarHint,
        debugLine: shell.inputBarDebugLine,
        tokenLabel: bindings.tokenLabel,
        debugKeysEnabled: options.debugKeysEnabled,
        onDebugKeyEvent: options.onDebugKeyEvent,
      },
      state: {
        isPopupOpen: popupManager.isPopupOpen,
        helpOpen: options.helpOpen,
        isAwaitingRefinement: options.isAwaitingRefinement,
      },
      statusChips: enhancedStatusChips,
    },
  })

  return {
    transportMessage: viewModel.transportMessage,
    historyPaneProps: viewModel.historyPaneProps,
    popupAreaProps: viewModel.popupAreaProps,
    commandMenuPaneProps: viewModel.commandMenuPaneProps,
    commandInputProps: viewModel.commandInputProps,
  }
}
