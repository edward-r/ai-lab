import { useStdout } from 'ink'

import type { NotifyOptions } from '../../../notifier'

import { useContextDispatch, useContextState } from '../../../context-store'

import { useCommandScreenHistoryAndTests } from './useCommandScreenHistoryAndTests'
import { useCommandScreenInputState } from './useCommandScreenInputState'
import {
  useCommandScreenModelGeneration,
  type UseCommandScreenModelGenerationResult,
} from './useCommandScreenModelGeneration'
import { useCommandScreenPopupAndView } from './useCommandScreenPopupAndView'
import type { UseCommandScreenPopupAndViewResult } from './useCommandScreenPopupAndView.types'

type CommandScreenControllerOptions = {
  interactiveTransportPath?: string | undefined
  onPopupVisibilityChange?: (isOpen: boolean) => void
  commandMenuSignal?: number
  helpOpen: boolean
  reservedRows: number
  notify: (message: string, options?: NotifyOptions) => void
}

export type CommandScreenControllerResult = UseCommandScreenPopupAndViewResult & {
  suppressNextInput: () => void
}

export const useCommandScreenController = ({
  interactiveTransportPath,
  onPopupVisibilityChange,
  commandMenuSignal,
  helpOpen,
  reservedRows,
  notify,
}: CommandScreenControllerOptions): CommandScreenControllerResult => {
  const { stdout } = useStdout()

  const {
    files,
    urls,
    images,
    videos,
    smartContextEnabled,
    smartContextRoot,
    metaInstructions,
    lastReasoning,
    lastGeneratedPrompt,
  } = useContextState()

  const {
    addFile,
    removeFile,
    addUrl,
    removeUrl,
    addImage,
    removeImage,
    addVideo,
    removeVideo,
    toggleSmartContext,
    setSmartRoot,
    setMetaInstructions,
    setLastReasoning,
    setLastGeneratedPrompt,
    resetContext,
  } = useContextDispatch()

  const historyAndTests = useCommandScreenHistoryAndTests()

  const inputState = useCommandScreenInputState({
    pushHistoryProxy: historyAndTests.pushHistoryProxy,
  })

  const modelAndGeneration: UseCommandScreenModelGenerationResult = useCommandScreenModelGeneration(
    {
      pushHistoryProxy: historyAndTests.pushHistoryProxy,
      notify,
      files,
      urls,
      images,
      videos,
      smartContextEnabled,
      smartContextRoot,
      metaInstructions,
      ...(interactiveTransportPath ? { interactiveTransportPath } : {}),
      terminalColumns: inputState.terminalColumns,
      polishEnabled: inputState.polishEnabled,
      copyEnabled: inputState.copyEnabled,
      chatGptEnabled: inputState.chatGptEnabled,
      jsonOutputEnabled: inputState.jsonOutputEnabled,
      isTestCommandRunning: historyAndTests.isTestCommandRunning,
      setLastReasoning,
      setLastGeneratedPrompt,
    },
  )

  const view = useCommandScreenPopupAndView({
    ...(interactiveTransportPath ? { interactiveTransportPath } : {}),
    ...(onPopupVisibilityChange ? { onPopupVisibilityChange } : {}),
    ...(commandMenuSignal !== undefined ? { commandMenuSignal } : {}),
    helpOpen,
    reservedRows,
    notify,
    stdout,
    files,
    urls,
    images,
    videos,
    smartContextEnabled,
    smartContextRoot,
    metaInstructions,
    lastReasoning,
    lastGeneratedPrompt,
    addFile,
    removeFile,
    addUrl,
    removeUrl,
    addImage,
    removeImage,
    addVideo,
    removeVideo,
    toggleSmartContext,
    setSmartRoot,
    setMetaInstructions,
    resetContext,
    currentModel: modelAndGeneration.currentModel,
    modelOptions: modelAndGeneration.modelOptions,
    providerStatuses: modelAndGeneration.providerStatuses,
    selectModel: modelAndGeneration.selectModel,
    isGenerating: modelAndGeneration.pipeline.isGenerating,
    runGeneration: modelAndGeneration.pipeline.runGeneration,
    runSeriesGeneration: modelAndGeneration.pipeline.runSeriesGeneration,
    statusChips: modelAndGeneration.pipeline.statusChips,
    isAwaitingRefinement: modelAndGeneration.pipeline.isAwaitingRefinement,
    submitRefinement: modelAndGeneration.pipeline.submitRefinement,
    awaitingInteractiveMode: modelAndGeneration.pipeline.awaitingInteractiveMode,
    tokenUsageRun: modelAndGeneration.pipeline.tokenUsageRun,
    tokenUsageBreakdown: modelAndGeneration.pipeline.tokenUsageBreakdown,
    terminalRows: inputState.terminalRows,
    terminalColumns: inputState.terminalColumns,
    inputValue: inputState.inputValue,
    isPasteActive: inputState.isPasteActive,
    commandSelectionIndex: inputState.commandSelectionIndex,
    debugKeyLine: inputState.debugKeyLine,
    debugKeysEnabled: inputState.debugKeysEnabled,
    setTerminalSize: inputState.setTerminalSize,
    setInputValue: inputState.setInputValue,
    setPasteActive: inputState.setPasteActive,
    setCommandSelectionIndex: inputState.setCommandSelectionIndex,
    intentFilePath: inputState.intentFilePath,
    setIntentFilePath: inputState.setIntentFilePath,
    polishEnabled: inputState.polishEnabled,
    setPolishEnabled: inputState.setPolishEnabled,
    copyEnabled: inputState.copyEnabled,
    setCopyEnabled: inputState.setCopyEnabled,
    chatGptEnabled: inputState.chatGptEnabled,
    setChatGptEnabled: inputState.setChatGptEnabled,
    jsonOutputEnabled: inputState.jsonOutputEnabled,
    setJsonOutputEnabled: inputState.setJsonOutputEnabled,
    lastUserIntentRef: inputState.lastUserIntentRef,
    lastTypedIntentRef: inputState.lastTypedIntentRef,
    consumeSuppressedTextInputChange: inputState.consumeSuppressedTextInputChange,
    suppressNextInput: inputState.suppressNextInput,
    updateLastTypedIntent: inputState.updateLastTypedIntent,
    pushHistoryRef: historyAndTests.pushHistoryRef,
    pushHistoryProxy: historyAndTests.pushHistoryProxy,
    clearHistoryRef: historyAndTests.clearHistoryRef,
    scrollToRef: historyAndTests.scrollToRef,
    scrollToProxy: historyAndTests.scrollToProxy,
    closeTestPopupRef: historyAndTests.closeTestPopupRef,
    commandHistoryValues: historyAndTests.commandHistoryValues,
    addCommandHistoryEntry: historyAndTests.addCommandHistoryEntry,
    isTestCommandRunning: historyAndTests.isTestCommandRunning,
    lastTestFile: historyAndTests.lastTestFile,
    runTestsFromCommandProxy: historyAndTests.runTestsFromCommandProxy,
    onTestPopupSubmit: historyAndTests.onTestPopupSubmit,
    onDebugKeyEvent: inputState.onDebugKeyEvent,
  })

  return {
    ...view,
    suppressNextInput: inputState.suppressNextInput,
  }
}
