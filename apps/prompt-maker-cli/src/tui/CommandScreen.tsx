import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Text, useInput, useStdout } from 'ink'
import TextInput from 'ink-text-input'

const INPUT_BAR_MIN_ROWS = 3
const COMMAND_DESCRIPTORS = [
  { id: 'model', label: 'Model', description: 'Switch the target LLM' },
  { id: 'file', label: 'File', description: 'Attach file context' },
  { id: 'url', label: 'URL', description: 'Add URL context' },
  { id: 'smart', label: 'Smart Context', description: 'Toggle smart context root' },
  { id: 'image', label: 'Image', description: 'Attach reference images' },
  { id: 'video', label: 'Video', description: 'Attach reference videos' },
  { id: 'polish', label: 'Polish', description: 'Enable prompt polishing' },
  { id: 'copy', label: 'Copy', description: 'Auto-copy final prompt' },
] as const
const COMMAND_MENU_HEIGHT = COMMAND_DESCRIPTORS.length + 2

type CommandDescriptor = (typeof COMMAND_DESCRIPTORS)[number]

const WELCOME_LINES = [
  'Welcome to the Prompt Maker command palette preview.',
  'Type natural language requests or start a command with /.',
  'Press Enter to log input; arrow keys scroll history.',
]

type ScrollableOutputProps = {
  lines: readonly string[]
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
      {visibleLines.map((line, index) => (
        <Text key={`${startIndex + index}:${line}`}>{line}</Text>
      ))}
    </Box>
  )
}

type InputBarProps = {
  value: string
  onChange: (next: string) => void
  onSubmit: (value: string) => void
}

const InputBar: React.FC<InputBarProps> = ({ value, onChange, onSubmit }) => (
  <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
    <Text color="gray">Intent / Command</Text>
    <Box>
      <Text color="cyan">› </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder="Describe your goal or type /command"
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

type CommandScreenProps = {
  interactiveTransportPath?: string | undefined
}

export const CommandScreen: React.FC<CommandScreenProps> = ({ interactiveTransportPath }) => {
  const { stdout } = useStdout()
  const [terminalRows, setTerminalRows] = useState(stdout?.rows ?? 24)
  const [history, setHistory] = useState<string[]>(() => [...WELCOME_LINES])
  const [inputValue, setInputValue] = useState('')
  const [scrollOffset, setScrollOffset] = useState(0)
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true)
  const [commandSelectionIndex, setCommandSelectionIndex] = useState(0)

  const trimmedInput = inputValue.trimStart()
  const isCommandMode = trimmedInput.startsWith('/')
  const commandQuery = isCommandMode ? trimmedInput.slice(1).trimStart() : ''
  const normalizedQuery = commandQuery.toLowerCase()

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
  const menuHeight = isCommandMode
    ? Math.min(COMMAND_MENU_HEIGHT, Math.max(visibleCommands.length, 1) + 2)
    : 0
  const selectedCommand =
    isCommandMode && commandMatches.length > 0
      ? commandMatches[Math.min(commandSelectionIndex, commandMatches.length - 1)]
      : undefined

  useEffect(() => {
    setCommandSelectionIndex(0)
  }, [normalizedQuery, isCommandMode])

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
      if (prev.includes(transportLine)) {
        return prev
      }
      return [...prev, transportLine]
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
    const availableWithoutInput = Math.max(terminalRows - INPUT_BAR_MIN_ROWS - menuHeight, 1)
    const ninetyPercent = Math.floor(Math.max(terminalRows - menuHeight, 1) * 0.9)
    return Math.max(1, Math.min(ninetyPercent, availableWithoutInput))
  }, [terminalRows, menuHeight])

  useEffect(() => {
    setScrollOffset((prev) => {
      const nextMax = Math.max(0, history.length - historyRows)
      if (isPinnedToBottom) {
        return nextMax
      }
      return Math.min(prev, nextMax)
    })
  }, [history, historyRows, isPinnedToBottom])

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
    { isActive: !isCommandMode },
  )

  useInput(
    (_input, key) => {
      if (!isCommandMode || !commandMatches.length) {
        return
      }
      if (key.upArrow) {
        setCommandSelectionIndex(
          (prev) => (prev - 1 + commandMatches.length) % commandMatches.length,
        )
        return
      }
      if (key.downArrow) {
        setCommandSelectionIndex((prev) => (prev + 1) % commandMatches.length)
        return
      }
      if (key.escape) {
        setInputValue('')
      }
    },
    { isActive: isCommandMode },
  )

  const handleSubmit = useCallback(
    (value: string) => {
      if (isCommandMode) {
        if (selectedCommand) {
          setHistory((prev) => [...prev, `Selected ${selectedCommand.id}`])
        }
        setInputValue('')
        setIsPinnedToBottom(true)
        setCommandSelectionIndex(0)
        return
      }

      const trimmed = value.trim()
      if (!trimmed) {
        setInputValue('')
        return
      }
      setHistory((prev) => [...prev, `> ${trimmed}`])
      setInputValue('')
      setIsPinnedToBottom(true)
    },
    [isCommandMode, selectedCommand],
  )

  return (
    <Box flexDirection="column" flexGrow={1} height="100%" paddingX={1} paddingY={1}>
      <Box flexDirection="column" flexGrow={1} height={historyRows} marginBottom={1}>
        <ScrollableOutput lines={history} visibleRows={historyRows} scrollOffset={scrollOffset} />
      </Box>
      {isCommandMode ? (
        <Box marginBottom={1}>
          <CommandMenu commands={visibleCommands} selectedIndex={commandSelectionIndex} />
        </Box>
      ) : null}
      <InputBar value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} />
    </Box>
  )
}
