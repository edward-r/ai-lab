/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable react-hooks/exhaustive-deps */
import path from 'node:path'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Box, useApp, useInput, useStdout } from 'ink'

import { InputBar } from './components/core/InputBar'
import { CommandMenu } from './components/core/CommandMenu'
import { ScrollableOutput } from './components/core/ScrollableOutput'
import { ListPopup } from './components/popups/ListPopup'
import { ModelPopup } from './components/popups/ModelPopup'
import { SmartPopup } from './components/popups/SmartPopup'
import { TestPopup } from './components/popups/TestPopup'
import { TogglePopup } from './components/popups/TogglePopup'
import { IntentFilePopup } from './components/popups/IntentFilePopup'
import { SeriesIntentPopup } from './components/popups/SeriesIntentPopup'
import { COMMAND_DESCRIPTORS, MODEL_OPTIONS, POPUP_HEIGHTS } from './config'
import { filterFileSuggestions } from './file-suggestions'
import { resolveIntentSource } from './intent-source'
import { useCommandHistory } from './hooks/useCommandHistory'
import { useGenerationPipeline } from './hooks/useGenerationPipeline'
import { usePopupManager } from './hooks/usePopupManager'
import type { HistoryEntry, ModelOption, PopupKind } from './types'
import { runPromptTestSuite, type PromptTestRunReporter } from '../test-command'
import { useContextDispatch, useContextState } from './context-store'

const APP_STATIC_ROWS = 7
const INPUT_BAR_ROWS = 5
const COMMAND_SCREEN_STATIC_ROWS = INPUT_BAR_ROWS + 3
const COMMAND_MENU_HEIGHT = COMMAND_DESCRIPTORS.length + 2
const DEFAULT_TEST_FILE = 'prompt-tests.yaml'

const filterModelOptions = (query: string): ModelOption[] => {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) {
    return [...MODEL_OPTIONS]
  }
  return MODEL_OPTIONS.filter(
    (option) =>
      option.id.toLowerCase().includes(trimmed) || option.label.toLowerCase().includes(trimmed),
  )
}

const WELCOME_LINES = [
  'Welcome to the Prompt Maker command palette preview.',
  'Type natural language requests or start a command with /.',
  'Press Enter to log input; arrow keys scroll history.',
  'Use /intent to load intent text from a file (blank clears).',
  'Tip: Press Tab to open the Series intent popup.',
]

const WELCOME_HISTORY: HistoryEntry[] = WELCOME_LINES.map((line, index) => ({
  id: `welcome-${index}`,
  content: line,
  kind: 'system',
}))

type CommandScreenProps = {
  interactiveTransportPath?: string | undefined
  onPopupVisibilityChange?: (isOpen: boolean) => void
  commandMenuSignal?: number
}

export type CommandScreenHandle = {
  suppressNextInput: () => void
}

