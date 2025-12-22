/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable react-hooks/exhaustive-deps */
import fs from 'node:fs'
import path from 'node:path'
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Box, Text, useApp, useStdout } from 'ink'

import { useCommandScreen } from './useCommandScreen'

import { useModelProviderState } from './hooks/useModelProviderState'
import { usePasteManager } from './hooks/usePasteManager'
import { usePopupKeyboardShortcuts } from './hooks/usePopupKeyboardShortcuts'
import { usePromptTestRunner } from './hooks/usePromptTestRunner'
import { useCommandMenuManager } from './hooks/useCommandMenuManager'
import { useContextPopupGlue } from './hooks/useContextPopupGlue'
import { useHistoryPopupGlue } from './hooks/useHistoryPopupGlue'
import { useIntentPopupGlue } from './hooks/useIntentPopupGlue'
import { useMiscPopupDraftHandlers } from './hooks/useMiscPopupDraftHandlers'
import { useModelPopupData } from './hooks/useModelPopupData'
import { useReasoningPopup } from './hooks/useReasoningPopup'
import { useIntentSubmitHandler } from './hooks/useIntentSubmitHandler'
import { useCommandGenerationPipeline } from './hooks/useCommandGenerationPipeline'
import { useSessionCommands } from './hooks/useSessionCommands'
import { useTerminalEffects } from './hooks/useTerminalEffects'
import { usePopupSelectionClamp } from './hooks/usePopupSelectionClamp'
import { useHistoryScrollKeys } from './hooks/useHistoryScrollKeys'
import { useCommandScreenLayout } from './hooks/useCommandScreenLayout'
import { useCommandScreenViewModel } from './hooks/useCommandScreenViewModel'

import { CommandInput } from './components/CommandInput'
import { formatDebugKeyEvent } from './utils/debug-keys'
import { CommandMenuPane } from './components/CommandMenuPane'
import { HistoryPane } from './components/HistoryPane'
import { PopupArea } from './components/PopupArea'

import type { DebugKeyEvent } from '../../components/core/MultilineTextInput'
import { COMMAND_DESCRIPTORS, POPUP_HEIGHTS } from '../../config'
import { parseAbsolutePathFromInput, isCommandInput } from '../../drag-drop-path'
import { useCommandHistory } from '../../hooks/useCommandHistory'
import { usePersistentCommandHistory } from '../../hooks/usePersistentCommandHistory'
import { usePopupManager } from '../../hooks/usePopupManager'
import { formatProviderStatusChip } from '../../provider-chip'
import type { HistoryEntry } from '../../types'
import { useContextDispatch, useContextState } from '../../context-store'
import type { NotifyOptions } from '../../notifier'

const APP_STATIC_ROWS = 7
const COMMAND_SCREEN_OVERHEAD_ROWS = 3
const COMMAND_MENU_HEIGHT = COMMAND_DESCRIPTORS.length + 2
const DEFAULT_TEST_FILE = 'prompt-tests.yaml'

const EMPTY_HISTORY: HistoryEntry[] = []

type CommandScreenProps = {
  interactiveTransportPath?: string | undefined
  onPopupVisibilityChange?: (isOpen: boolean) => void
  commandMenuSignal?: number
  helpOpen?: boolean
  reservedRows?: number
  notify: (message: string, options?: NotifyOptions) => void
}

export type CommandScreenHandle = {
  suppressNextInput: () => void
}

