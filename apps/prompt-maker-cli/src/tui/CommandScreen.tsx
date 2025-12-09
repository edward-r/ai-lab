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
import { Box, Text, useInput, useStdout } from 'ink'
import TextInput from 'ink-text-input'

import {
  runGeneratePipeline,
  maybeCopyToClipboard,
  maybeOpenChatGpt,
  type GenerateArgs,
  type GeneratePipelineOptions,
  type GeneratePipelineResult,
  type StreamEventInput,
} from '../generate-command'
import { runPromptTestSuite, type PromptTestRunReporter } from '../test-command'
import { useContextDispatch, useContextState } from './context'

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
  { id: 'copy', label: 'Copy', description: 'Auto-copy final prompt' },
  { id: 'chatgpt', label: 'ChatGPT', description: 'Open ChatGPT automatically' },
  { id: 'test', label: 'Test', description: 'Run prompt tests (/test <file>)' },
] as const
const COMMAND_MENU_HEIGHT = COMMAND_DESCRIPTORS.length + 2

const MODEL_OPTIONS = [
  { id: 'gpt-4o-mini', label: 'gpt-4o-mini', description: 'OpenAI general-purpose LLM' },
  { id: 'gemini-1.5-pro', label: 'gemini-1.5-pro', description: 'Google Gemini multimodal' },
] as const
const MODEL_POPUP_HEIGHT = MODEL_OPTIONS.length + 5
const TOGGLE_POPUP_HEIGHT = 6
const LIST_POPUP_HEIGHT = 12
const SMART_POPUP_HEIGHT = 9
const TEST_POPUP_HEIGHT = 7
const MAX_VISIBLE_LIST_ITEMS = 6
const SPINNER_FRAMES = ['◴', '◷', '◶', '◵'] as const
const DEFAULT_TEST_FILE = 'prompt-tests.yaml'

const TOGGLE_LABELS = {
  polish: 'Polish',
  copy: 'Copy',
  chatgpt: 'ChatGPT',
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
type ModelOption = (typeof MODEL_OPTIONS)[number]
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

type ScrollableOutputProps = {
  lines: readonly HistoryEntry[]
  visibleRows: number
  scrollOffset: number
}

const ScrollableOutput: React.FC<ScrollableOutputProps> = ({
  lines,
  visibleRows,
  scrollOffset,
}) => {
  const startIndex = Math.max(0, Math.min(scrollOffset, Math.max(0, lines.length - visibleRows)))
  const endIndex = Math.min(lines.length, startIndex + visibleRows)
  const visibleLines = useMemo(
    () => lines.slice(startIndex, endIndex),
    [lines, startIndex, endIndex],
  )

  return (
    <Box flexDirection="column" height={visibleRows} overflow="hidden">
      {visibleLines.map((entry, index) => {
        const key = `${entry.id}-${startIndex + index}`
        if (entry.kind === 'user') {
          return (
            <Text key={key} color="cyan">
              {entry.content}
            </Text>
          )
        }
        if (entry.kind === 'progress') {
          return (
            <Text key={key} color="yellow">
              {entry.content}
            </Text>
          )
        }
        return (
          <Text key={key} color="gray">
            {entry.content}
          </Text>
        )
      })}
    </Box>
  )
}

type InputBarProps = {
  value: string
  onChange: (next: string) => void
  onSubmit: (value: string) => void
  isDisabled?: boolean
  statusChips: readonly string[]
}

const InputBar: React.FC<InputBarProps> = ({
  value,
  onChange,
  onSubmit,
  isDisabled = false,
  statusChips,
}) => (
  <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
    <Text color="cyan">{statusChips.join(' ')}</Text>
    <Text color="gray">Intent / Command</Text>
    <Box>
      <Text color="cyan">› </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder="Describe your goal or type /command"
        focus={!isDisabled}
      />
    </Box>
  </Box>
)

type CommandMenuProps = {
  commands: readonly CommandDescriptor[]
  selectedIndex: number
}

const CommandMenu: React.FC<CommandMenuProps> = ({ commands, selectedIndex }) => (
  <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1} paddingY={0}>
    <Text color="magentaBright">Commands</Text>
    {commands.map((command, index) => {
      const isSelected = index === selectedIndex
      const shortcut = `/${command.id}`.padEnd(10)
      const textProps = isSelected
        ? ({ color: 'black', backgroundColor: 'magentaBright' } as const)
        : ({ color: 'white' } as const)
      return (
        <Text key={command.id} {...textProps}>
          {shortcut} {command.description}
        </Text>
      )
    })}
  </Box>
)