export const CommandScreen = forwardRef<CommandScreenHandle, CommandScreenProps>(
  ({ interactiveTransportPath, onPopupVisibilityChange, commandMenuSignal }, ref) => {
    const { exit } = useApp()
    const { stdout } = useStdout()
    const { files, urls, images, videos, smartContextEnabled, smartContextRoot } = useContextState()
    const { addFile, removeFile, addUrl, removeUrl, toggleSmartContext, setSmartRoot } =
      useContextDispatch()

    const [terminalRows, setTerminalRows] = useState(stdout?.rows ?? 24)
    const [terminalColumns, setTerminalColumns] = useState(stdout?.columns ?? 80)
    const lastUserIntentRef = useRef<string | null>(null)
    const lastTypedIntentRef = useRef<string>('')
    const [inputValue, setInputValue] = useState('')
    const [commandSelectionIndex, setCommandSelectionIndex] = useState(0)
    const [currentModel, setCurrentModel] = useState<ModelOption['id']>('gpt-4o-mini')
    const [intentFilePath, setIntentFilePath] = useState('')
    const [polishEnabled, setPolishEnabled] = useState(false)
    const [copyEnabled, setCopyEnabled] = useState(false)
    const [chatGptEnabled, setChatGptEnabled] = useState(false)
    const [jsonOutputEnabled, setJsonOutputEnabled] = useState(false)
    const [isTestCommandRunning, setIsTestCommandRunning] = useState(false)
    const [lastTestFile, setLastTestFile] = useState<string | null>(null)
    const suppressNextInputRef = useRef(false)

    const pushHistoryRef = useRef<(content: string, kind?: HistoryEntry['kind']) => void>(() => {})
    const pushHistoryProxy = useCallback(
      (content: string, kind: HistoryEntry['kind'] = 'system') => {
        pushHistoryRef.current(content, kind)
      },
      [],
    )

    const runTestsFromCommandRef = useRef<(value: string) => void>(() => {})
    const runTestsFromCommandProxy = useCallback((value: string) => {
      runTestsFromCommandRef.current(value)
    }, [])

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

    const trimmedInput = inputValue.trimStart()
    const isCommandMode = trimmedInput.startsWith('/')
    const commandQuery = isCommandMode ? trimmedInput.slice(1).trimStart() : ''
    const parsedCommand = useMemo<{ keyword: string; args: string }>(() => {
      if (!commandQuery) {
        return { keyword: '', args: '' }
      }

      const parts = commandQuery.split(/\s+/).filter((part) => part.length > 0)
      if (parts.length === 0) {
        return { keyword: '', args: '' }
      }
      const keyword = parts[0] ?? ''
      const rest = parts.slice(1)
      return { keyword, args: rest.join(' ') }
    }, [commandQuery])

    const normalizedQuery = parsedCommand.keyword.toLowerCase()
    const commandArgsRaw = parsedCommand.args

    const {
      isGenerating,
      runGeneration,
      runSeriesGeneration,
      statusChips,
      isAwaitingRefinement,
      submitRefinement,
    } = useGenerationPipeline({
      pushHistory: pushHistoryProxy,
      files,
      urls,
      images,
      videos,
      smartContextEnabled,
      smartContextRoot,
      currentModel,
      interactiveTransportPath,
      terminalColumns,
      polishEnabled,
      jsonOutputEnabled,
      copyEnabled,
      chatGptEnabled,
      isTestCommandRunning,
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
        handleSeriesIntentSubmit,
      },
    } = usePopupManager({
      currentModel,
      smartContextRoot,
      lastTestFile,
      defaultTestFile: DEFAULT_TEST_FILE,
      interactiveTransportPath,
      isGenerating,
      lastUserIntentRef,
      pushHistory: pushHistoryProxy,
      setInputValue,
      runSeriesGeneration,
      runTestsFromCommand: runTestsFromCommandProxy,
      exitApp: exit,
      setCurrentModel,
      setPolishEnabled,
      setCopyEnabled,
      setChatGptEnabled,
      setJsonOutputEnabled,
      setIntentFilePath,
      intentFilePath,
      polishEnabled,
      copyEnabled,
      chatGptEnabled,
      jsonOutputEnabled,
      getLatestTypedIntent,
      syncTypedIntentRef,
    })

    const isPopupOpen = popupState !== null
    const trimmedIntentFilePath = intentFilePath.trim()

    const enhancedStatusChips = useMemo(() => {
      const chips = [...statusChips]
      if (trimmedIntentFilePath) {
        chips.push('[intent:file]')
        chips.push(`[file:${path.basename(trimmedIntentFilePath)}]`)
      } else {
        chips.push('[intent:text]')
      }
      return chips
    }, [statusChips, trimmedIntentFilePath])

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

    const commandMatches = useMemo(() => {
      if (!isCommandMode) {
        return COMMAND_DESCRIPTORS
      }
      if (!normalizedQuery) {
        return COMMAND_DESCRIPTORS
      }
      const filtered = COMMAND_DESCRIPTORS.filter(
        (command) =>
          command.id.startsWith(normalizedQuery) ||
          command.label.toLowerCase().startsWith(normalizedQuery),
      )
      return filtered.length > 0 ? filtered : COMMAND_DESCRIPTORS
    }, [isCommandMode, normalizedQuery])

    const visibleCommands = commandMatches
    const isCommandMenuActive = isCommandMode && !isPopupOpen
    const menuHeight = isCommandMenuActive
      ? Math.min(COMMAND_MENU_HEIGHT, Math.max(visibleCommands.length, 1) + 2)
      : 0
    const overlayHeight = popupState ? POPUP_HEIGHTS[popupState.type as PopupKind] : menuHeight
    const historyRows = useMemo(() => {
      const overlaySpacingRows = popupState || isCommandMenuActive ? 1 : 0
      const baseChromeRows = APP_STATIC_ROWS + COMMAND_SCREEN_STATIC_ROWS
      const parentRows = interactiveTransportPath ? baseChromeRows + 1 : baseChromeRows
      const availableRows = terminalRows - overlayHeight - parentRows - overlaySpacingRows
      return Math.max(1, availableRows)
    }, [interactiveTransportPath, isCommandMenuActive, overlayHeight, popupState, terminalRows])

    const { history, pushHistory, scroll } = useCommandHistory({
      initialEntries: WELCOME_HISTORY,
      visibleRows: historyRows,
    })
    const { offset: scrollOffset, scrollTo, scrollBy } = scroll

    useEffect(() => {
      pushHistoryRef.current = pushHistory
    }, [pushHistory])

    useEffect(() => {
      setCommandSelectionIndex(0)
    }, [normalizedQuery, isCommandMode])

    useEffect(() => {
      if (!commandMenuSignal) {
        return
      }
      setPopupState(null)
      setInputValue('/')
      setCommandSelectionIndex(0)
      scrollTo(Number.MAX_SAFE_INTEGER)
    }, [commandMenuSignal, scrollTo])

    useEffect(() => {
      if (!commandMatches.length) {
        setCommandSelectionIndex(0)
        return
      }
      setCommandSelectionIndex((prev) => Math.min(prev, commandMatches.length - 1))
    }, [commandMatches.length])

    useEffect(() => {
      if (!stdout) {
        return
      }
      stdout.write('\x1bc')
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
        setTerminalRows(stdout.rows)
        setTerminalColumns(stdout.columns)
      }
      stdout.on('resize', handleResize)
      return () => {
        stdout.off('resize', handleResize)
      }
    }, [stdout])

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
      { isActive: !isCommandMenuActive && !isPopupOpen },
    )

    useInput(
      (_input, key) => {
        if (!isCommandMenuActive || !visibleCommands.length) {
          return
        }
        if (key.upArrow) {
          setCommandSelectionIndex(
            (prev) => (prev - 1 + visibleCommands.length) % visibleCommands.length,
          )
          return
        }
        if (key.downArrow) {
          setCommandSelectionIndex((prev) => (prev + 1) % visibleCommands.length)
          return
        }
        if (key.escape) {
          setInputValue('')
        }
      },
      { isActive: isCommandMenuActive },
    )

    useInput(
      (_input, key) => {
        if (popupState || isCommandMenuActive || isCommandMode) {
          return
        }
        if (!key.tab || key.shift) {
          return
        }
        if (isGenerating) {
          pushHistory('Generation already running. Please wait.', 'system')
          return
        }
        handleCommandSelection('series', inputValue)
      },
      { isActive: !isPopupOpen },
    )

    const selectedCommand =
      isCommandMenuActive && visibleCommands.length > 0
        ? visibleCommands[Math.min(commandSelectionIndex, visibleCommands.length - 1)]
        : undefined

    const handleAddFile = useCallback(
      (value: string) => {
        const trimmed = value.trim()
        if (!trimmed) {
          return
        }
        addFile(trimmed)
        pushHistory(`Context file added: ${trimmed}`)
        setPopupState((prev) =>
          prev?.type === 'file'
            ? {
                ...prev,
                draft: '',
                selectionIndex: Math.max(files.length, 0),
                suggestedFocused: false,
                suggestedSelectionIndex: 0,
              }
            : prev,
        )
      },
      [addFile, files.length, pushHistory, setPopupState],
    )

    const handleRemoveFile = useCallback(
      (index: number) => {
        if (index < 0 || index >= files.length) {
          return
        }
        const target = files[index]
        removeFile(index)
        pushHistory(`Context file removed: ${target}`)
      },
      [files, removeFile, pushHistory],
    )

    const handleAddUrl = useCallback(
      (value: string) => {
        const trimmed = value.trim()
        if (!trimmed) {
          return
        }
        addUrl(trimmed)
        pushHistory(`Context URL added: ${trimmed}`)
        setPopupState((prev) =>
          prev?.type === 'url'
            ? { ...prev, draft: '', selectionIndex: Math.max(urls.length, 0) }
            : prev,
        )
      },
      [addUrl, urls.length, pushHistory, setPopupState],
    )

    const handleRemoveUrl = useCallback(
      (index: number) => {
        if (index < 0 || index >= urls.length) {
          return
        }
        const target = urls[index]
        removeUrl(index)
        pushHistory(`Context URL removed: ${target}`)
      },
      [urls, removeUrl, pushHistory],
    )

    const handleSmartToggle = useCallback(
      (nextEnabled: boolean) => {
        if (smartContextEnabled === nextEnabled) {
          return
        }
        toggleSmartContext()
        pushHistory(`Smart context ${nextEnabled ? 'enabled' : 'disabled'}`)
      },
      [smartContextEnabled, toggleSmartContext, pushHistory],
    )

    const handleSmartRootSubmit = useCallback(
      (value: string) => {
        const trimmed = value.trim()
        setSmartRoot(trimmed)
        pushHistory(trimmed ? `Smart context root set to ${trimmed}` : 'Smart context root cleared')
        setPopupState((prev) => (prev?.type === 'smart' ? { ...prev, draft: trimmed } : prev))
      },
      [setSmartRoot, pushHistory],
    )

    const filePopupDraft = popupState?.type === 'file' ? popupState.draft : ''
    const filePopupSuggestedItems = popupState?.type === 'file' ? popupState.suggestedItems : []
    const filePopupSuggestedFocused =
      popupState?.type === 'file' ? popupState.suggestedFocused : false
    const filePopupSuggestedSelectionIndex =
      popupState?.type === 'file' ? popupState.suggestedSelectionIndex : 0

    const filePopupSuggestions = useMemo(() => {
      if (!filePopupSuggestedItems.length) {
        return []
      }
      return filterFileSuggestions({
        suggestions: filePopupSuggestedItems,
        query: filePopupDraft,
        exclude: files,
      })
    }, [filePopupDraft, filePopupSuggestedItems, files])

    const filePopupSuggestionSelectionIndex = Math.min(
      filePopupSuggestedSelectionIndex,
      Math.max(filePopupSuggestions.length - 1, 0),
    )

    const filePopupSuggestionsFocused = filePopupSuggestedFocused && filePopupSuggestions.length > 0

    useEffect(() => {
      if (popupState?.type !== 'file') {
        return
      }
      if (!filePopupSuggestedFocused) {
        return
      }
      if (filePopupSuggestions.length > 0) {
        return
      }
      setPopupState((prev) =>
        prev?.type === 'file'
          ? { ...prev, suggestedFocused: false, suggestedSelectionIndex: 0 }
          : prev,
      )
    }, [filePopupSuggestedFocused, filePopupSuggestions.length, popupState?.type, setPopupState])

    useInput(
      (input, key) => {
        if (!popupState) {
          return
        }

        if (popupState.type === 'model') {
          const options = filterModelOptions(popupState.query)
          if (key.upArrow && options.length > 0) {
            setPopupState((prev) =>
              prev?.type === 'model'
                ? {
                    ...prev,
                    selectionIndex: (prev.selectionIndex - 1 + options.length) % options.length,
                  }
                : prev,
            )
            return
          }
          if (key.downArrow && options.length > 0) {
            setPopupState((prev) =>
              prev?.type === 'model'
                ? {
                    ...prev,
                    selectionIndex: (prev.selectionIndex + 1) % options.length,
                  }
                : prev,
            )
            return
          }
          if (key.escape) {
            closePopup()
            return
          }
          if (key.return) {
            handleModelPopupSubmit(options[popupState.selectionIndex])
          }
          return
        }

        if (popupState.type === 'toggle') {
          const options = ['On', 'Off']
          if (key.leftArrow || key.upArrow) {
            setPopupState((prev) =>
              prev?.type === 'toggle'
                ? {
                    ...prev,
                    selectionIndex: (prev.selectionIndex - 1 + options.length) % options.length,
                  }
                : prev,
            )
            return
          }
          if (key.rightArrow || key.downArrow) {
            setPopupState((prev) =>
              prev?.type === 'toggle'
                ? {
                    ...prev,
                    selectionIndex: (prev.selectionIndex + 1) % options.length,
                  }
                : prev,
            )
            return
          }
          if (key.escape) {
            closePopup()
            return
          }
          if (key.return) {
            applyToggleSelection(popupState.field, popupState.selectionIndex === 0)
          }
          return
        }

        if (popupState.type === 'file') {
          const hasSuggestions = filePopupSuggestions.length > 0
          const effectiveSuggestedIndex = Math.min(
            popupState.suggestedSelectionIndex,
            Math.max(filePopupSuggestions.length - 1, 0),
          )

          if (key.escape) {
            closePopup()
            return
          }

          if (popupState.suggestedFocused && hasSuggestions) {
            if (key.tab && !key.shift) {
              setPopupState((prev) =>
                prev?.type === 'file' ? { ...prev, suggestedFocused: false } : prev,
              )
              return
            }
            if (key.upArrow) {
              if (effectiveSuggestedIndex === 0) {
                setPopupState((prev) =>
                  prev?.type === 'file'
                    ? { ...prev, suggestedFocused: false, suggestedSelectionIndex: 0 }
                    : prev,
                )
                return
              }
              setPopupState((prev) =>
                prev?.type === 'file'
                  ? {
                      ...prev,
                      suggestedSelectionIndex: Math.max(prev.suggestedSelectionIndex - 1, 0),
                    }
                  : prev,
              )
              return
            }
            if (key.downArrow) {
              setPopupState((prev) =>
                prev?.type === 'file'
                  ? {
                      ...prev,
                      suggestedSelectionIndex: Math.min(
                        prev.suggestedSelectionIndex + 1,
                        Math.max(filePopupSuggestions.length - 1, 0),
                      ),
                    }
                  : prev,
              )
              return
            }
            if (key.return) {
              const selection = filePopupSuggestions[effectiveSuggestedIndex]
              setPopupState((prev) =>
                prev?.type === 'file'
                  ? {
                      ...prev,
                      draft: selection ?? prev.draft,
                      suggestedFocused: false,
                    }
                  : prev,
              )
              return
            }
            return
          }

          if (key.tab && !key.shift && hasSuggestions) {
            setPopupState((prev) =>
              prev?.type === 'file'
                ? {
                    ...prev,
                    suggestedFocused: true,
                    suggestedSelectionIndex: 0,
                  }
                : prev,
            )
            return
          }

          if (
            key.downArrow &&
            hasSuggestions &&
            (files.length === 0 || popupState.draft.trim().length > 0)
          ) {
            setPopupState((prev) =>
              prev?.type === 'file'
                ? {
                    ...prev,
                    suggestedFocused: true,
                    suggestedSelectionIndex: 0,
                  }
                : prev,
            )
            return
          }

          if (key.upArrow && files.length > 0) {
            setPopupState((prev) =>
              prev?.type === 'file'
                ? { ...prev, selectionIndex: Math.max(prev.selectionIndex - 1, 0) }
                : prev,
            )
            return
          }
          if (key.downArrow && files.length > 0) {
            setPopupState((prev) =>
              prev?.type === 'file'
                ? {
                    ...prev,
                    selectionIndex: Math.min(prev.selectionIndex + 1, files.length - 1),
                  }
                : prev,
            )
            return
          }
          if ((key.delete || key.backspace) && files.length > 0) {
            handleRemoveFile(popupState.selectionIndex)
            return
          }
          return
        }

        if (popupState.type === 'url') {
          if (key.upArrow && urls.length > 0) {
            setPopupState((prev) =>
              prev?.type === 'url'
                ? { ...prev, selectionIndex: Math.max(prev.selectionIndex - 1, 0) }
                : prev,
            )
            return
          }
          if (key.downArrow && urls.length > 0) {
            setPopupState((prev) =>
              prev?.type === 'url'
                ? {
                    ...prev,
                    selectionIndex: Math.min(prev.selectionIndex + 1, urls.length - 1),
                  }
                : prev,
            )
            return
          }
          if ((key.delete || key.backspace) && urls.length > 0) {
            handleRemoveUrl(popupState.selectionIndex)
            return
          }
          if (key.escape) {
            closePopup()
          }
          return
        }

        if (popupState.type === 'smart') {
          if (typeof input === 'string' && input.toLowerCase() === 't') {
            handleSmartToggle(!smartContextEnabled)
            return
          }
          if (key.escape) {
            closePopup()
            return
          }
          return
        }

        if (popupState.type === 'intent') {
          if (key.escape) {
            closePopup()
          }
          return
        }

        if (popupState.type === 'series') {
          if (key.escape) {
            closePopup()
          }
          return
        }

        if (popupState.type === 'test') {
          if (key.escape) {
            closePopup()
          }
        }
      },
      { isActive: isPopupOpen },
    )

    const runTestsFromCommand = useCallback(
      async (fileArg?: string) => {
        const normalized = fileArg?.trim() ?? ''
        const targetFile = normalized || lastTestFile || DEFAULT_TEST_FILE
        if (!targetFile) {
          pushHistory('No test file specified. Use /test <file>.', 'system')
          return
        }
        if (isTestCommandRunning) {
          pushHistory('Test run already in progress. Please wait.', 'system')
          return
        }
        const resolvedPath = path.resolve(process.cwd(), targetFile)
        setIsTestCommandRunning(true)
        setLastTestFile(targetFile)
        setPopupState((prev) => (prev?.type === 'test' ? null : prev))
        pushHistory(`[tests] Running ${resolvedPath}`, 'progress')
        try {
          const reporter: PromptTestRunReporter = {
            onSuiteLoaded: (suite, loadedPath) => {
              pushHistory(
                `[tests] Loaded ${suite.tests.length} test(s) from ${loadedPath}`,
                'progress',
              )
            },
            onTestStart: (ordinal, test) => {
              pushHistory(`[tests] (${ordinal}) ${test.name}`, 'progress')
            },
            onTestComplete: (_ordinal, result) => {
              const status = result.pass ? 'PASS' : 'FAIL'
              const reason = result.reason ? ` · ${result.reason}` : ''
              pushHistory(
                `[tests] ${status} ${result.name}${reason}`,
                result.pass ? 'system' : 'progress',
              )
            },
            onComplete: (results) => {
              const passed = results.filter((result) => result.pass).length
              const failed = results.length - passed
              const kind: HistoryEntry['kind'] = failed > 0 ? 'progress' : 'system'
              pushHistory(`[tests] Summary · passed ${passed} · failed ${failed}`, kind)
            },
          }
          await runPromptTestSuite(resolvedPath, { reporter })
          pushHistory('[tests] Complete.', 'progress')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown test execution error.'
          pushHistory(`[tests] Failed: ${message}`, 'progress')
        } finally {
          setIsTestCommandRunning(false)
        }
      },
      [isTestCommandRunning, lastTestFile, pushHistory],
    )

    const handleTestPopupSubmit = useCallback(
      (value: string) => {
        void runTestsFromCommand(value)
      },
      [runTestsFromCommand],
    )

    useEffect(() => {
      runTestsFromCommandRef.current = runTestsFromCommand
    }, [runTestsFromCommand])

    const handleSubmit = useCallback(
      (value: string) => {
        if (isAwaitingRefinement) {
          submitRefinement(value)
          setInputValue('')
          return
        }

        if (popupState) {
          return
        }

        if (isCommandMenuActive) {
          if (selectedCommand) {
            handleCommandSelection(selectedCommand.id, commandArgsRaw)
          }
          setInputValue('')
          return
        }

        if (isCommandMode) {
          setInputValue('')
          return
        }

        const trimmed = value.trim()
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
        pushHistory(`> ${intentSource.intent}`, 'user')
        lastUserIntentRef.current = intentSource.intent
        setInputValue('')
        void runGeneration({ intent: intentSource.intent })
      },
      [
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
        commandArgsRaw,
        intentFilePath,
      ],
    )

    const handleInputChange = useCallback(
      (next: string) => {
        if (popupState) {
          return
        }
        if (suppressNextInputRef.current) {
          suppressNextInputRef.current = false
          return
        }
        setInputValue(next)
        const trimmedStart = next.trimStart()
        if (trimmedStart.startsWith('/')) {
          return
        }
        lastTypedIntentRef.current = next
      },
      [popupState, setInputValue],
    )

    const modelPopupOptions =
      popupState?.type === 'model' ? filterModelOptions(popupState.query) : []

    const modelPopupSelection =
      popupState?.type === 'model'
        ? Math.min(popupState.selectionIndex, Math.max(modelPopupOptions.length - 1, 0))
        : 0

    return (
      <Box flexDirection="column" flexGrow={1} height="100%" paddingX={1} paddingY={1}>
        <Box flexDirection="column" flexGrow={1} height={historyRows} marginBottom={1}>
          <ScrollableOutput lines={history} visibleRows={historyRows} scrollOffset={scrollOffset} />
        </Box>
        {popupState ? (
          <Box marginBottom={1}>
            {popupState.type === 'model' ? (
              <ModelPopup
                query={popupState.query}
                options={modelPopupOptions}
                selectedIndex={modelPopupSelection}
                onQueryChange={(next) =>
                  setPopupState((prev) =>
                    prev?.type === 'model' ? { ...prev, query: next, selectionIndex: 0 } : prev,
                  )
                }
                onSubmit={handleModelPopupSubmit}
              />
            ) : popupState.type === 'toggle' ? (
              <TogglePopup field={popupState.field} selectionIndex={popupState.selectionIndex} />
            ) : popupState.type === 'file' ? (
              <ListPopup
                title="File Context"
                placeholder="src/**/*.ts"
                draft={popupState.draft}
                items={files}
                selectedIndex={popupState.selectionIndex}
                emptyLabel="No file globs added"
                instructions="Enter to add · Tab/↓ suggestions · ↑/↓ navigate · Del to remove · Esc to close"
                suggestedItems={filePopupSuggestions}
                suggestedSelectionIndex={filePopupSuggestionSelectionIndex}
                suggestedFocused={filePopupSuggestionsFocused}
                onDraftChange={(next) =>
                  setPopupState((prev) =>
                    prev?.type === 'file'
                      ? {
                          ...prev,
                          draft: next,
                          suggestedSelectionIndex: 0,
                          suggestedFocused: false,
                        }
                      : prev,
                  )
                }
                onSubmitDraft={handleAddFile}
              />
            ) : popupState.type === 'url' ? (
              <ListPopup
                title="URL Context"
                placeholder="https://github.com/..."
                draft={popupState.draft}
                items={urls}
                selectedIndex={popupState.selectionIndex}
                emptyLabel="No URLs added"
                instructions="Enter to add · ↑/↓ to select · Del to remove · Esc to close"
                onDraftChange={(next) =>
                  setPopupState((prev) => (prev?.type === 'url' ? { ...prev, draft: next } : prev))
                }
                onSubmitDraft={handleAddUrl}
              />
            ) : popupState.type === 'intent' ? (
              <IntentFilePopup
                draft={popupState.draft}
                onDraftChange={(next) =>
                  setPopupState((prev) =>
                    prev?.type === 'intent' ? { ...prev, draft: next } : prev,
                  )
                }
                onSubmitDraft={handleIntentFileSubmit}
              />
            ) : popupState.type === 'series' ? (
              <SeriesIntentPopup
                draft={popupState.draft}
                hint={popupState.hint}
                isRunning={isGenerating}
                onDraftChange={(next) =>
                  setPopupState((prev) =>
                    prev?.type === 'series' ? { ...prev, draft: next } : prev,
                  )
                }
                onSubmitDraft={handleSeriesIntentSubmit}
              />
            ) : popupState.type === 'test' ? (
              <TestPopup
                draft={popupState.draft}
                isRunning={isTestCommandRunning}
                onDraftChange={(next) =>
                  setPopupState((prev) => (prev?.type === 'test' ? { ...prev, draft: next } : prev))
                }
                onSubmitDraft={handleTestPopupSubmit}
              />
            ) : (
              <SmartPopup
                enabled={smartContextEnabled}
                draft={popupState.draft}
                onDraftChange={(next) =>
                  setPopupState((prev) =>
                    prev?.type === 'smart' ? { ...prev, draft: next } : prev,
                  )
                }
                onSubmitRoot={handleSmartRootSubmit}
              />
            )}
          </Box>
        ) : null}

        {isCommandMenuActive ? (
          <Box marginBottom={1}>
            <CommandMenu commands={visibleCommands} selectedIndex={commandSelectionIndex} />
          </Box>
        ) : null}
        <InputBar
          value={inputValue}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          isDisabled={isPopupOpen}
          statusChips={enhancedStatusChips}
          placeholder={
            isAwaitingRefinement
              ? 'Describe refinement (or empty to finish)...'
              : 'Describe your goal or type /command'
          }
        />
      </Box>
    )
  },
)
