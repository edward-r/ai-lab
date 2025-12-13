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
import { Box, useApp, useInput, useStdout } from 'ink'
import wrapAnsi from 'wrap-ansi'

import { InputBar } from './components/core/InputBar'
import { CommandMenu } from './components/core/CommandMenu'
import { PastedSnippetCard } from './components/core/PastedSnippetCard'
import { ScrollableOutput } from './components/core/ScrollableOutput'
import { ListPopup } from './components/popups/ListPopup'
import { ModelPopup } from './components/popups/ModelPopup'
import { SmartPopup } from './components/popups/SmartPopup'
import { TokenUsagePopup } from './components/popups/TokenUsagePopup'
import { ReasoningPopup } from './components/popups/ReasoningPopup'
import { TestPopup } from './components/popups/TestPopup'
import { TogglePopup } from './components/popups/TogglePopup'
import { IntentFilePopup } from './components/popups/IntentFilePopup'
import { InstructionsPopup } from './components/popups/InstructionsPopup'
import { SeriesIntentPopup } from './components/popups/SeriesIntentPopup'
import { COMMAND_DESCRIPTORS, POPUP_HEIGHTS } from './config'
import { parseAbsolutePathFromInput, isCommandInput } from './drag-drop-path'
import { filterFileSuggestions } from './file-suggestions'
import { resolveIntentSource } from './intent-source'
import {
  consumeBracketedPasteChunk,
  createBracketedPasteState,
  createPastedSnippet,
  detectPastedSnippetFromInputChange,
  type BracketedPasteState,
  type PastedSnippet,
} from './paste-snippet'
import { useCommandHistory } from './hooks/useCommandHistory'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { usePersistentCommandHistory } from './hooks/usePersistentCommandHistory'
import { useGenerationPipeline } from './hooks/useGenerationPipeline'
import { usePopupManager } from './hooks/usePopupManager'
import {
  DEFAULT_MODEL_ID,
  getBuiltInModelOptions,
  getPreferredModelId,
  loadModelOptions,
} from './model-options'
import { getLastSessionModel, setLastSessionModel } from './model-session'
import { checkProviderStatus } from './provider-status'
import type {
  HistoryEntry,
  ModelOption,
  PopupKind,
  ProviderStatus,
  ProviderStatusMap,
} from './types'
import type { ModelProvider } from '../model-providers'
import { resolveDefaultGenerateModel } from '../prompt-generator-service'
import { runPromptTestSuite, type PromptTestRunReporter } from '../test-command'
import { useContextDispatch, useContextState } from './context-store'
import { createTokenUsageStore } from './token-usage-store'

const APP_STATIC_ROWS = 7
const INPUT_BAR_ROWS = 6
const COMMAND_SCREEN_STATIC_ROWS = INPUT_BAR_ROWS + 3
const COMMAND_MENU_HEIGHT = COMMAND_DESCRIPTORS.length + 2
const DEFAULT_TEST_FILE = 'prompt-tests.yaml'

const filterModelOptions = (query: string, options: readonly ModelOption[]): ModelOption[] => {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) {
    return [...options]
  }
  return options.filter((option) => {
    const haystacks = [
      option.id.toLowerCase(),
      option.label.toLowerCase(),
      option.provider,
      option.description.toLowerCase(),
      option.capabilities.join(' ').toLowerCase(),
      option.notes?.toLowerCase() ?? '',
    ]
    return haystacks.some((value) => value.includes(trimmed))
  })
}

const WELCOME_LINES = [
  'Welcome to the Prompt Maker command palette preview.',
  'Type natural language requests or start a command with /.',
  'Press Enter to log input; arrow keys scroll history.',
  'Press ? anytime to view keyboard shortcuts.',
  'Series: /series opens a popup; it prefills from typed/last intent (or /intent file).',
  'Tests: /test prompt-tests.yaml runs the prompt test suite.',
  'Tokens: /tokens shows token usage breakdown.',
  'Reasoning: /reasoning (or /why) shows last model reasoning.',
  'JSON: /json on|off toggles prompt payload in history.',
  'Tip: Drag & drop a file path, then press Tab to add it to context.',
  'Tip: Press Tab to open the Series intent popup.',
]

