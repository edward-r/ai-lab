/* eslint-disable react-hooks/exhaustive-deps */

import fs from 'node:fs'

import type { WriteStream } from 'node:tty'
import { useCallback, useEffect, useMemo } from 'react'

import { POPUP_HEIGHTS } from '../../../config'
import { parseAbsolutePathFromInput } from '../../../drag-drop-path'
import type { NotifyOptions } from '../../../notifier'
import type { HistoryEntry, ModelOption, ProviderStatusMap } from '../../../types'

import { useCommandScreenChips } from './useCommandScreenChips'
import { useCommandScreenPopupBindings } from './useCommandScreenPopupBindings'
import { useCommandScreenPopupManager } from './useCommandScreenPopupManager'
import { useCommandScreenShell } from './useCommandScreenShell'
import { useCommandScreenViewModel } from './useCommandScreenViewModel'

type PushHistory = (content: string, kind?: HistoryEntry['kind']) => void

type UseCommandScreenPopupAndViewOptions = {
  interactiveTransportPath?: string | undefined
  onPopupVisibilityChange?: ((isOpen: boolean) => void) | undefined
  commandMenuSignal?: number | undefined
  helpOpen: boolean
  reservedRows: number
  notify: (message: string, options?: NotifyOptions) => void

  stdout: WriteStream | undefined

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
  historyPaneProps: Parameters<typeof useCommandScreenViewModel>[0]['panes']['history']
  popupAreaProps: ReturnType<typeof useCommandScreenViewModel>['popupAreaProps']
  commandMenuPaneProps: Parameters<typeof useCommandScreenViewModel>[0]['panes']['menu']
  commandInputProps: ReturnType<typeof useCommandScreenViewModel>['commandInputProps']
}

