import path from 'node:path'
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Box, Text, useApp, useInput, useStdout } from 'ink'
import wrapAnsi from 'wrap-ansi'

import {
  runGeneratePipeline,
  maybeCopyToClipboard,
  maybeOpenChatGpt,
  type GenerateArgs,
  type GeneratePipelineOptions,
  type GeneratePipelineResult,
  type StreamEventInput,
} from '../generate-command'
import {
  generatePromptSeries,
  isGemini,
  type PromptGenerationRequest,
  type SeriesResponse,
  type UploadStateChange,
} from '../prompt-generator-service'
import { resolveFileContext } from '../file-context'
import { resolveSmartContextFiles } from '../smart-context-service'
import { resolveUrlContext } from '../url-context'
import { runPromptTestSuite, type PromptTestRunReporter } from '../test-command'
import { useContextDispatch, useContextState } from './context'
import { CommandMenu } from './components/core/CommandMenu'
import { InputBar } from './components/core/InputBar'
import { ScrollableOutput } from './components/core/ScrollableOutput'
import { ListPopup } from './components/popups/ListPopup'
import { ModelPopup, type ModelOption as PopupModelOption } from './components/popups/ModelPopup'
import { SmartPopup } from './components/popups/SmartPopup'
import { TestPopup } from './components/popups/TestPopup'
import { TogglePopup } from './components/popups/TogglePopup'

const APP_STATIC_ROWS = 7
const INPUT_BAR_ROWS = 5
const COMMAND_SCREEN_STATIC_ROWS = INPUT_BAR_ROWS + 3
const COMMAND_DESCRIPTORS = [
  { id: 'model', label: 'Model', description: 'Switch the target LLM' },
  { id: 'file', label: 'File', description: 'Attach file context' },
  { id: 'url', label: 'URL', description: 'Add URL context' },
  { id: 'smart', label: 'Smart Context', description: 'Toggle smart context root' },
  { id: 'image', label: 'Image', description: 'Attach reference images' },
  { id: 'video', label: 'Video', description: 'Attach reference videos' },
  { id: 'polish', label: 'Polish', description: 'Enable prompt polishing' },
  { id: 'series', label: 'Series', description: 'Generate atomic prompt series' },
  { id: 'copy', label: 'Copy', description: 'Auto-copy final prompt' },
  { id: 'chatgpt', label: 'ChatGPT', description: 'Open ChatGPT automatically' },
  { id: 'json', label: 'JSON', description: 'Emit JSON payload to stdout' },
  { id: 'test', label: 'Test', description: 'Run prompt tests (/test <file>)' },
  { id: 'exit', label: 'Exit', description: 'Quit the command palette' },
] as const
const COMMAND_MENU_HEIGHT = COMMAND_DESCRIPTORS.length + 2

const MODEL_OPTIONS: readonly ModelOption[] = [
  { id: 'gpt-4o-mini', label: 'gpt-4o-mini', description: 'OpenAI general-purpose LLM' },
  { id: 'gemini-1.5-pro', label: 'gemini-1.5-pro', description: 'Google Gemini multimodal' },
]
const MODEL_POPUP_HEIGHT = MODEL_OPTIONS.length + 5
const TOGGLE_POPUP_HEIGHT = 6
const LIST_POPUP_HEIGHT = 12
const SMART_POPUP_HEIGHT = 9
const TEST_POPUP_HEIGHT = 7
const SPINNER_FRAMES = ['◴', '◷', '◶', '◵'] as const
const DEFAULT_TEST_FILE = 'prompt-tests.yaml'

const TOGGLE_LABELS = {
  polish: 'Polish',
  copy: 'Copy',
  chatgpt: 'ChatGPT',
  json: 'JSON',
} as const

const POPUP_HEIGHTS = {
  model: MODEL_POPUP_HEIGHT,
  toggle: TOGGLE_POPUP_HEIGHT,
  file: LIST_POPUP_HEIGHT,
  url: LIST_POPUP_HEIGHT,
  smart: SMART_POPUP_HEIGHT,
  test: TEST_POPUP_HEIGHT,
} as const

