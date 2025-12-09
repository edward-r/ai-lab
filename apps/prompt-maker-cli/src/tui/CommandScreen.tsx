import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Text, useInput, useStdout } from 'ink'
import TextInput from 'ink-text-input'

const INPUT_BAR_MIN_ROWS = 3

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
    const ninetyPercent = Math.floor(terminalRows * 0.9)
    const availableWithoutInput = Math.max(terminalRows - INPUT_BAR_MIN_ROWS, 1)
    return Math.max(1, Math.min(ninetyPercent, availableWithoutInput))
  }, [terminalRows])

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

  useInput((_, key) => {
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
  })

  const handleSubmit = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      setInputValue('')
      return
    }
    setHistory((prev) => [...prev, `> ${trimmed}`])
    setInputValue('')
    setIsPinnedToBottom(true)
  }, [])

  return (
    <Box flexDirection="column" flexGrow={1} height="100%" paddingX={1} paddingY={1}>
      <Box flexDirection="column" flexGrow={1} height={historyRows} marginBottom={1}>
        <ScrollableOutput lines={history} visibleRows={historyRows} scrollOffset={scrollOffset} />
      </Box>
      <InputBar value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} />
    </Box>
  )
}
