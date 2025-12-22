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
import { Box, Text, useApp, useInput, useStdout } from 'ink'
import wrapAnsi from 'wrap-ansi'

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

import { CommandInput } from './components/CommandInput'
import { formatDebugKeyEvent } from './utils/debug-keys'
import { CommandMenuPane } from './components/CommandMenuPane'
import { HistoryPane } from './components/HistoryPane'
import { PopupArea } from './components/PopupArea'

import { estimateInputBarRows } from '../../components/core/InputBar'
import type { DebugKeyEvent } from '../../components/core/MultilineTextInput'
import { COMMAND_DESCRIPTORS, POPUP_HEIGHTS } from '../../config'
import { parseAbsolutePathFromInput, isCommandInput } from '../../drag-drop-path'
import { resolveIntentSource } from '../../intent-source'
import { useCommandHistory } from '../../hooks/useCommandHistory'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { usePersistentCommandHistory } from '../../hooks/usePersistentCommandHistory'
import { useGenerationPipeline } from '../../hooks/useGenerationPipeline'
import { usePopupManager } from '../../hooks/usePopupManager'
import { resolveModelPopupQuery } from '../../model-filter'
import { buildModelPopupOptions } from '../../model-popup-options'
import { formatProviderStatusChip } from '../../provider-chip'
import { getRecentSessionModels } from '../../model-session'
import type { HistoryEntry, PopupKind } from '../../types'
import { useContextDispatch, useContextState } from '../../context-store'
import { planSessionCommand } from '../../new-command'
import type { NotifyOptions } from '../../notifier'
import { createTokenUsageStore } from '../../token-usage-store'

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

      const tokenUsageStoreRef = useRef<ReturnType<typeof createTokenUsageStore> | null>(null)
      if (!tokenUsageStoreRef.current) {
        tokenUsageStoreRef.current = createTokenUsageStore()
      }

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
      } = useGenerationPipeline({
        pushHistory: pushHistoryProxy,
        notify,
        files,
        urls,
        images,
        videos,
        smartContextEnabled,
        smartContextRoot,
        currentModel,
        interactiveTransportPath,
        terminalColumns,
        metaInstructions: trimmedMetaInstructions,
        polishEnabled,
        jsonOutputEnabled,
        copyEnabled,
        chatGptEnabled,
        isTestCommandRunning,
        tokenUsageStore: tokenUsageStoreRef.current,
        onProviderStatusUpdate: updateProviderStatus,
        onReasoningUpdate: setLastReasoning,
        onLastGeneratedPromptUpdate: (prompt: string) => {
          setLastGeneratedPrompt(prompt)
        },
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

      const overlayHeight = helpOpen
        ? 0
        : popupState
          ? POPUP_HEIGHTS[popupState.type as PopupKind]
          : menuHeight

      const inputBarValue = inputValue
      const inputBarHint = useMemo(() => {
        if (isPopupOpen || helpOpen || !droppedFilePath) {
          return undefined
        }
        return `Press Tab to add ${path.basename(droppedFilePath)} to context`
      }, [droppedFilePath, helpOpen, isPopupOpen])

      const inputBarDebugLine = useMemo(() => {
        if (!debugKeysEnabled) {
          return undefined
        }
        return debugKeyLine ?? 'dbg: press Backspace'
      }, [debugKeyLine, debugKeysEnabled])

      const inputBarRows = useMemo(
        () =>
          estimateInputBarRows({
            value: inputBarValue,
            hint: inputBarHint,
            debugLine: inputBarDebugLine,
          }),
        [inputBarDebugLine, inputBarHint, inputBarValue],
      )

      const isAwaitingTransportInput =
        isGenerating && Boolean(interactiveTransportPath) && awaitingInteractiveMode === 'transport'

      const historyRows = useMemo(() => {
        const overlaySpacingRows = !helpOpen && (popupState || isCommandMenuActive) ? 1 : 0
        const baseChromeRows = APP_STATIC_ROWS + COMMAND_SCREEN_OVERHEAD_ROWS + inputBarRows
        const transportHeaderRows = interactiveTransportPath ? 1 : 0
        const transportAwaitingRows = isAwaitingTransportInput ? 1 : 0
        const parentRows = baseChromeRows + transportHeaderRows + transportAwaitingRows
        const availableRows =
          terminalRows - overlayHeight - parentRows - overlaySpacingRows - reservedRows
        return Math.max(1, availableRows)
      }, [
        helpOpen,
        inputBarRows,
        interactiveTransportPath,
        isAwaitingTransportInput,
        isCommandMenuActive,
        overlayHeight,
        popupState,
        reservedRows,
        terminalRows,
      ])

      const { history, pushHistory, resetHistory, clearHistory, scroll } = useCommandHistory({
        initialEntries: EMPTY_HISTORY,
        visibleRows: historyRows,
      })
      const { offset: scrollOffset, scrollTo, scrollBy } = scroll

      const resetSessionState = useCallback(() => {
        resetContext()
        setIntentFilePath('')
        lastUserIntentRef.current = null
        lastTypedIntentRef.current = ''
        setInputValue('')
        setPopupState(null)
        resetHistory()
        scrollTo(Number.MAX_SAFE_INTEGER)
      }, [resetContext, resetHistory, scrollTo, setIntentFilePath, setPopupState])

      const handleNewCommand = useCallback(
        (argsRaw: string) => {
          if (isGenerating) {
            pushHistory('[new] Cannot reset while generation is running.', 'system')
            return
          }

          resetSessionState()
          const plan = planSessionCommand({ commandId: 'new', lastGeneratedPrompt: null })
          pushHistory(plan.message, 'system')

          if (argsRaw.includes('--reuse')) {
            pushHistory('[new] Tip: use /reuse to reuse the last prompt.', 'system')
          }
        },
        [isGenerating, pushHistory, resetSessionState],
      )

      const handleReuseCommand = useCallback(() => {
        if (isGenerating) {
          pushHistory('[reuse] Cannot reset while generation is running.', 'system')
          return
        }

        const previousPrompt = lastGeneratedPrompt
        resetSessionState()
        const plan = planSessionCommand({
          commandId: 'reuse',
          lastGeneratedPrompt: previousPrompt,
        })

        if (plan.type === 'reset-and-load-meta') {
          setMetaInstructions(plan.metaInstructions)
        }

        pushHistory(plan.message, 'system')
      }, [isGenerating, lastGeneratedPrompt, pushHistory, resetSessionState, setMetaInstructions])

      pushHistoryRef.current = pushHistory
      clearHistoryRef.current = clearHistory
      scrollToRef.current = scrollTo

      useEffect(() => {
        if (!stdout) {
          return undefined
        }
        stdout.write('\x1bc')
        stdout.write('\x1b[?2004h')
        return () => {
          stdout.write('\x1b[?2004l')
        }
      }, [stdout])

      useEffect(() => {
        if (!interactiveTransportPath) {
          return
        }
        const transportLine = `Interactive transport listening on ${interactiveTransportPath}`
        if (history.some((entry) => entry.content === transportLine)) {
          return
        }
        pushHistory(transportLine, 'system')
      }, [history, interactiveTransportPath, pushHistory])

      useEffect(() => {
        if (!stdout) {
          return undefined
        }
        const handleResize = (): void => {
          setTerminalSize(stdout.rows, stdout.columns)
        }
        stdout.on('resize', handleResize)
        return () => {
          stdout.off('resize', handleResize)
        }
      }, [setTerminalSize, stdout])

      useEffect(() => {
        setPopupState((prev) => {
          if (!prev) {
            return prev
          }
          if (prev.type === 'file') {
            const maxIndex = Math.max(files.length - 1, 0)
            const nextIndex = Math.min(prev.selectionIndex, maxIndex)
            return prev.selectionIndex === nextIndex ? prev : { ...prev, selectionIndex: nextIndex }
          }
          if (prev.type === 'url') {
            const maxIndex = Math.max(urls.length - 1, 0)
            const nextIndex = Math.min(prev.selectionIndex, maxIndex)
            return prev.selectionIndex === nextIndex ? prev : { ...prev, selectionIndex: nextIndex }
          }
          return prev
        })
      }, [files.length, urls.length])

      useInput(
        (_, key) => {
          if (key.upArrow) {
            scrollBy(-1)
            return
          }
          if (key.downArrow) {
            scrollBy(1)
            return
          }
          if (key.pageUp) {
            scrollBy(-historyRows)
            return
          }
          if (key.pageDown) {
            scrollBy(historyRows)
          }
        },
        { isActive: !isCommandMenuActive && !isPopupOpen && !helpOpen },
      )

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

      const modelPopupQuery = popupState?.type === 'model' ? popupState.query : ''
      const debouncedModelPopupQuery = useDebouncedValue(modelPopupQuery, 75)
      const effectiveModelPopupQuery = resolveModelPopupQuery(
        modelPopupQuery,
        debouncedModelPopupQuery,
      )

      const modelPopupData = useMemo(() => {
        if (popupState?.type !== 'model') {
          return { options: [], recentCount: 0 }
        }

        const recentModelIds = getRecentSessionModels()
        return buildModelPopupOptions({
          query: effectiveModelPopupQuery,
          modelOptions,
          recentModelIds,
        })
      }, [effectiveModelPopupQuery, modelOptions, popupState?.type])

      const modelPopupOptions = modelPopupData.options
      const modelPopupRecentCount = modelPopupData.recentCount

      const reasoningPopupVisibleRows = Math.max(1, POPUP_HEIGHTS.reasoning - 5)

      const reasoningPopupLines = useMemo(() => {
        const reasoning = lastReasoning?.trim() ?? ''
        if (!reasoning) {
          return []
        }

        const entries: HistoryEntry[] = []
        const wrapWidth = Math.max(40, terminalColumns - 6)
        let entryIndex = 0

        reasoning.split('\n').forEach((line) => {
          const wrapped = wrapAnsi(line, wrapWidth, { trim: false, hard: true })
          wrapped.split('\n').forEach((wrappedLine) => {
            entries.push({
              id: `reasoning-${entryIndex}`,
              content: wrappedLine,
              kind: 'system',
            })
            entryIndex += 1
          })
        })

        return entries
      }, [lastReasoning, terminalColumns])

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

      const handleSubmit = useCallback(
        (value: string) => {
          const expandedValue = expandInputForSubmit(value)

          if (isAwaitingRefinement) {
            submitRefinement(expandedValue)
            setInputValue('')
            return
          }

          if (popupState) {
            return
          }

          if (isCommandMenuActive) {
            if (selectedCommand) {
              const trimmedArgs = commandMenuArgsRaw.trim()
              addCommandHistoryEntry(
                `/${selectedCommand.id}${trimmedArgs ? ` ${trimmedArgs}` : ''}`,
              )
              if (selectedCommand.id === 'new') {
                handleNewCommand(commandMenuArgsRaw)
              } else if (selectedCommand.id === 'reuse') {
                handleReuseCommand()
              } else {
                handleCommandSelection(selectedCommand.id, commandMenuArgsRaw)
              }
            }
            setInputValue('')
            return
          }

          if (isCommandMode) {
            setInputValue('')
            return
          }

          const trimmed = expandedValue.trim()
          const intentSource = resolveIntentSource(trimmed, intentFilePath)
          if (intentSource.kind === 'empty') {
            setInputValue('')
            return
          }
          if (isGenerating) {
            pushHistory('Generation already running. Please wait.', 'system')
            setInputValue('')
            return
          }
          if (intentSource.kind === 'file') {
            pushHistory(`> [intent file] ${intentSource.intentFile}`, 'user')
            if (trimmed.length > 0) {
              pushHistory('Typed intent ignored because an intent file is active.', 'system')
            }
            setInputValue('')
            void runGeneration({ intentFile: intentSource.intentFile })
            return
          }
          addCommandHistoryEntry(intentSource.intent)
          pushHistory(`> ${intentSource.intent}`, 'user')
          lastUserIntentRef.current = intentSource.intent
          setInputValue('')
          void runGeneration({ intent: intentSource.intent })
        },
        [
          addCommandHistoryEntry,
          handleCommandSelection,
          isCommandMenuActive,
          isCommandMode,
          isAwaitingRefinement,
          submitRefinement,
          popupState,
          selectedCommand,
          isGenerating,
          runGeneration,
          pushHistory,
          commandMenuArgsRaw,
          intentFilePath,
        ],
      )

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

      const modelPopupSelection =
        popupState?.type === 'model'
          ? Math.min(popupState.selectionIndex, Math.max(modelPopupOptions.length - 1, 0))
          : 0

      return (
        <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
          {isAwaitingTransportInput ? (
            <Box flexShrink={0}>
              <Text color="yellow">
                Waiting for interactive transport input (send refine/finish).
              </Text>
            </Box>
          ) : null}

          <HistoryPane lines={history} visibleRows={historyRows} scrollOffset={scrollOffset} />

          <PopupArea
            popupState={popupState}
            helpOpen={helpOpen}
            overlayHeight={overlayHeight}
            modelPopupOptions={modelPopupOptions}
            modelPopupSelection={modelPopupSelection}
            modelPopupRecentCount={modelPopupRecentCount}
            providerStatuses={providerStatuses}
            onModelPopupQueryChange={handleModelPopupQueryChange}
            onModelPopupSubmit={handleModelPopupSubmit}
            files={files}
            filePopupSuggestions={filePopupSuggestions}
            filePopupSuggestionSelectionIndex={filePopupSuggestionSelectionIndex}
            filePopupSuggestionsFocused={filePopupSuggestionsFocused}
            onFilePopupDraftChange={handleFilePopupDraftChange}
            onAddFile={handleAddFile}
            urls={urls}
            onUrlPopupDraftChange={handleUrlPopupDraftChange}
            onAddUrl={handleAddUrl}
            historyPopupItems={historyPopupItems}
            onHistoryPopupDraftChange={handleHistoryPopupDraftChange}
            onHistoryPopupSubmit={handleHistoryPopupSubmit}
            intentPopupSuggestions={intentPopupSuggestions}
            intentPopupSuggestionSelectionIndex={intentPopupSuggestionSelectionIndex}
            intentPopupSuggestionsFocused={intentPopupSuggestionsFocused}
            onIntentPopupDraftChange={handleIntentPopupDraftChange}
            onIntentFileSubmit={handleIntentFileSubmit}
            onInstructionsDraftChange={handleInstructionsPopupDraftChange}
            onInstructionsSubmit={handleInstructionsSubmit}
            isGenerating={isGenerating}
            onSeriesDraftChange={handleSeriesPopupDraftChange}
            onSeriesSubmit={handleSeriesIntentSubmitWithHistory}
            isTestCommandRunning={isTestCommandRunning}
            onTestDraftChange={handleTestPopupDraftChange}
            onTestSubmit={onTestPopupSubmit}
            tokenUsageRun={tokenUsageStoreRef.current?.getLatestRun() ?? null}
            tokenUsageBreakdown={tokenUsageStoreRef.current?.getLatestBreakdown() ?? null}
            statusChips={enhancedStatusChips}
            reasoningPopupLines={reasoningPopupLines}
            reasoningPopupVisibleRows={reasoningPopupVisibleRows}
            smartContextEnabled={smartContextEnabled}
            smartContextRoot={smartContextRoot}
            smartPopupSuggestions={smartPopupSuggestions}
            smartPopupSuggestionSelectionIndex={smartPopupSuggestionSelectionIndex}
            smartPopupSuggestionsFocused={smartPopupSuggestionsFocused}
            onSmartPopupDraftChange={handleSmartPopupDraftChange}
            onSmartRootSubmit={handleSmartRootSubmit}
          />

          <CommandMenuPane
            isActive={isCommandMenuActive}
            height={menuHeight}
            commands={visibleCommands}
            selectedIndex={commandSelectionIndex}
          />

          <CommandInput
            value={inputBarValue}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            mode={isAwaitingRefinement ? 'refinement' : 'intent'}
            isDisabled={isPopupOpen || helpOpen}
            isPasteActive={isPasteActive}
            statusChips={enhancedStatusChips}
            hint={inputBarHint}
            debugLine={inputBarDebugLine}
            tokenLabel={tokenLabel}
            onDebugKeyEvent={debugKeysEnabled ? handleDebugKeyEvent : undefined}
            placeholder={
              isAwaitingRefinement
                ? 'Describe refinement (or empty to finish)...'
                : 'Describe your goal or type /command'
            }
          />
        </Box>
      )
    },
  ),
)

CommandScreen.displayName = 'CommandScreen'