export const CommandScreen = memo(
  forwardRef<CommandScreenHandle, CommandScreenProps>(
    (
      {
        interactiveTransportPath,
        onPopupVisibilityChange,
        commandMenuSignal,
        helpOpen = false,
        reservedRows = 0,
        notify,
      },

      ref,
    ) => {
      const { exit } = useApp()
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
        toggleSmartContext,
        setSmartRoot,
        setMetaInstructions,
        setLastReasoning,
        setLastGeneratedPrompt,
        resetContext,
      } = useContextDispatch()

      const {
        state: screenState,
        setTerminalSize,
        setInputValue,
        setPasteActive,
        setCommandSelectionIndex,
        setDebugKeyLine,
      } = useCommandScreen()

      const terminalRows = screenState.terminalRows
      const terminalColumns = screenState.terminalColumns
      const debugKeyLine = screenState.debugKeyLine
      const inputValue = screenState.inputValue
      const isPasteActive = screenState.isPasteActive
      const commandSelectionIndex = screenState.commandSelectionIndex

      const lastUserIntentRef = useRef<string | null>(null)
      const lastTypedIntentRef = useRef<string>('')
      const debugKeysEnabled = useMemo(() => {
        const value = process.env.PROMPT_MAKER_DEBUG_KEYS
        if (!value) {
          return false
        }
        const normalized = value.trim().toLowerCase()
        return normalized !== '0' && normalized !== 'false'
      }, [])

      const handleDebugKeyEvent = useCallback(
        (event: DebugKeyEvent): void => {
          if (!debugKeysEnabled) {
            return
          }
          setDebugKeyLine(formatDebugKeyEvent(event))
        },
        [debugKeysEnabled, setDebugKeyLine],
      )

      const [intentFilePath, setIntentFilePath] = useState('')
      const [polishEnabled, setPolishEnabled] = useState(false)
      const [copyEnabled, setCopyEnabled] = useState(false)
      const [chatGptEnabled, setChatGptEnabled] = useState(false)
      const [jsonOutputEnabled, setJsonOutputEnabled] = useState(false)
      const suppressNextInputRef = useRef(false)

      const consumeSuppressedTextInputChange = useCallback((): boolean => {
        if (!suppressNextInputRef.current) {
          return false
        }
        suppressNextInputRef.current = false
        return true
      }, [])

      const suppressNextInput = useCallback(() => {
        suppressNextInputRef.current = true
      }, [])

      const updateLastTypedIntent = useCallback((next: string): void => {
        if (isCommandInput(next, fs.existsSync)) {
          return
        }
        lastTypedIntentRef.current = next
      }, [])

      const pushHistoryRef = useRef<(content: string, kind?: HistoryEntry['kind']) => void>(
        () => {},
      )
      const pushHistoryProxy = useCallback(
        (content: string, kind: HistoryEntry['kind'] = 'system') => {
          pushHistoryRef.current(content, kind)
        },
        [],
      )

      const { entries: commandHistoryEntries, addEntry: addCommandHistoryEntry } =
        usePersistentCommandHistory({
          onError: (message) => {
            pushHistoryProxy(`[history] ${message}`, 'system')
          },
        })

      const commandHistoryValues = useMemo(
        () => commandHistoryEntries.map((entry) => entry.value),
        [commandHistoryEntries],
      )

      const closeTestPopupRef = useRef<() => void>(() => {})
      const closeTestPopupProxy = useCallback(() => {
        closeTestPopupRef.current()
      }, [])

      const clearHistoryRef = useRef<() => void>(() => {})
      const clearHistoryProxy = useCallback(() => {
        clearHistoryRef.current()
      }, [])

      const scrollToRef = useRef<(row: number) => void>(() => {})
      const scrollToProxy = useCallback((row: number) => {
        scrollToRef.current(row)
      }, [])

      const { isTestCommandRunning, lastTestFile, runTestsFromCommand, onTestPopupSubmit } =
        usePromptTestRunner({
          defaultTestFile: DEFAULT_TEST_FILE,
          pushHistory: pushHistoryProxy,
          clearHistory: clearHistoryProxy,
          closeTestPopup: closeTestPopupProxy,
          addCommandHistoryEntry,
        })

      const runTestsFromCommandProxy = runTestsFromCommand

      useImperativeHandle(ref, () => ({
        suppressNextInput: () => {
          suppressNextInputRef.current = true
        },
      }))

      const getLatestTypedIntent = useCallback(() => {
        const trimmed = lastTypedIntentRef.current.trim()
        return trimmed.length > 0 ? trimmed : null
      }, [])

      const syncTypedIntentRef = useCallback((intent: string) => {
        lastTypedIntentRef.current = intent
      }, [])

      const trimmedMetaInstructions = metaInstructions.trim()

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

      const { modelOptions, currentModel, selectModel, providerStatuses, updateProviderStatus } =
        useModelProviderState({ pushHistory: pushHistoryProxy })

      const {
        isGenerating,
        runGeneration,
        runSeriesGeneration,
        statusChips,
        isAwaitingRefinement,
        submitRefinement,
        awaitingInteractiveMode,
        tokenUsageRun,
        tokenUsageBreakdown,
      } = useCommandGenerationPipeline({
        pushHistory: pushHistoryProxy,
        notify,
        files,
        urls,
        images,
        videos,
        smartContextEnabled,
        smartContextRoot,
        metaInstructions,
        currentModel,
        interactiveTransportPath,
        terminalColumns,
        polishEnabled,
        jsonOutputEnabled,
        copyEnabled,
        chatGptEnabled,
        isTestCommandRunning,
        onProviderStatusUpdate: updateProviderStatus,
        onReasoningUpdate: setLastReasoning,
        onLastGeneratedPromptUpdate: setLastGeneratedPrompt,
      })

      const {
        popupState,
        setPopupState,
        actions: {
          closePopup,
          handleCommandSelection,
          handleModelPopupSubmit,
          applyToggleSelection,
          handleIntentFileSubmit,
          handleInstructionsSubmit,
          handleSeriesIntentSubmit,
        },
      } = usePopupManager({
        currentModel,
        modelOptions,
        smartContextRoot,
        lastTestFile,
        defaultTestFile: DEFAULT_TEST_FILE,
        interactiveTransportPath,
        isGenerating,
        lastUserIntentRef,
        pushHistory: pushHistoryProxy,
        notify,
        setInputValue,
        runSeriesGeneration,
        runTestsFromCommand: runTestsFromCommandProxy,
        exitApp: exit,
        setCurrentModel: selectModel,
        setPolishEnabled,
        setCopyEnabled,
        setChatGptEnabled,
        setJsonOutputEnabled,
        setIntentFilePath,
        intentFilePath,
        metaInstructions,
        setMetaInstructions,
        polishEnabled,
        copyEnabled,
        chatGptEnabled,
        jsonOutputEnabled,
        getLatestTypedIntent,
        syncTypedIntentRef,
      })

      closeTestPopupRef.current = () => {
        setPopupState((prev) => (prev?.type === 'test' ? null : prev))
      }

      const isPopupOpen = popupState !== null
      const trimmedIntentFilePath = intentFilePath.trim()

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

      const providerChip = useMemo(
        () => formatProviderStatusChip(currentModel, providerStatuses),
        [currentModel, providerStatuses],
      )

      const enhancedStatusChips = useMemo(() => {
        const chips = [...statusChips, providerChip]

        if (trimmedIntentFilePath) {
          chips.push('[intent:file]')
          chips.push(`[file:${path.basename(trimmedIntentFilePath)}]`)
        } else {
          chips.push('[intent:text]')
        }
        if (trimmedMetaInstructions) {
          chips.push('[instr:on]')
        }
        return chips
      }, [providerChip, statusChips, trimmedIntentFilePath, trimmedMetaInstructions])

      useEffect(() => {
        if (!onPopupVisibilityChange) {
          return
        }
        onPopupVisibilityChange(isPopupOpen)
      }, [isPopupOpen, onPopupVisibilityChange])

      useEffect(() => {
        if (!onPopupVisibilityChange) {
          return undefined
        }
        return () => {
          onPopupVisibilityChange(false)
        }
      }, [onPopupVisibilityChange])

      const {
        isCommandMode,
        commandMenuArgsRaw,
        visibleCommands,
        isCommandMenuActive,
        menuHeight,
        selectedCommand,
      } = useCommandMenuManager({
        inputValue,
        existsSync: (candidate: string) => fs.existsSync(candidate),
        popupState,
        helpOpen,
        ...(commandMenuSignal !== undefined ? { commandMenuSignal } : {}),
        commands: COMMAND_DESCRIPTORS,
        commandMenuHeight: COMMAND_MENU_HEIGHT,
        commandSelectionIndex,
        setCommandSelectionIndex,
        setInputValue,
        setPopupState,
        scrollTo: scrollToProxy,
      })

      const {
        overlayHeight,
        inputBarHint,
        inputBarDebugLine,
        isAwaitingTransportInput,
        historyRows,
      } = useCommandScreenLayout({
        terminalRows,
        reservedRows,
        helpOpen,
        isPopupOpen,
        popupState,
        menuHeight,
        popupHeights: POPUP_HEIGHTS,
        inputValue,
        droppedFilePath,
        debugKeysEnabled,
        debugKeyLine,
        interactiveTransportPath,
        isGenerating,
        awaitingInteractiveMode,
        isCommandMenuActive,
        appStaticRows: APP_STATIC_ROWS,
        commandScreenOverheadRows: COMMAND_SCREEN_OVERHEAD_ROWS,
      })

      const inputBarValue = inputValue

      const { history, pushHistory, resetHistory, clearHistory, scroll } = useCommandHistory({
        initialEntries: EMPTY_HISTORY,
        visibleRows: historyRows,
      })
      const { offset: scrollOffset, scrollTo, scrollBy } = scroll

      const { handleNewCommand, handleReuseCommand } = useSessionCommands({
        isGenerating,
        lastGeneratedPrompt,
        resetContext,
        resetHistory,
        scrollTo,
        setInputValue,
        setPopupState,
        setIntentFilePath,
        setMetaInstructions,
        lastUserIntentRef,
        lastTypedIntentRef,
        pushHistory,
      })

      pushHistoryRef.current = pushHistory
      clearHistoryRef.current = clearHistory
      scrollToRef.current = scrollTo

      useTerminalEffects({
        stdout,
        setTerminalSize,
        interactiveTransportPath,
        history,
        pushHistory,
      })

      usePopupSelectionClamp({
        setPopupState,
        filesLength: files.length,
        urlsLength: urls.length,
      })

      useHistoryScrollKeys({
        isCommandMenuActive,
        isPopupOpen,
        helpOpen,
        historyRows,
        scrollBy,
      })

      const {
        filePopupSuggestions,
        filePopupSuggestionSelectionIndex,
        filePopupSuggestionsFocused,
        onFilePopupDraftChange: handleFilePopupDraftChange,
        onAddFile: handleAddFile,
        onRemoveFile: handleRemoveFile,
        onUrlPopupDraftChange: handleUrlPopupDraftChange,
        onAddUrl: handleAddUrl,
        onRemoveUrl: handleRemoveUrl,
        smartPopupSuggestions,
        smartPopupSuggestionSelectionIndex,
        smartPopupSuggestionsFocused,
        onSmartPopupDraftChange: handleSmartPopupDraftChange,
        onSmartToggle: handleSmartToggle,
        onSmartRootSubmit: handleSmartRootSubmit,
      } = useContextPopupGlue({
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
        notify: (message) => notify(message),
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

      const {
        historyPopupItems,
        onHistoryPopupDraftChange: handleHistoryPopupDraftChange,
        onHistoryPopupSubmit: handleHistoryPopupSubmit,
      } = useHistoryPopupGlue({
        popupState,
        setPopupState,
        closePopup,
        setInputValue,
        consumeSuppressedTextInputChange,
        suppressNextInput,
        commandHistoryValues,
      })

      const {
        intentPopupSuggestions,
        intentPopupSuggestionSelectionIndex,
        intentPopupSuggestionsFocused,
        onIntentPopupDraftChange: handleIntentPopupDraftChange,
      } = useIntentPopupGlue({ popupState, setPopupState })

      const { modelPopupOptions, modelPopupRecentCount, modelPopupSelection } = useModelPopupData({
        popupState,
        modelOptions,
      })

      const { reasoningPopupVisibleRows, reasoningPopupLines } = useReasoningPopup({
        lastReasoning,
        terminalColumns,
        popupHeight: POPUP_HEIGHTS.reasoning,
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
        filePopupSuggestions,
        onRemoveFile: handleRemoveFile,
        urls,
        onRemoveUrl: handleRemoveUrl,
        historyPopupItems,
        smartPopupSuggestions,
        smartContextEnabled,
        smartContextRoot,
        onSmartToggle: handleSmartToggle,
        onSmartRootSubmit: handleSmartRootSubmit,
        intentPopupSuggestions,
        onIntentFileSubmit: handleIntentFileSubmit,
        reasoningPopupLines,
        reasoningPopupVisibleRows,
      })

      const handleSubmit = useIntentSubmitHandler({
        popupState,
        isAwaitingRefinement,
        submitRefinement,
        isCommandMenuActive,
        selectedCommandId: selectedCommand?.id ?? null,
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

      const handleSeriesIntentSubmitWithHistory = useCallback(
        (value: string) => {
          const trimmed = value.trim()
          if (trimmed) {
            addCommandHistoryEntry(`/series ${trimmed}`)
          }
          handleSeriesIntentSubmit(value)
        },
        [addCommandHistoryEntry, handleSeriesIntentSubmit],
      )

      const {
        onModelPopupQueryChange: handleModelPopupQueryChange,
        onSeriesDraftChange: handleSeriesPopupDraftChange,
        onInstructionsDraftChange: handleInstructionsPopupDraftChange,
        onTestDraftChange: handleTestPopupDraftChange,
      } = useMiscPopupDraftHandlers({ setPopupState, consumeSuppressedTextInputChange })

      const {
        transportMessage,
        historyPaneProps,
        popupAreaProps,
        commandMenuPaneProps,
        commandInputProps,
      } = useCommandScreenViewModel({
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
        onModelPopupQueryChange: handleModelPopupQueryChange,
        onModelPopupSubmit: handleModelPopupSubmit,
        files,
        filePopupSuggestions,
        filePopupSuggestionSelectionIndex,
        filePopupSuggestionsFocused,
        onFilePopupDraftChange: handleFilePopupDraftChange,
        onAddFile: handleAddFile,
        urls,
        onUrlPopupDraftChange: handleUrlPopupDraftChange,
        onAddUrl: handleAddUrl,
        historyPopupItems,
        onHistoryPopupDraftChange: handleHistoryPopupDraftChange,
        onHistoryPopupSubmit: handleHistoryPopupSubmit,
        intentPopupSuggestions,
        intentPopupSuggestionSelectionIndex,
        intentPopupSuggestionsFocused,
        onIntentPopupDraftChange: handleIntentPopupDraftChange,
        onIntentFileSubmit: handleIntentFileSubmit,
        onInstructionsDraftChange: handleInstructionsPopupDraftChange,
        onInstructionsSubmit: handleInstructionsSubmit,
        isGenerating,
        onSeriesDraftChange: handleSeriesPopupDraftChange,
        onSeriesSubmit: handleSeriesIntentSubmitWithHistory,
        isTestCommandRunning,
        onTestDraftChange: handleTestPopupDraftChange,
        onTestSubmit: onTestPopupSubmit,
        tokenUsageRun,
        tokenUsageBreakdown,
        statusChips: enhancedStatusChips,
        reasoningPopupLines,
        reasoningPopupVisibleRows,
        smartContextEnabled,
        smartContextRoot,
        smartPopupSuggestions,
        smartPopupSuggestionSelectionIndex,
        smartPopupSuggestionsFocused,
        onSmartPopupDraftChange: handleSmartPopupDraftChange,
        onSmartRootSubmit: handleSmartRootSubmit,
        isCommandMenuActive,
        menuHeight,
        visibleCommands,
        commandSelectionIndex,
        inputValue: inputBarValue,
        onInputChange: handleInputChange,
        onInputSubmit: handleSubmit,
        isPasteActive,
        hint: inputBarHint,
        debugLine: inputBarDebugLine,
        tokenLabel,
        debugKeysEnabled,
        onDebugKeyEvent: handleDebugKeyEvent,
        isPopupOpen,
        isAwaitingRefinement,
      })

      return (
        <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
          {transportMessage ? (
            <Box flexShrink={0}>
              <Text color="yellow">{transportMessage}</Text>
            </Box>
          ) : null}

          <HistoryPane {...historyPaneProps} />
          <PopupArea {...popupAreaProps} />
          <CommandMenuPane {...commandMenuPaneProps} />
          <CommandInput {...commandInputProps} />
        </Box>
      )
    },
  ),
)

CommandScreen.displayName = 'CommandScreen'
