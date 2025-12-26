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
  const { context, input, popup, history, generation } = options

  const popupManager = useCommandScreenPopupManager({
    currentModel: generation.currentModel,
    modelOptions: generation.modelOptions,
    smartContextRoot: context.smartContextRoot,
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

  const pushHistory = useCallback<PushHistory>(
    (content, kind) => {
      history.pushHistoryRef.current(content, kind)
    },
    [history.pushHistoryRef],
  )

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
        selectedIndex: input.commandSelectionIndex,
      },
    },
    popup: {
      base: {
        popupState: popupManager.popupState,
        helpOpen: popup.helpOpen,
        overlayHeight: shell.overlayHeight,
      },
      model: {
        modelPopupOptions: bindings.modelPopupOptions,
        modelPopupSelection: bindings.modelPopupSelection,
        modelPopupRecentCount: bindings.modelPopupRecentCount,
        providerStatuses: generation.providerStatuses,
        onModelPopupQueryChange: bindings.onModelPopupQueryChange,
        onModelPopupSubmit: popupManager.actions.handleModelPopupSubmit,
      },
      context: {
        files: context.files,
        filePopupSuggestions: bindings.filePopupSuggestions,
        filePopupSuggestionSelectionIndex: bindings.filePopupSuggestionSelectionIndex,
        filePopupSuggestionsFocused: bindings.filePopupSuggestionsFocused,
        onFilePopupDraftChange: bindings.onFilePopupDraftChange,
        onAddFile: bindings.onAddFile,
        urls: context.urls,
        onUrlPopupDraftChange: bindings.onUrlPopupDraftChange,
        onAddUrl: bindings.onAddUrl,
        images: context.images,
        imagePopupSuggestions: bindings.imagePopupSuggestions,
        imagePopupSuggestionSelectionIndex: bindings.imagePopupSuggestionSelectionIndex,
        imagePopupSuggestionsFocused: bindings.imagePopupSuggestionsFocused,
        onImagePopupDraftChange: bindings.onImagePopupDraftChange,
        onAddImage: bindings.onAddImage,
        videos: context.videos,
        videoPopupSuggestions: bindings.videoPopupSuggestions,
        videoPopupSuggestionSelectionIndex: bindings.videoPopupSuggestionSelectionIndex,
        videoPopupSuggestionsFocused: bindings.videoPopupSuggestionsFocused,
        onVideoPopupDraftChange: bindings.onVideoPopupDraftChange,
        onAddVideo: bindings.onAddVideo,
        smartContextEnabled: context.smartContextEnabled,
        smartContextRoot: context.smartContextRoot,
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
        isGenerating: generation.isGenerating,
        onSeriesDraftChange: bindings.onSeriesDraftChange,
        onSeriesSubmit: bindings.onSeriesSubmit,
      },
      test: {
        isTestCommandRunning: history.isTestCommandRunning,
        onTestDraftChange: bindings.onTestDraftChange,
        onTestSubmit: history.onTestPopupSubmit,
      },
      tokens: {
        tokenUsageRun: generation.tokenUsageRun,
        tokenUsageBreakdown: generation.tokenUsageBreakdown,
      },
      settings: { statusChips: enhancedStatusChips },
      reasoning: {
        reasoningPopupLines: bindings.reasoningPopupLines,
        reasoningPopupVisibleRows: bindings.reasoningPopupVisibleRows,
      },
    },
    input: {
      base: {
        value: input.inputValue,
        onChange: bindings.handleInputChange,
        onSubmit: bindings.handleSubmit,
        isPasteActive: input.isPasteActive,
        hint: shell.inputBarHint,
        debugLine: shell.inputBarDebugLine,
        tokenLabel: bindings.tokenLabel,
        debugKeysEnabled: input.debugKeysEnabled,
        onDebugKeyEvent: input.onDebugKeyEvent,
      },
      state: {
        isPopupOpen: popupManager.isPopupOpen,
        helpOpen: popup.helpOpen,
        isAwaitingRefinement: generation.isAwaitingRefinement,
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