type ListPopupProps = {
  title: string
  placeholder: string
  draft: string
  items: readonly string[]
  selectedIndex: number
  emptyLabel: string
  instructions: string
  onDraftChange: (value: string) => void
  onSubmitDraft: (value: string) => void
}

const ListPopup: React.FC<ListPopupProps> = ({
  title,
  placeholder,
  draft,
  items,
  selectedIndex,
  emptyLabel,
  instructions,
  onDraftChange,
  onSubmitDraft,
}) => {
  const upperBound = Math.max(items.length - MAX_VISIBLE_LIST_ITEMS, 0)
  const start = Math.max(0, Math.min(selectedIndex - 2, upperBound))
  const visibleItems = items.slice(start, start + MAX_VISIBLE_LIST_ITEMS)

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="blue" paddingX={1} paddingY={0}>
      <Text color="blueBright">{title}</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text color="gray">Add new</Text>
        <TextInput
          value={draft}
          onChange={onDraftChange}
          placeholder={placeholder}
          onSubmit={() => onSubmitDraft(draft)}
          focus
        />
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {items.length === 0 ? (
          <Text color="gray">{emptyLabel}</Text>
        ) : (
          <>
            {start > 0 ? <Text color="gray">… earlier entries …</Text> : null}
            {visibleItems.map((value, index) => {
              const actualIndex = start + index
              const isSelected = actualIndex === selectedIndex
              const textProps = isSelected
                ? ({ color: 'black', backgroundColor: 'blueBright' } as const)
                : ({ color: 'white' } as const)
              return (
                <Text key={`${value}-${actualIndex}`} {...textProps}>
                  {actualIndex + 1}. {value}
                </Text>
              )
            })}
            {start + MAX_VISIBLE_LIST_ITEMS < items.length ? (
              <Text color="gray">… later entries …</Text>
            ) : null}
          </>
        )}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">{instructions}</Text>
      </Box>
    </Box>
  )
}

type ModelPopupProps = {
  query: string
  options: readonly ModelOption[]
  selectedIndex: number
  onQueryChange: (value: string) => void
  onSubmit: (option?: ModelOption) => void
}

const ModelPopup: React.FC<ModelPopupProps> = ({
  query,
  options,
  selectedIndex,
  onQueryChange,
  onSubmit,
}) => (
  <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
    <Text color="cyanBright">Select Model</Text>
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">Search</Text>
      <TextInput
        value={query}
        onChange={onQueryChange}
        onSubmit={() => onSubmit(options[selectedIndex])}
        placeholder="Start typing a model name"
        focus
      />
    </Box>
    <Box flexDirection="column" marginTop={1}>
      {options.length === 0 ? (
        <Text color="gray">No models match.</Text>
      ) : (
        options.map((option, index) => {
          const isSelected = index === selectedIndex
          const textProps = isSelected
            ? ({ color: 'black', backgroundColor: 'cyanBright' } as const)
            : ({ color: 'white' } as const)
          return (
            <Text key={option.id} {...textProps}>
              {option.label} · {option.description}
            </Text>
          )
        })
      )}
    </Box>
    <Box marginTop={1}>
      <Text color="gray">Enter to confirm · Esc to cancel</Text>
    </Box>
  </Box>
)

type TogglePopupProps = {
  field: ToggleField
  selectionIndex: number
}

const TogglePopup: React.FC<TogglePopupProps> = ({ field, selectionIndex }) => {
  const options = ['On', 'Off']
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} paddingY={0}>
      <Text color="yellowBright">{TOGGLE_LABELS[field]} Setting</Text>
      <Box flexDirection="column" marginTop={1}>
        {options.map((label, index) => {
          const isSelected = index === selectionIndex
          const textProps = isSelected
            ? ({ color: 'black', backgroundColor: 'yellowBright' } as const)
            : ({ color: 'white' } as const)
          return (
            <Text key={label} {...textProps}>
              {label}
            </Text>
          )
        })}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Use arrows to select · Enter to confirm · Esc to cancel</Text>
      </Box>
    </Box>
  )
}

type SmartPopupProps = {
  enabled: boolean
  draft: string
  onDraftChange: (value: string) => void
  onSubmitRoot: (value: string) => void
}