const WELCOME_LINES = [
  'Welcome to the Prompt Maker command palette preview.',
  'Type natural language requests or start a command with /.',
  'Press Enter to log input; arrow keys scroll history.',
]

type CommandDescriptor = (typeof COMMAND_DESCRIPTORS)[number]
type ModelOption = PopupModelOption
type ToggleField = keyof typeof TOGGLE_LABELS

type PopupKind = keyof typeof POPUP_HEIGHTS

type PopupState =
  | { type: 'model'; query: string; selectionIndex: number }
  | { type: 'toggle'; field: ToggleField; selectionIndex: number }
  | { type: 'file'; draft: string; selectionIndex: number }
  | { type: 'url'; draft: string; selectionIndex: number }
  | { type: 'smart'; draft: string }
  | { type: 'test'; draft: string }
  | null

type HistoryEntry = {
  id: string
  content: string
  kind: 'user' | 'system' | 'progress'
}

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
    const [history, setHistory] = useState<HistoryEntry[]>(() =>
      WELCOME_LINES.map((line, index) => ({
        id: `welcome-${index}`,
        content: line,
        kind: 'system',
      })),
    )
    const historyIdRef = useRef(WELCOME_LINES.length)
    const lastUserIntentRef = useRef<string | null>(null)
    const [inputValue, setInputValue] = useState('')
    const [scrollOffset, setScrollOffset] = useState(0)
    const [isPinnedToBottom, setIsPinnedToBottom] = useState(true)
    const [commandSelectionIndex, setCommandSelectionIndex] = useState(0)
    const [popupState, setPopupState] = useState<PopupState>(null)
    const [currentModel, setCurrentModel] = useState<ModelOption['id']>('gpt-4o-mini')
    const [polishEnabled, setPolishEnabled] = useState(false)
    const [copyEnabled, setCopyEnabled] = useState(false)
    const [chatGptEnabled, setChatGptEnabled] = useState(false)
    const [jsonOutputEnabled, setJsonOutputEnabled] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [spinnerIndex, setSpinnerIndex] = useState(0)
    const [statusMessage, setStatusMessage] = useState('Idle')
    const [isTestCommandRunning, setIsTestCommandRunning] = useState(false)
    const [lastTestFile, setLastTestFile] = useState<string | null>(null)
    const suppressNextInputRef = useRef(false)

    useImperativeHandle(ref, () => ({
      suppressNextInput: () => {
        suppressNextInputRef.current = true
      },
    }))

    const pushHistory = useCallback((content: string, kind: HistoryEntry['kind'] = 'system') => {
      setHistory((prev) => [...prev, { id: `entry-${historyIdRef.current++}`, content, kind }])
      setIsPinnedToBottom(true)
    }, [])

    useEffect(() => {
      if (!isGenerating) {
        setSpinnerIndex(0)
        return
      }
      const timer = setInterval(() => {
        setSpinnerIndex((prev) => (prev + 1) % SPINNER_FRAMES.length)
      }, 120)
      return () => clearInterval(timer)
    }, [isGenerating])

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

    const isPopupOpen = popupState !== null

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

    const isCommandMenuActive = isCommandMode && !isPopupOpen
    const visibleCommands = commandMatches
    const menuHeight = isCommandMenuActive
      ? Math.min(COMMAND_MENU_HEIGHT, Math.max(visibleCommands.length, 1) + 2)
      : 0
    const overlayHeight = popupState ? POPUP_HEIGHTS[popupState.type as PopupKind] : menuHeight

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
      setIsPinnedToBottom(true)
    }, [commandMenuSignal])

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
      setHistory((prev) => {
        if (prev.some((entry) => entry.content === transportLine)) {
          return prev
        }
        return [
          ...prev,
          { id: `entry-${historyIdRef.current++}`, content: transportLine, kind: 'system' },
        ]
      })
    }, [interactiveTransportPath])

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

    const historyRows = useMemo(() => {
      const overlaySpacingRows = popupState || isCommandMenuActive ? 1 : 0
      const baseChromeRows = APP_STATIC_ROWS + COMMAND_SCREEN_STATIC_ROWS
      const parentRows = interactiveTransportPath ? baseChromeRows + 1 : baseChromeRows
      const availableRows = terminalRows - overlayHeight - parentRows - overlaySpacingRows
      return Math.max(1, availableRows)
    }, [interactiveTransportPath, isCommandMenuActive, overlayHeight, popupState, terminalRows])

    useEffect(() => {
      setScrollOffset((prev) => {
        const nextMax = Math.max(0, history.length - historyRows)
        if (isPinnedToBottom) {
          return nextMax
        }
        return Math.min(prev, nextMax)
      })
    }, [history, historyRows, isPinnedToBottom])

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

    const scrollTo = useCallback(
      (next: number) => {
        const nextMax = Math.max(0, history.length - historyRows)
        const clamped = Math.max(0, Math.min(next, nextMax))
        setScrollOffset(clamped)
        setIsPinnedToBottom(clamped >= nextMax)
      },
      [history.length, historyRows],
    )

    const scrollBy = useCallback(
      (delta: number) => {
        scrollTo(scrollOffset + delta)
      },
      [scrollOffset, scrollTo],
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

    const closePopup = useCallback(() => {
      setPopupState(null)
    }, [])

    const applyModelSelection = useCallback(
      (option?: ModelOption) => {
        if (!option) {
          return
        }
        setCurrentModel(option.id)
        pushHistory(`Model set to ${option.id}`)
        setInputValue('')
        setPopupState(null)
      },
      [pushHistory],
    )

    const applyToggleSelection = useCallback(
      (field: ToggleField, value: boolean) => {
        if (field === 'json' && value && interactiveTransportPath) {
          pushHistory(
            'JSON output cannot be enabled while interactive transport is active.',
            'system',
          )
          setInputValue('')
          setPopupState(null)
          return
        }
        const message = `${TOGGLE_LABELS[field]} ${value ? 'enabled' : 'disabled'}`
        if (field === 'polish') {
          setPolishEnabled(value)
        } else if (field === 'copy') {
          setCopyEnabled(value)
        } else if (field === 'chatgpt') {
          setChatGptEnabled(value)
        } else if (field === 'json') {
          setJsonOutputEnabled(value)
        }
        pushHistory(message)
        setInputValue('')
        setPopupState(null)
      },
      [
        interactiveTransportPath,
        pushHistory,
        setJsonOutputEnabled,
        setInputValue,
        setPopupState,
        setPolishEnabled,
        setCopyEnabled,
        setChatGptEnabled,
        exit,
      ],
    )

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
            ? { ...prev, draft: '', selectionIndex: Math.max(files.length, 0) }
            : prev,
        )
      },
      [addFile, files.length, pushHistory],
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
      [addUrl, urls.length, pushHistory],
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

    const handleStreamEvent = useCallback(
      (event: StreamEventInput) => {
        switch (event.event) {
          case 'progress.update': {
            const scope = event.scope ? `[${event.scope}] ` : ''
            const message = `${scope}${event.label} (${event.state})`
            pushHistory(message, 'progress')
            setStatusMessage(message)
            return
          }
          case 'upload.state': {
            const action = event.state === 'start' ? 'Uploading' : 'Uploaded'
            pushHistory(`${action} ${event.detail.kind}: ${event.detail.filePath}`, 'progress')
            return
          }
          case 'generation.iteration.start':
            pushHistory(`Iteration ${event.iteration} started`, 'progress')
            return
          case 'generation.iteration.complete':
            pushHistory(`Iteration ${event.iteration} complete`, 'progress')
            return
          case 'context.telemetry': {
            const telemetry = event.telemetry
            pushHistory(
              `Telemetry · total ${telemetry.totalTokens} · intent ${telemetry.intentTokens} · files ${telemetry.fileTokens}`,
              'progress',
            )
            return
          }
          case 'generation.final':
            pushHistory('Generation stream finalized.', 'progress')
            return
          case 'transport.listening':
            pushHistory(`Transport listening on ${event.path}`, 'progress')
            return
          case 'transport.client.connected':
            pushHistory('Transport client connected.', 'progress')
            return
          case 'transport.client.disconnected':
            pushHistory('Transport client disconnected.', 'progress')
            return
          case 'interactive.awaiting':
            pushHistory(`Awaiting ${event.mode} input`, 'progress')
            return
          case 'interactive.state':
            pushHistory(`Interactive ${event.phase} (iteration ${event.iteration})`, 'progress')
            return
          default:
            return
        }
      },
      [pushHistory, setStatusMessage],
    )

    const runGeneration = useCallback(
      async (intent: string) => {
        setIsGenerating(true)
        setStatusMessage('Preparing generation…')
        pushHistory('Starting generation…')
        try {
          const normalizedModel = currentModel.trim() || 'gpt-4o-mini'
          const args: GenerateArgs = {
            intent,
            interactive: Boolean(interactiveTransportPath),
            copy: false,
            openChatGpt: false,
            polish: polishEnabled,
            json: jsonOutputEnabled,
            quiet: true,
            progress: false,
            stream: 'none',
            showContext: false,
            contextFormat: 'text',
            help: false,
            context: [...files],
            urls: [...urls],
            images: [...images],
            video: [...videos],
            smartContext: smartContextEnabled,
            model: normalizedModel,
          }
          if (polishEnabled) {
            args.polishModel = normalizedModel
          }
          if (smartContextEnabled && smartContextRoot) {
            args.smartContextRoot = smartContextRoot
          }
          if (interactiveTransportPath) {
            args.interactiveTransport = interactiveTransportPath
          }

          const options: GeneratePipelineOptions = {
            onStreamEvent: handleStreamEvent,
          }

          const result: GeneratePipelineResult = await runGeneratePipeline(args, options)
          setStatusMessage('Finalizing prompt…')
          const iterationLabel = result.iterations ? ` · ${result.iterations} iterations` : ''
          pushHistory(`Final prompt (${result.model}${iterationLabel}):`, 'system')
          pushHistory(result.finalPrompt, 'system')
          if (result.telemetry) {
            pushHistory(
              `Telemetry · total ${result.telemetry.totalTokens} · intent ${result.telemetry.intentTokens} · files ${result.telemetry.fileTokens}`,
              'system',
            )
          }
          if (jsonOutputEnabled) {
            pushHistory('JSON payload:', 'system')
            const prettyPayload = JSON.stringify(result.payload, null, 2)
            const wrapWidth = Math.max(40, terminalColumns - 6)
            prettyPayload.split('\n').forEach((line) => {
              const wrapped = wrapAnsi(line, wrapWidth, { trim: false, hard: true })
              wrapped.split('\n').forEach((wrappedLine) => {
                pushHistory(wrappedLine, 'system')
              })
            })
          }
          if (copyEnabled) {
            await maybeCopyToClipboard(true, result.finalPrompt, false)
            pushHistory('Copied prompt to clipboard.', 'system')
          }
          if (chatGptEnabled) {
            await maybeOpenChatGpt(true, result.finalPrompt, false)
            pushHistory('Opened ChatGPT with generated prompt.', 'system')
          }
          setStatusMessage('Complete')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown generation error.'
          pushHistory(`Generation failed: ${message}`)
          setStatusMessage('Failed')
        } finally {
          setIsGenerating(false)
        }
      },
      [
        chatGptEnabled,
        copyEnabled,
        currentModel,
        files,
        urls,
        images,
        videos,
        polishEnabled,
        jsonOutputEnabled,
        smartContextEnabled,
        smartContextRoot,
        interactiveTransportPath,
        terminalColumns,
        handleStreamEvent,
        pushHistory,
        setStatusMessage,
      ],
    )

    const runSeriesGeneration = useCallback(
      async (intent: string) => {
        setIsGenerating(true)
        setStatusMessage('Series: resolving context…')
        pushHistory('[series] Starting series generation…', 'progress')
        try {
          const normalizedModel = currentModel.trim() || 'gpt-4o-mini'
          let targetModel = normalizedModel
          if (videos.length > 0 && !isGemini(targetModel)) {
            targetModel = 'gemini-1.5-pro'
            pushHistory('[series] Switching to gemini-1.5-pro for video support.', 'progress')
          }

          let resolvedContext = await resolveFileContext([...files])
          if (resolvedContext.length > 0) {
            pushHistory(
              `[series] Added ${resolvedContext.length} file context entr${resolvedContext.length === 1 ? 'y' : 'ies'}.`,
              'progress',
            )
          }

          if (urls.length > 0) {
            pushHistory(`[series] Fetching ${urls.length} URL source(s)…`, 'progress')
            try {
              const urlFiles = await resolveUrlContext(urls, {
                onProgress: (message: string) => {
                  pushHistory(`[series] ${message}`, 'progress')
                  setStatusMessage(`Series: ${message}`)
                },
              })
              if (urlFiles.length > 0) {
                resolvedContext = [...resolvedContext, ...urlFiles]
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unknown URL context error.'
              pushHistory(`[series] URL context failed: ${message}`, 'progress')
            }
          }

          if (smartContextEnabled) {
            pushHistory('[series] Resolving smart context…', 'progress')
            try {
              const smartFiles = await resolveSmartContextFiles(
                intent,
                resolvedContext,
                (message: string) => {
                  pushHistory(`[series] ${message}`, 'progress')
                  setStatusMessage(`Series: ${message}`)
                },
                smartContextRoot ?? undefined,
              )
              if (smartFiles.length > 0) {
                resolvedContext = [...resolvedContext, ...smartFiles]
              }
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Unknown smart context error.'
              pushHistory(`[series] Smart context failed: ${message}`, 'progress')
            }
          }

          pushHistory(`[series] Context ready (${resolvedContext.length} file(s)).`, 'progress')

          const handleUploadState: UploadStateChange = (state, detail) => {
            const action = state === 'start' ? 'Uploading' : 'Uploaded'
            pushHistory(`[series] ${action} ${detail.kind}: ${detail.filePath}`, 'progress')
          }

          const request: PromptGenerationRequest = {
            intent,
            model: targetModel,
            fileContext: resolvedContext,
            images: [...images],
            videos: [...videos],
            onUploadStateChange: handleUploadState,
          }

          setStatusMessage('Series: generating…')
          const series: SeriesResponse = await generatePromptSeries(request)
          pushHistory('[series] Overview ready.', 'progress')
          pushHistory(`[Overview] ${series.overviewPrompt}`, 'system')
          series.atomicPrompts.forEach((step, index) => {
            const stepNumber = index + 1
            pushHistory(`[Step ${stepNumber}: ${step.title}] ${step.content}`, 'system')
          })
          setStatusMessage('Series complete')
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown series generation error.'
          pushHistory(`[series] Failed: ${message}`, 'progress')
          setStatusMessage('Series failed')
        } finally {
          setIsGenerating(false)
        }
      },
      [
        currentModel,
        files,
        urls,
        images,
        videos,
        smartContextEnabled,
        smartContextRoot,
        pushHistory,
        setStatusMessage,
        resolveFileContext,
        resolveUrlContext,
        resolveSmartContextFiles,
        isGemini,
        generatePromptSeries,
      ],
    )

    useInput(
      (input, key) => {
        if (!popupState) {
          return
        }
        if (popupState.type === 'model') {
          const options = filterModelOptions(popupState.query)
          if (key.upArrow && options.length > 0) {
            setPopupState({
              ...popupState,
              selectionIndex: (popupState.selectionIndex - 1 + options.length) % options.length,
            })
            return
          }
          if (key.downArrow && options.length > 0) {
            setPopupState({
              ...popupState,
              selectionIndex: (popupState.selectionIndex + 1) % options.length,
            })
            return
          }
          if (key.escape) {
            closePopup()
            return
          }
          if (key.return) {
            applyModelSelection(options[popupState.selectionIndex])
          }
          return
        }

        if (popupState.type === 'toggle') {
          const options = ['On', 'Off']
          if (key.leftArrow || key.upArrow) {
            setPopupState({
              ...popupState,
              selectionIndex: (popupState.selectionIndex - 1 + options.length) % options.length,
            })
            return
          }
          if (key.rightArrow || key.downArrow) {
            setPopupState({
              ...popupState,
              selectionIndex: (popupState.selectionIndex + 1) % options.length,
            })
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
          if (key.upArrow && files.length > 0) {
            setPopupState({
              ...popupState,
              selectionIndex: Math.max(popupState.selectionIndex - 1, 0),
            })
            return
          }
          if (key.downArrow && files.length > 0) {
            setPopupState({
              ...popupState,
              selectionIndex: Math.min(popupState.selectionIndex + 1, files.length - 1),
            })
            return
          }
          if ((key.delete || key.backspace) && files.length > 0) {
            handleRemoveFile(popupState.selectionIndex)
            return
          }
          if (key.escape) {
            closePopup()
          }
          return
        }

        if (popupState.type === 'url') {
          if (key.upArrow && urls.length > 0) {
            setPopupState({
              ...popupState,
              selectionIndex: Math.max(popupState.selectionIndex - 1, 0),
            })
            return
          }
          if (key.downArrow && urls.length > 0) {
            setPopupState({
              ...popupState,
              selectionIndex: Math.min(popupState.selectionIndex + 1, urls.length - 1),
            })
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

        if (popupState.type === 'test') {
          if (key.escape) {
            closePopup()
          }
          return
        }
      },
      { isActive: isPopupOpen },
    )

    const selectedCommand =
      isCommandMenuActive && visibleCommands.length > 0
        ? visibleCommands[Math.min(commandSelectionIndex, visibleCommands.length - 1)]
        : undefined

    const openModelPopup = useCallback(() => {
      const defaultIndex = Math.max(
        0,
        MODEL_OPTIONS.findIndex((option) => option.id === currentModel),
      )
      setPopupState({ type: 'model', query: '', selectionIndex: defaultIndex })
    }, [currentModel])

    const openTogglePopup = useCallback(
      (field: ToggleField) => {
        const currentValue =
          field === 'polish'
            ? polishEnabled
            : field === 'copy'
              ? copyEnabled
              : field === 'chatgpt'
                ? chatGptEnabled
                : jsonOutputEnabled
        setPopupState({ type: 'toggle', field, selectionIndex: currentValue ? 0 : 1 })
      },
      [polishEnabled, copyEnabled, chatGptEnabled, jsonOutputEnabled],
    )

    const openFilePopup = useCallback(() => {
      setPopupState({ type: 'file', draft: '', selectionIndex: 0 })
    }, [])

    const openUrlPopup = useCallback(() => {
      setPopupState({ type: 'url', draft: '', selectionIndex: 0 })
    }, [])

    const openSmartPopup = useCallback(() => {
      setPopupState({ type: 'smart', draft: smartContextRoot ?? '' })
    }, [smartContextRoot])

    const openTestPopup = useCallback(() => {
      setPopupState({ type: 'test', draft: lastTestFile ?? DEFAULT_TEST_FILE })
    }, [lastTestFile])

    const handleCommandSelection = useCallback(
      (commandId: CommandDescriptor['id'], argsRaw?: string) => {
        if (commandId === 'model') {
          openModelPopup()
          return
        }
        if (commandId === 'polish' || commandId === 'copy' || commandId === 'chatgpt') {
          openTogglePopup(commandId)
          return
        }
        if (commandId === 'json') {
          if (interactiveTransportPath) {
            pushHistory(
              'JSON output is unavailable while interactive transport is enabled.',
              'system',
            )
            return
          }
          const normalized = argsRaw ? argsRaw.trim().toLowerCase() : ''
          if (normalized === 'on' || normalized === 'off') {
            const nextEnabled = normalized === 'on'

            setJsonOutputEnabled(nextEnabled)
            pushHistory(`JSON ${nextEnabled ? 'enabled' : 'disabled'}`)
            setInputValue('')
            return
          }
          openTogglePopup('json')
          return
        }
        if (commandId === 'file') {
          openFilePopup()
          return
        }
        if (commandId === 'url') {
          openUrlPopup()
          return
        }
        if (commandId === 'smart') {
          openSmartPopup()
          return
        }
        if (commandId === 'exit') {
          pushHistory('Exiting…', 'system')
          setInputValue('')
          exit()
          return
        }
        if (commandId === 'series') {
          if (isGenerating) {
            pushHistory('Generation already running. Please wait.', 'system')
            return
          }
          const trimmedArgs = argsRaw?.trim() ?? ''
          const intentSource = trimmedArgs || lastUserIntentRef.current || ''
          if (!intentSource) {
            pushHistory(
              'Series mode requires an intent. Use /series <intent> or submit an intent first.',
              'system',
            )
            return
          }
          lastUserIntentRef.current = intentSource
          pushHistory(`> /series ${intentSource}`, 'user')
          setInputValue('')
          void runSeriesGeneration(intentSource)
          return
        }
        if (commandId === 'test') {
          const trimmedArgs = argsRaw?.trim() ?? ''
          if (trimmedArgs) {
            void runTestsFromCommand(trimmedArgs)
          } else {
            openTestPopup()
          }
          return
        }
        pushHistory(`Selected ${commandId}`)
      },
      [
        openModelPopup,
        openTogglePopup,
        openFilePopup,
        openUrlPopup,
        openSmartPopup,
        runSeriesGeneration,
        openTestPopup,
        pushHistory,
        runTestsFromCommand,
        interactiveTransportPath,
        setJsonOutputEnabled,
        setInputValue,
        isGenerating,
        exit,
      ],
    )

    const handleSubmit = useCallback(
      (value: string) => {
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
        if (!trimmed) {
          setInputValue('')
          return
        }
        if (isGenerating) {
          pushHistory('Generation already running. Please wait.', 'system')
          setInputValue('')
          return
        }
        pushHistory(`> ${trimmed}`, 'user')
        lastUserIntentRef.current = trimmed
        setInputValue('')
        void runGeneration(trimmed)
      },
      [
        handleCommandSelection,
        isCommandMenuActive,
        isCommandMode,
        popupState,
        selectedCommand,
        isGenerating,
        runGeneration,
        pushHistory,
        commandArgsRaw,
      ],
    )

    const statusChips = useMemo(() => {
      const statusChip = isGenerating
        ? `[status:${SPINNER_FRAMES[spinnerIndex]} ${statusMessage}]`
        : `[status:${statusMessage}]`
      const chips = [statusChip, `[${currentModel}]`]
      chips.push(`[polish:${polishEnabled ? 'on' : 'off'}]`)
      chips.push(`[copy:${copyEnabled ? 'on' : 'off'}]`)
      chips.push(`[chatgpt:${chatGptEnabled ? 'on' : 'off'}]`)
      chips.push(`[json:${jsonOutputEnabled ? 'on' : 'off'}]`)
      chips.push(`[files:${files.length}]`)
      chips.push(`[urls:${urls.length}]`)
      chips.push(`[smart:${smartContextEnabled ? 'on' : 'off'}]`)
      chips.push(`[tests:${isTestCommandRunning ? 'running' : 'idle'}]`)
      if (smartContextRoot) {
        chips.push(`[root:${smartContextRoot}]`)
      }

      return chips
    }, [
      isGenerating,
      spinnerIndex,
      statusMessage,
      currentModel,
      polishEnabled,
      copyEnabled,
      chatGptEnabled,
      jsonOutputEnabled,
      files.length,
      urls.length,
      smartContextEnabled,
      smartContextRoot,
      isTestCommandRunning,
    ])

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
                onSubmit={(option) => applyModelSelection(option)}
              />
            ) : popupState.type === 'toggle' ? (
              <TogglePopup
                label={TOGGLE_LABELS[popupState.field]}
                selectionIndex={popupState.selectionIndex}
              />
            ) : popupState.type === 'file' ? (
              <ListPopup
                title="File Context"
                placeholder="src/**/*.ts"
                draft={popupState.draft}
                items={files}
                selectedIndex={popupState.selectionIndex}
                emptyLabel="No file globs added"
                instructions="Enter to add · ↑/↓ to select · Del to remove · Esc to close"
                onDraftChange={(next) =>
                  setPopupState((prev) => (prev?.type === 'file' ? { ...prev, draft: next } : prev))
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
            ) : popupState.type === 'test' ? (
              <TestPopup
                draft={popupState.draft}
                placeholder={DEFAULT_TEST_FILE}
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
          statusChips={statusChips}
        />
      </Box>
    )
  },
)