const WELCOME_HISTORY: HistoryEntry[] = WELCOME_LINES.map((line, index) => ({
  id: `welcome-${index}`,
  content: line,
  kind: 'system',
}))

const DEFAULT_PROVIDER_STATUSES: ProviderStatusMap = {
  openai: { provider: 'openai', status: 'error', message: 'Status unavailable' },
  gemini: { provider: 'gemini', status: 'error', message: 'Status unavailable' },
  other: {
    provider: 'other',
    status: 'ok',
    message: 'Custom provider (not validated)',
  },
}

type CommandScreenProps = {
  interactiveTransportPath?: string | undefined
  onPopupVisibilityChange?: (isOpen: boolean) => void
  commandMenuSignal?: number
  helpOpen?: boolean
  reservedRows?: number
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

      const [terminalRows, setTerminalRows] = useState(stdout?.rows ?? 24)
      const [terminalColumns, setTerminalColumns] = useState(stdout?.columns ?? 80)
      const lastUserIntentRef = useRef<string | null>(null)
      const lastTypedIntentRef = useRef<string>('')
      const [inputValue, setInputValue] = useState('')
      const inputValueRef = useRef('')
      inputValueRef.current = inputValue
      const [pastedSnippet, setPastedSnippet] = useState<PastedSnippet | null>(null)
      const pastedSnippetRef = useRef<PastedSnippet | null>(null)
      pastedSnippetRef.current = pastedSnippet
      const suppressTextInputDuringPasteRef = useRef(false)
      const bracketedPasteStateRef = useRef<BracketedPasteState>(createBracketedPasteState())
      const [commandSelectionIndex, setCommandSelectionIndex] = useState(0)
      const builtInModelOptionsRef = useRef<ModelOption[]>(getBuiltInModelOptions())
      const initialSessionModelRef = useRef<string | null>(getLastSessionModel())
      const [modelOptions, setModelOptions] = useState<ModelOption[]>(
        builtInModelOptionsRef.current,
      )
      const [currentModel, setCurrentModelState] = useState<ModelOption['id']>(
        initialSessionModelRef.current ?? builtInModelOptionsRef.current[0]?.id ?? DEFAULT_MODEL_ID,
      )
      const userSelectedModelRef = useRef(Boolean(initialSessionModelRef.current))
      const [providerStatuses, setProviderStatuses] =
        useState<ProviderStatusMap>(DEFAULT_PROVIDER_STATUSES)

      const applyCurrentModel = useCallback(
        (nextId: ModelOption['id'], markUserSelection: boolean) => {
          setCurrentModelState((prev: ModelOption['id']) => (prev === nextId ? prev : nextId))
          setLastSessionModel(nextId)
          if (markUserSelection) {
            userSelectedModelRef.current = true
          }
        },
        [],
      )

      const selectModel = useCallback(
        (nextId: ModelOption['id']) => {
          applyCurrentModel(nextId, true)
        },
        [applyCurrentModel],
      )

      const updateProviderStatus = useCallback((status: ProviderStatus) => {
        setProviderStatuses((prev: ProviderStatusMap) => {
          const current = prev[status.provider]
          if (current && current.status === status.status && current.message === status.message) {
            return prev
          }
          return { ...prev, [status.provider]: status }
        })
      }, [])
      const [intentFilePath, setIntentFilePath] = useState('')
      const [polishEnabled, setPolishEnabled] = useState(false)
      const [copyEnabled, setCopyEnabled] = useState(false)
      const [chatGptEnabled, setChatGptEnabled] = useState(false)
      const [jsonOutputEnabled, setJsonOutputEnabled] = useState(false)
      const [isTestCommandRunning, setIsTestCommandRunning] = useState(false)
      const [lastTestFile, setLastTestFile] = useState<string | null>(null)
      const [isAwaitingNewReuse, setIsAwaitingNewReuse] = useState(false)
      const pendingNewReusePromptRef = useRef<string | null>(null)
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

      const clearPastedSnippet = useCallback(() => {
        setPastedSnippet(null)
      }, [])

      const applyPastedSnippet = useCallback(
        (snippet: PastedSnippet): void => {
          setPastedSnippet(snippet)
          suppressNextInputRef.current = true
          setInputValue('')
          lastTypedIntentRef.current = ''
        },
        [setInputValue],
      )

      const appendInlinePaste = useCallback(
        (raw: string): void => {
          const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
          suppressNextInputRef.current = true
          setInputValue((prev) => prev + normalized)
        },
        [setInputValue],
      )

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
      const isCommandMode = isCommandInput(inputValue, fs.existsSync)
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

      const isPopupOpen = popupState !== null
      const trimmedIntentFilePath = intentFilePath.trim()

      const providerChips = useMemo(() => {
        const providers: ModelProvider[] = ['openai', 'gemini']
        return providers.map((provider) => {
          const status = providerStatuses[provider]
          const suffix =
            status.status === 'ok' ? 'ok' : status.status === 'missing' ? 'missing-key' : 'error'
          return `[${provider}:${suffix}]`
        })
      }, [providerStatuses])

      const enhancedStatusChips = useMemo(() => {
        const chips = [...statusChips, ...providerChips]
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
      }, [providerChips, statusChips, trimmedIntentFilePath, trimmedMetaInstructions])

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
        const filtered = COMMAND_DESCRIPTORS.filter((command) => {
          if (command.id.startsWith(normalizedQuery)) {
            return true
          }
          if (command.label.toLowerCase().startsWith(normalizedQuery)) {
            return true
          }
          if ('aliases' in command && Array.isArray(command.aliases)) {
            return command.aliases.some((alias) => alias.startsWith(normalizedQuery))
          }
          return false
        })
        return filtered.length > 0 ? filtered : COMMAND_DESCRIPTORS
      }, [isCommandMode, normalizedQuery])

      const visibleCommands = commandMatches
      const isCommandMenuActive = isCommandMode && !isPopupOpen && !helpOpen
      const menuHeight = isCommandMenuActive
        ? Math.min(COMMAND_MENU_HEIGHT, Math.max(visibleCommands.length, 1) + 2)
        : 0
      const overlayHeight = helpOpen
        ? 0
        : popupState
          ? POPUP_HEIGHTS[popupState.type as PopupKind]
          : menuHeight
      const historyRows = useMemo(() => {
        const overlaySpacingRows = !helpOpen && (popupState || isCommandMenuActive) ? 1 : 0
        const baseChromeRows = APP_STATIC_ROWS + COMMAND_SCREEN_STATIC_ROWS
        const parentRows = interactiveTransportPath ? baseChromeRows + 1 : baseChromeRows
        const availableRows =
          terminalRows - overlayHeight - parentRows - overlaySpacingRows - reservedRows
        return Math.max(1, availableRows)
      }, [
        helpOpen,
        interactiveTransportPath,
        isCommandMenuActive,
        overlayHeight,
        popupState,
        reservedRows,
        terminalRows,
      ])

      const { history, pushHistory, resetHistory, scroll } = useCommandHistory({
        initialEntries: WELCOME_HISTORY,
        visibleRows: historyRows,
      })
      const { offset: scrollOffset, scrollTo, scrollBy } = scroll

      const hasNewReuseFlag = useCallback((argsRaw: string): boolean => {
        const tokens = argsRaw
          .split(/\s+/)
          .map((token) => token.trim())
          .filter((token) => token.length > 0)
        return tokens.includes('--reuse')
      }, [])

      const resetSessionState = useCallback(() => {
        resetContext()
        setIntentFilePath('')
        lastUserIntentRef.current = null
        lastTypedIntentRef.current = ''
        pendingNewReusePromptRef.current = null
        setIsAwaitingNewReuse(false)
        setInputValue('')
        setPopupState(null)
        resetHistory()
        scrollTo(Number.MAX_SAFE_INTEGER)
      }, [resetContext, resetHistory, scrollTo, setIntentFilePath, setPopupState])

      const applyReusedPromptAsMetaInstructions = useCallback(
        (prompt: string) => {
          setMetaInstructions(prompt)
          pushHistory('[new] Loaded last prompt into meta instructions.', 'system')
        },
        [pushHistory, setMetaInstructions],
      )

      const handleNewCommand = useCallback(
        (argsRaw: string) => {
          if (isGenerating) {
            pushHistory('[new] Cannot reset while generation is running.', 'system')
            return
          }

          const reuseFlag = hasNewReuseFlag(argsRaw)
          const previousPrompt = lastGeneratedPrompt?.trim() ?? ''

          resetSessionState()

          if (!previousPrompt) {
            pushHistory('[new] Session reset (no previous prompt to reuse).', 'system')
            return
          }

          if (reuseFlag) {
            applyReusedPromptAsMetaInstructions(previousPrompt)
            return
          }

          pendingNewReusePromptRef.current = previousPrompt
          setIsAwaitingNewReuse(true)
          pushHistory('[new] Reuse last generated prompt as meta instructions? (y/n)', 'system')
        },
        [
          applyReusedPromptAsMetaInstructions,
          hasNewReuseFlag,
          isGenerating,
          lastGeneratedPrompt,
          pushHistory,
          resetSessionState,
        ],
      )

      useEffect(() => {
        pushHistoryRef.current = pushHistory
      }, [pushHistory])

      useEffect(() => {
        let cancelled = false
        const providers: ModelProvider[] = ['openai', 'gemini']
        const refreshStatuses = async (): Promise<void> => {
          for (const provider of providers) {
            try {
              const status = await checkProviderStatus(provider)
              if (cancelled) {
                return
              }
              updateProviderStatus(status)
            } catch (error) {
              if (cancelled) {
                return
              }
              const message = error instanceof Error ? error.message : 'Unknown provider error.'
              updateProviderStatus({ provider, status: 'error', message })
            }
          }
        }
        void refreshStatuses()
        return () => {
          cancelled = true
        }
      }, [updateProviderStatus])

      useEffect(() => {
        let cancelled = false
        const loadOptions = async (): Promise<void> => {
          try {
            const result = await loadModelOptions()
            if (cancelled) {
              return
            }
            setModelOptions(result.options)
            if (result.warning) {
              pushHistory(result.warning, 'system')
            }
            if (userSelectedModelRef.current) {
              return
            }
            const resolvedDefault = await resolveDefaultGenerateModel().catch(() => null)
            if (cancelled || userSelectedModelRef.current) {
              return
            }
            const preferred = getPreferredModelId(result.options, resolvedDefault)
            applyCurrentModel(preferred, false)
          } catch (error) {
            if (cancelled) {
              return
            }
            const message = error instanceof Error ? error.message : 'Unknown model option error.'
            pushHistory(`[model] Failed to load CLI models: ${message}`, 'system')
          }
        }
        void loadOptions()
        return () => {
          cancelled = true
        }
      }, [applyCurrentModel, pushHistory])

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
        (input) => {
          if (popupState || helpOpen) {
            return
          }

          const result = consumeBracketedPasteChunk(bracketedPasteStateRef.current, input)
          bracketedPasteStateRef.current = result.state
          suppressTextInputDuringPasteRef.current = result.state.isActive

          if (result.completed.length === 0) {
            return
          }

          const latestPaste = result.completed[result.completed.length - 1] ?? ''
          const snippet = createPastedSnippet(latestPaste)

          if (snippet) {
            applyPastedSnippet(snippet)
            return
          }

          appendInlinePaste(latestPaste)
        },
        { isActive: !helpOpen },
      )

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
        { isActive: isCommandMenuActive && !helpOpen },
      )

      const addFileToContext = useCallback(
        (value: string): void => {
          const trimmed = value.trim()
          if (!trimmed) {
            return
          }
          if (files.includes(trimmed)) {
            pushHistory(`Context file already added: ${trimmed}`)
            return
          }
          addFile(trimmed)
          pushHistory(`Context file added: ${trimmed}`)
        },
        [addFile, files, pushHistory],
      )

      useInput(
        (_input, key) => {
          if (popupState || isCommandMenuActive || isCommandMode) {
            return
          }
          if (!key.tab || key.shift) {
            return
          }
          if (droppedFilePath) {
            addFileToContext(droppedFilePath)
            suppressNextInputRef.current = true
            setInputValue('')
            return
          }
          if (isGenerating) {
            pushHistory('Generation already running. Please wait.', 'system')
            return
          }
          const trimmedArgs = inputValue.trim()
          addCommandHistoryEntry(`/series${trimmedArgs ? ` ${trimmedArgs}` : ''}`)
          handleCommandSelection('series', inputValue)
        },
        { isActive: !isPopupOpen && !helpOpen },
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
          addFileToContext(trimmed)
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
        [addFileToContext, files.length, setPopupState],
      )

      useEffect(() => {
        if (popupState?.type !== 'file') {
          return
        }

        const candidate = parseAbsolutePathFromInput(popupState.draft)
        if (!candidate) {
          return
        }

        try {
          const stats = fs.statSync(candidate)
          if (!stats.isFile()) {
            return
          }
        } catch {
          return
        }

        handleAddFile(candidate)
      }, [handleAddFile, popupState])

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
          pushHistory(
            trimmed ? `Smart context root set to ${trimmed}` : 'Smart context root cleared',
          )
          setPopupState((prev) => (prev?.type === 'smart' ? { ...prev, draft: trimmed } : prev))
        },
        [setSmartRoot, pushHistory],
      )

      const historyPopupDraft = popupState?.type === 'history' ? popupState.draft : ''

      const historyPopupItems = useMemo(() => {
        const trimmed = historyPopupDraft.trim().toLowerCase()
        if (!trimmed) {
          return commandHistoryValues
        }
        return commandHistoryValues.filter((value) => value.toLowerCase().includes(trimmed))
      }, [commandHistoryValues, historyPopupDraft])

      useEffect(() => {
        if (popupState?.type !== 'history') {
          return
        }
        setPopupState((prev) => {
          if (prev?.type !== 'history') {
            return prev
          }
          const maxIndex = Math.max(historyPopupItems.length - 1, 0)
          const nextIndex = Math.min(prev.selectionIndex, maxIndex)
          return prev.selectionIndex === nextIndex ? prev : { ...prev, selectionIndex: nextIndex }
        })
      }, [historyPopupItems.length, popupState?.type, setPopupState])

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

      const filePopupSuggestionsFocused =
        filePopupSuggestedFocused && filePopupSuggestions.length > 0

      const modelPopupQuery = popupState?.type === 'model' ? popupState.query : ''
      const debouncedModelPopupQuery = useDebouncedValue(modelPopupQuery, 75)

      const modelPopupOptions = useMemo(() => {
        if (popupState?.type !== 'model') {
          return []
        }
        return filterModelOptions(debouncedModelPopupQuery, modelOptions)
      }, [debouncedModelPopupQuery, modelOptions, popupState?.type])

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
            const options = modelPopupOptions
            const modelSelectionIndex = Math.min(
              popupState.selectionIndex,
              Math.max(options.length - 1, 0),
            )

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
              handleModelPopupSubmit(options[modelSelectionIndex])
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

          if (popupState.type === 'history') {
            if (key.upArrow && historyPopupItems.length > 0) {
              setPopupState((prev) =>
                prev?.type === 'history'
                  ? { ...prev, selectionIndex: Math.max(prev.selectionIndex - 1, 0) }
                  : prev,
              )
              return
            }
            if (key.downArrow && historyPopupItems.length > 0) {
              setPopupState((prev) =>
                prev?.type === 'history'
                  ? {
                      ...prev,
                      selectionIndex: Math.min(
                        prev.selectionIndex + 1,
                        historyPopupItems.length - 1,
                      ),
                    }
                  : prev,
              )
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

          if (popupState.type === 'tokens') {
            if (key.escape) {
              closePopup()
            }
            return
          }

          if (popupState.type === 'reasoning') {
            const maxOffset = Math.max(0, reasoningPopupLines.length - reasoningPopupVisibleRows)

            if (key.upArrow) {
              setPopupState((prev) =>
                prev?.type === 'reasoning'
                  ? { ...prev, scrollOffset: Math.max(prev.scrollOffset - 1, 0) }
                  : prev,
              )
              return
            }

            if (key.downArrow) {
              setPopupState((prev) =>
                prev?.type === 'reasoning'
                  ? { ...prev, scrollOffset: Math.min(prev.scrollOffset + 1, maxOffset) }
                  : prev,
              )
              return
            }

            if (key.pageUp) {
              setPopupState((prev) =>
                prev?.type === 'reasoning'
                  ? {
                      ...prev,
                      scrollOffset: Math.max(prev.scrollOffset - reasoningPopupVisibleRows, 0),
                    }
                  : prev,
              )
              return
            }

            if (key.pageDown) {
              setPopupState((prev) =>
                prev?.type === 'reasoning'
                  ? {
                      ...prev,
                      scrollOffset: Math.min(
                        prev.scrollOffset + reasoningPopupVisibleRows,
                        maxOffset,
                      ),
                    }
                  : prev,
              )
              return
            }

            if (key.escape) {
              closePopup()
            }
            return
          }

          if (popupState.type === 'intent') {
            if (key.escape) {
              closePopup()
            }
            return
          }

          if (popupState.type === 'instructions') {
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
        { isActive: isPopupOpen && !helpOpen },
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
          const trimmed = value.trim()
          addCommandHistoryEntry(`/test${trimmed ? ` ${trimmed}` : ''}`)
          void runTestsFromCommand(value)
        },
        [addCommandHistoryEntry, runTestsFromCommand],
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

          if (isAwaitingNewReuse) {
            const response = value.trim().toLowerCase()
            if (response === 'y' || response === 'yes') {
              const prompt = pendingNewReusePromptRef.current
              pendingNewReusePromptRef.current = null
              setIsAwaitingNewReuse(false)
              setInputValue('')
              if (prompt) {
                applyReusedPromptAsMetaInstructions(prompt)
              } else {
                pushHistory('[new] No previous prompt available to reuse.', 'system')
              }
              return
            }

            if (response === 'n' || response === 'no') {
              pendingNewReusePromptRef.current = null
              setIsAwaitingNewReuse(false)
              setInputValue('')
              pushHistory('[new] Continuing without reusing the previous prompt.', 'system')
              return
            }

            pushHistory('[new] Please answer "y" or "n".', 'system')
            setInputValue('')
            return
          }

          if (popupState) {
            return
          }

          if (isCommandMenuActive) {
            if (selectedCommand) {
              const trimmedArgs = commandArgsRaw.trim()
              addCommandHistoryEntry(
                `/${selectedCommand.id}${trimmedArgs ? ` ${trimmedArgs}` : ''}`,
              )
              if (selectedCommand.id === 'new') {
                handleNewCommand(commandArgsRaw)
              } else {
                handleCommandSelection(selectedCommand.id, commandArgsRaw)
              }
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
          commandArgsRaw,
          intentFilePath,
        ],
      )

      useInput(
        (_input, key) => {
          if (!pastedSnippetRef.current) {
            return
          }
          if (popupState || helpOpen) {
            return
          }
          if (key.escape) {
            clearPastedSnippet()
            return
          }
          if (key.return) {
            const snippet = pastedSnippetRef.current
            if (!snippet) {
              return
            }
            clearPastedSnippet()
            handleSubmit(snippet.text)
          }
        },
        { isActive: Boolean(pastedSnippet) && !helpOpen },
      )

      const handleInputChange = useCallback(
        (next: string) => {
          if (consumeSuppressedTextInputChange()) {
            return
          }
          if (popupState) {
            return
          }
          if (suppressTextInputDuringPasteRef.current) {
            return
          }

          const snippet = detectPastedSnippetFromInputChange(inputValueRef.current, next)
          if (snippet) {
            applyPastedSnippet(snippet)
            return
          }

          setInputValue(next)
          if (isCommandInput(next, fs.existsSync)) {
            return
          }
          lastTypedIntentRef.current = next
        },
        [applyPastedSnippet, consumeSuppressedTextInputChange, popupState, setInputValue],
      )

      const handleModelPopupQueryChange = useCallback(
        (next: string) => {
          if (consumeSuppressedTextInputChange()) {
            return
          }
          setPopupState((prev) =>
            prev?.type === 'model' ? { ...prev, query: next, selectionIndex: 0 } : prev,
          )
        },
        [consumeSuppressedTextInputChange, setPopupState],
      )

      const handleUrlPopupDraftChange = useCallback(
        (next: string) => {
          if (consumeSuppressedTextInputChange()) {
            return
          }
          setPopupState((prev) => (prev?.type === 'url' ? { ...prev, draft: next } : prev))
        },
        [consumeSuppressedTextInputChange, setPopupState],
      )

      const handleHistoryPopupDraftChange = useCallback(
        (next: string) => {
          if (consumeSuppressedTextInputChange()) {
            return
          }
          setPopupState((prev) =>
            prev?.type === 'history' ? { ...prev, draft: next, selectionIndex: 0 } : prev,
          )
        },
        [consumeSuppressedTextInputChange, setPopupState],
      )

      const handleHistoryPopupSubmit = useCallback(
        (value: string) => {
          if (popupState?.type !== 'history') {
            return
          }
          const trimmed = value.trim()
          const fallback = historyPopupItems[popupState.selectionIndex] ?? ''
          const selection = trimmed || fallback
          if (!selection.trim()) {
            return
          }
          suppressNextInputRef.current = true
          setInputValue(selection)
          closePopup()
        },
        [closePopup, historyPopupItems, popupState, setInputValue],
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

      const handleFilePopupDraftChange = useCallback(
        (next: string) => {
          if (consumeSuppressedTextInputChange()) {
            return
          }
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
        },
        [consumeSuppressedTextInputChange, setPopupState],
      )

      const handleIntentPopupDraftChange = useCallback(
        (next: string) => {
          if (consumeSuppressedTextInputChange()) {
            return
          }
          setPopupState((prev) => (prev?.type === 'intent' ? { ...prev, draft: next } : prev))
        },
        [consumeSuppressedTextInputChange, setPopupState],
      )

      const handleSeriesPopupDraftChange = useCallback(
        (next: string) => {
          if (consumeSuppressedTextInputChange()) {
            return
          }
          setPopupState((prev) => (prev?.type === 'series' ? { ...prev, draft: next } : prev))
        },
        [consumeSuppressedTextInputChange, setPopupState],
      )

      const handleInstructionsPopupDraftChange = useCallback(
        (next: string) => {
          if (consumeSuppressedTextInputChange()) {
            return
          }
          setPopupState((prev) => (prev?.type === 'instructions' ? { ...prev, draft: next } : prev))
        },
        [consumeSuppressedTextInputChange, setPopupState],
      )

      const handleTestPopupDraftChange = useCallback(
        (next: string) => {
          if (consumeSuppressedTextInputChange()) {
            return
          }
          setPopupState((prev) => (prev?.type === 'test' ? { ...prev, draft: next } : prev))
        },
        [consumeSuppressedTextInputChange, setPopupState],
      )

      const handleSmartPopupDraftChange = useCallback(
        (next: string) => {
          if (consumeSuppressedTextInputChange()) {
            return
          }
          setPopupState((prev) => (prev?.type === 'smart' ? { ...prev, draft: next } : prev))
        },
        [consumeSuppressedTextInputChange, setPopupState],
      )

      const modelPopupSelection =
        popupState?.type === 'model'
          ? Math.min(popupState.selectionIndex, Math.max(modelPopupOptions.length - 1, 0))
          : 0

      return (
        <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
          <Box
            flexDirection="column"
            height={historyRows}
            flexShrink={0}
            overflow="hidden"
            marginBottom={1}
          >
            <ScrollableOutput
              lines={history}
              visibleRows={historyRows}
              scrollOffset={scrollOffset}
            />
          </Box>
          {popupState && !helpOpen ? (
            <Box marginBottom={1} height={overlayHeight} flexShrink={0} overflow="hidden">
              {popupState.type === 'model' ? (
                <ModelPopup
                  query={popupState.query}
                  options={modelPopupOptions}
                  selectedIndex={modelPopupSelection}
                  providerStatuses={providerStatuses}
                  onQueryChange={handleModelPopupQueryChange}
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
                  onDraftChange={handleFilePopupDraftChange}
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
                  onDraftChange={handleUrlPopupDraftChange}
                  onSubmitDraft={handleAddUrl}
                />
              ) : popupState.type === 'history' ? (
                <ListPopup
                  title="History"
                  placeholder="Search commands & intents"
                  draft={popupState.draft}
                  items={historyPopupItems}
                  selectedIndex={popupState.selectionIndex}
                  emptyLabel="No history saved"
                  instructions="Enter to reuse · ↑/↓ navigate · Esc to close"
                  onDraftChange={handleHistoryPopupDraftChange}
                  onSubmitDraft={handleHistoryPopupSubmit}
                />
              ) : popupState.type === 'intent' ? (
                <IntentFilePopup
                  draft={popupState.draft}
                  onDraftChange={handleIntentPopupDraftChange}
                  onSubmitDraft={handleIntentFileSubmit}
                />
              ) : popupState.type === 'instructions' ? (
                <InstructionsPopup
                  draft={popupState.draft}
                  onDraftChange={handleInstructionsPopupDraftChange}
                  onSubmitDraft={handleInstructionsSubmit}
                />
              ) : popupState.type === 'series' ? (
                <SeriesIntentPopup
                  draft={popupState.draft}
                  hint={popupState.hint}
                  isRunning={isGenerating}
                  onDraftChange={handleSeriesPopupDraftChange}
                  onSubmitDraft={handleSeriesIntentSubmitWithHistory}
                />
              ) : popupState.type === 'test' ? (
                <TestPopup
                  draft={popupState.draft}
                  isRunning={isTestCommandRunning}
                  onDraftChange={handleTestPopupDraftChange}
                  onSubmitDraft={handleTestPopupSubmit}
                />
              ) : popupState.type === 'tokens' ? (
                <TokenUsagePopup
                  run={tokenUsageStoreRef.current?.getLatestRun() ?? null}
                  breakdown={tokenUsageStoreRef.current?.getLatestBreakdown() ?? null}
                />
              ) : popupState.type === 'reasoning' ? (
                <ReasoningPopup
                  lines={reasoningPopupLines}
                  visibleRows={reasoningPopupVisibleRows}
                  scrollOffset={popupState.scrollOffset}
                />
              ) : (
                <SmartPopup
                  enabled={smartContextEnabled}
                  draft={popupState.draft}
                  onDraftChange={handleSmartPopupDraftChange}
                  onSubmitRoot={handleSmartRootSubmit}
                />
              )}
            </Box>
          ) : null}

          {isCommandMenuActive ? (
            <Box marginBottom={1} height={menuHeight} flexShrink={0} overflow="hidden">
              <CommandMenu commands={visibleCommands} selectedIndex={commandSelectionIndex} />
            </Box>
          ) : null}

          {pastedSnippet && !isPopupOpen && !helpOpen ? (
            <Box marginBottom={1} flexShrink={0}>
              <PastedSnippetCard snippet={pastedSnippet} />
            </Box>
          ) : null}

          <InputBar
            value={pastedSnippet ? '' : inputValue}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            isDisabled={isPopupOpen || helpOpen || Boolean(pastedSnippet)}
            statusChips={enhancedStatusChips}
            hint={
              !isPopupOpen && !helpOpen && droppedFilePath
                ? `Press Tab to add ${path.basename(droppedFilePath)} to context`
                : undefined
            }
            placeholder={
              pastedSnippet
                ? pastedSnippet.label
                : isAwaitingRefinement
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