export const useCommandScreenPopupAndView = ({
  interactiveTransportPath,
  onPopupVisibilityChange,
  commandMenuSignal,
  helpOpen,
  reservedRows,
  notify,
  stdout,
  files,
  urls,
  smartContextEnabled,
  smartContextRoot,
  metaInstructions,
  lastReasoning,
  lastGeneratedPrompt,
  addFile,
  removeFile,
  addUrl,
  removeUrl,
  toggleSmartContext,
  setSmartRoot,
  setMetaInstructions,
  resetContext,
  currentModel,
  modelOptions,
  providerStatuses,
  selectModel,
  isGenerating,
  runGeneration,
  runSeriesGeneration,
  statusChips,
  isAwaitingRefinement,
  submitRefinement,
  awaitingInteractiveMode,
  tokenUsageRun,
  tokenUsageBreakdown,
  terminalRows,
  terminalColumns,
  inputValue,
  isPasteActive,
  commandSelectionIndex,
  debugKeyLine,
  debugKeysEnabled,
  setTerminalSize,
  setInputValue,
  setPasteActive,
  setCommandSelectionIndex,
  intentFilePath,
  setIntentFilePath,
  polishEnabled,
  setPolishEnabled,
  copyEnabled,
  setCopyEnabled,
  chatGptEnabled,
  setChatGptEnabled,
  jsonOutputEnabled,
  setJsonOutputEnabled,
  lastUserIntentRef,
  lastTypedIntentRef,
  consumeSuppressedTextInputChange,
  suppressNextInput,
  updateLastTypedIntent,
  pushHistoryRef,
  pushHistoryProxy,
  clearHistoryRef,
  scrollToRef,
  scrollToProxy,
  closeTestPopupRef,
  commandHistoryValues,
  addCommandHistoryEntry,
  isTestCommandRunning,
  lastTestFile,
  runTestsFromCommandProxy,
  onTestPopupSubmit,
  onDebugKeyEvent,
}: UseCommandScreenPopupAndViewOptions): UseCommandScreenPopupAndViewResult => {
  const popupManager = useCommandScreenPopupManager({
    currentModel,
    modelOptions,
    smartContextRoot,
    lastTestFile,
    ...(interactiveTransportPath ? { interactiveTransportPath } : {}),
    isGenerating,
    lastUserIntentRef,
    lastTypedIntentRef,
    pushHistoryProxy,
    notify,
    setInputValue: (value) => {
      setInputValue(value)
    },
    runSeriesGeneration,
    runTestsFromCommandProxy,
    setCurrentModel: selectModel,
    setPolishEnabled,
    setCopyEnabled,
    setChatGptEnabled,
    setJsonOutputEnabled,
    intentFilePath,
    setIntentFilePath,
    metaInstructions,
    setMetaInstructions,
    polishEnabled,
    copyEnabled,
    chatGptEnabled,
    jsonOutputEnabled,
  })

  closeTestPopupRef.current = () => {
    popupManager.setPopupState((prev) => (prev?.type === 'test' ? null : prev))
  }

  const pushHistory = useCallback<PushHistory>(
    (content, kind) => {
      pushHistoryRef.current(content, kind)
    },
    [pushHistoryRef],
  )

  const droppedFilePath = useMemo(() => {
    const candidate = parseAbsolutePathFromInput(inputValue)
    if (!candidate) {
      return null
    }
    try {
      const stats = fs.statSync(candidate)
      return stats.isFile() ? candidate : null
    } catch {
      return null
    }
  }, [inputValue])

  const shell = useCommandScreenShell({
    stdout,
    setTerminalSize,
    ...(interactiveTransportPath ? { interactiveTransportPath } : {}),
    terminalRows,
    inputValue,
    debugKeyLine,
    debugKeysEnabled,
    helpOpen,
    reservedRows,
    popupState: popupManager.popupState,
    isPopupOpen: popupManager.isPopupOpen,
    setPopupState: popupManager.setPopupState,
    ...(commandMenuSignal !== undefined ? { commandMenuSignal } : {}),
    commandSelectionIndex,
    setCommandSelectionIndex,
    isGenerating,
    awaitingInteractiveMode,
    files,
    urls,
    lastGeneratedPrompt,
    resetContext,
    lastUserIntentRef,
    lastTypedIntentRef,
    setInputValue,
    setIntentFilePath,
    setMetaInstructions,
    scrollToRef,
    clearHistoryRef,
    pushHistoryRef,
    scrollToProxy,
  })

  const { enhancedStatusChips } = useCommandScreenChips({
    currentModel,
    providerStatuses,
    statusChips,
    intentFilePath,
    metaInstructions,
  })

  useEffect(() => {
    if (!onPopupVisibilityChange) {
      return
    }
    onPopupVisibilityChange(popupManager.isPopupOpen)
  }, [onPopupVisibilityChange, popupManager.isPopupOpen])

  useEffect(() => {
    if (!onPopupVisibilityChange) {
      return undefined
    }
    return () => {
      onPopupVisibilityChange(false)
    }
  }, [onPopupVisibilityChange])

  const bindings = useCommandScreenPopupBindings({
    inputValue,
    setInputValue,
    setPasteActive,
    popupState: popupManager.popupState,
    setPopupState: popupManager.setPopupState,
    isPopupOpen: popupManager.isPopupOpen,
    helpOpen,
    consumeSuppressedTextInputChange,
    suppressNextInput,
    updateLastTypedIntent,
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
    isGenerating,
    isAwaitingRefinement,
    submitRefinement,
    runGeneration,
    handleNewCommand: shell.handleNewCommand,
    handleReuseCommand: shell.handleReuseCommand,
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
    notify: (message) => notify(message),
    modelOptions,
    lastReasoning,
    terminalColumns,
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
        selectedIndex: commandSelectionIndex,
      },
    },
    popup: {
      base: { popupState: popupManager.popupState, helpOpen, overlayHeight: shell.overlayHeight },
      model: {
        modelPopupOptions: bindings.modelPopupOptions,
        modelPopupSelection: bindings.modelPopupSelection,
        modelPopupRecentCount: bindings.modelPopupRecentCount,
        providerStatuses,
        onModelPopupQueryChange: bindings.onModelPopupQueryChange,
        onModelPopupSubmit: popupManager.actions.handleModelPopupSubmit,
      },
      context: {
        files,
        filePopupSuggestions: bindings.filePopupSuggestions,
        filePopupSuggestionSelectionIndex: bindings.filePopupSuggestionSelectionIndex,
        filePopupSuggestionsFocused: bindings.filePopupSuggestionsFocused,
        onFilePopupDraftChange: bindings.onFilePopupDraftChange,
        onAddFile: bindings.onAddFile,
        urls,
        onUrlPopupDraftChange: bindings.onUrlPopupDraftChange,
        onAddUrl: bindings.onAddUrl,
        smartContextEnabled,
        smartContextRoot,
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
        isGenerating,
        onSeriesDraftChange: bindings.onSeriesDraftChange,
        onSeriesSubmit: bindings.onSeriesSubmit,
      },
      test: {
        isTestCommandRunning,
        onTestDraftChange: bindings.onTestDraftChange,
        onTestSubmit: onTestPopupSubmit,
      },
      tokens: { tokenUsageRun, tokenUsageBreakdown },
      settings: { statusChips: enhancedStatusChips },
      reasoning: {
        reasoningPopupLines: bindings.reasoningPopupLines,
        reasoningPopupVisibleRows: bindings.reasoningPopupVisibleRows,
      },
    },
    input: {
      base: {
        value: inputValue,
        onChange: bindings.handleInputChange,
        onSubmit: bindings.handleSubmit,
        isPasteActive,
        hint: shell.inputBarHint,
        debugLine: shell.inputBarDebugLine,
        tokenLabel: bindings.tokenLabel,
        debugKeysEnabled,
        onDebugKeyEvent,
      },
      state: { isPopupOpen: popupManager.isPopupOpen, helpOpen, isAwaitingRefinement },
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