const SmartPopup: React.FC<SmartPopupProps> = ({ enabled, draft, onDraftChange, onSubmitRoot }) => (
  <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1} paddingY={0}>
    <Text color="greenBright">Smart Context</Text>
    <Box marginTop={1}>
      <Text color="white">Status: {enabled ? 'enabled' : 'disabled'} (press T to toggle)</Text>
    </Box>
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">Root override (Enter to apply; empty to clear)</Text>
      <TextInput
        value={draft}
        onChange={onDraftChange}
        onSubmit={() => onSubmitRoot(draft)}
        placeholder="/absolute/path or relative/dir"
        focus
      />
    </Box>
    <Box marginTop={1}>
      <Text color="gray">Enter to apply root · T to toggle · Esc to close</Text>
    </Box>
    <Box marginTop={1}>
      <Text color="gray">Current root will mirror saved value.</Text>
    </Box>
    <Box marginTop={1}>
      <Text color="gray">Toggle Smart Context carefully—long scans may take time.</Text>
    </Box>
  </Box>
)

type TestPopupProps = {
  draft: string
  isRunning: boolean
  onDraftChange: (value: string) => void
  onSubmitDraft: (value: string) => void
}

const TestPopup: React.FC<TestPopupProps> = ({
  draft,
  isRunning,
  onDraftChange,
  onSubmitDraft,
}) => (
  <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
    <Text color="cyanBright">Prompt Tests</Text>
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">Suite path (Enter to run; blank uses prompt-tests.yaml)</Text>
      <TextInput
        value={draft}
        onChange={onDraftChange}
        onSubmit={() => onSubmitDraft(draft)}
        placeholder="prompt-tests.yaml"
        focus
      />
    </Box>
    <Box marginTop={1}>
      <Text color="gray">
        {isRunning ? 'Tests running… please wait' : 'Enter to start tests · Esc to close'}
      </Text>
    </Box>
  </Box>
)

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
    const { stdout } = useStdout()
    const { files, urls, images, videos, smartContextEnabled, smartContextRoot } = useContextState()
    const { addFile, removeFile, addUrl, removeUrl, toggleSmartContext, setSmartRoot } =
      useContextDispatch()

    const [terminalRows, setTerminalRows] = useState(stdout?.rows ?? 24)
    const [history, setHistory] = useState<HistoryEntry[]>(() =>
      WELCOME_LINES.map((line, index) => ({
        id: `welcome-${index}`,
        content: line,
        kind: 'system',
      })),
    )
    const historyIdRef = useRef(WELCOME_LINES.length)
    const [inputValue, setInputValue] = useState('')
    const [scrollOffset, setScrollOffset] = useState(0)
    const [isPinnedToBottom, setIsPinnedToBottom] = useState(true)
    const [commandSelectionIndex, setCommandSelectionIndex] = useState(0)
    const [popupState, setPopupState] = useState<PopupState>(null)
    const [currentModel, setCurrentModel] = useState<ModelOption['id']>('gpt-4o-mini')
    const [polishEnabled, setPolishEnabled] = useState(false)
    const [copyEnabled, setCopyEnabled] = useState(false)
    const [chatGptEnabled, setChatGptEnabled] = useState(false)
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
        const message = `${TOGGLE_LABELS[field]} ${value ? 'enabled' : 'disabled'}`
        if (field === 'polish') {
          setPolishEnabled(value)
        } else if (field === 'copy') {
          setCopyEnabled(value)
        } else if (field === 'chatgpt') {
          setChatGptEnabled(value)
        }
        pushHistory(message)
        setInputValue('')
        setPopupState(null)
      },
      [pushHistory],
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
            json: false,
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
        smartContextEnabled,
        smartContextRoot,
        interactiveTransportPath,
        handleStreamEvent,
        pushHistory,
        setStatusMessage,
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
          field === 'polish' ? polishEnabled : field === 'copy' ? copyEnabled : chatGptEnabled
        setPopupState({ type: 'toggle', field, selectionIndex: currentValue ? 0 : 1 })
      },
      [polishEnabled, copyEnabled, chatGptEnabled],
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
        openTestPopup,
        pushHistory,
        runTestsFromCommand,
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
              <TogglePopup field={popupState.field} selectionIndex={popupState.selectionIndex} />
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
