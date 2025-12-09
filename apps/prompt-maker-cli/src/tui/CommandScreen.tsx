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
  { id: 'chatgpt', label: 'ChatGPT', description: 'Open ChatGPT automatically' },
] as const
const COMMAND_MENU_HEIGHT = COMMAND_DESCRIPTORS.length + 2

const MODEL_OPTIONS = [
  { id: 'gpt-4o-mini', label: 'gpt-4o-mini', description: 'OpenAI general-purpose LLM' },
  { id: 'gemini-1.5-pro', label: 'gemini-1.5-pro', description: 'Google Gemini multimodal' },
]
const MODEL_POPUP_HEIGHT = MODEL_OPTIONS.length + 5
const TOGGLE_POPUP_HEIGHT = 6

const TOGGLE_LABELS = {
  polish: 'Polish',
  copy: 'Copy',
  chatgpt: 'ChatGPT',
} as const

const WELCOME_LINES = [
  'Welcome to the Prompt Maker command palette preview.',
  'Type natural language requests or start a command with /.',
  'Press Enter to log input; arrow keys scroll history.',
]

type CommandDescriptor = (typeof COMMAND_DESCRIPTORS)[number]
type ModelOption = (typeof MODEL_OPTIONS)[number]
type ToggleField = keyof typeof TOGGLE_LABELS

type PopupState =
  | { type: 'model'; query: string; selectionIndex: number }
  | { type: 'toggle'; field: ToggleField; selectionIndex: number }
  | null

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

type ModelPopupProps = {
  query: string
  options: readonly ModelOption[]
  selectedIndex: number
  onQueryChange: (value: string) => void
  onSubmit: () => void
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
        onSubmit={onSubmit}
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
        <Text color="gray">Enter to confirm · Esc to cancel</Text>
      </Box>
    </Box>
  )
}

type CommandScreenProps = {
  interactiveTransportPath?: string | undefined
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

export const CommandScreen: React.FC<CommandScreenProps> = ({ interactiveTransportPath }) => {
  const { stdout } = useStdout()
  const [terminalRows, setTerminalRows] = useState(stdout?.rows ?? 24)
  const [history, setHistory] = useState<string[]>(() => [...WELCOME_LINES])
  const [inputValue, setInputValue] = useState('')
  const [scrollOffset, setScrollOffset] = useState(0)
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true)
  const [commandSelectionIndex, setCommandSelectionIndex] = useState(0)
  const [popupState, setPopupState] = useState<PopupState>(null)
  const [currentModel, setCurrentModel] = useState<ModelOption['id']>('gpt-4o-mini')
  const [polishEnabled, setPolishEnabled] = useState(false)
  const [copyEnabled, setCopyEnabled] = useState(false)
  const [chatGptEnabled, setChatGptEnabled] = useState(false)

  const trimmedInput = inputValue.trimStart()
  const isCommandMode = trimmedInput.startsWith('/')
  const commandQuery = isCommandMode ? trimmedInput.slice(1).trimStart() : ''
  const normalizedQuery = commandQuery.toLowerCase()
  const isPopupOpen = popupState !== null

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
  const popupOverlayHeight = popupState
    ? popupState.type === 'model'
      ? MODEL_POPUP_HEIGHT
      : TOGGLE_POPUP_HEIGHT
    : 0
  const overlayHeight = popupOverlayHeight || menuHeight

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
    const rowsAfterOverlays = Math.max(terminalRows - INPUT_BAR_MIN_ROWS - overlayHeight, 1)
    const ninetyPercent = Math.floor(Math.max(terminalRows - overlayHeight, 1) * 0.9)
    return Math.max(1, Math.min(ninetyPercent, rowsAfterOverlays))
  }, [terminalRows, overlayHeight])

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

  const applyModelSelection = useCallback((option: ModelOption | undefined) => {
    if (!option) {
      return
    }
    setCurrentModel(option.id)
    setHistory((prev) => [...prev, `Model set to ${option.id}`])
    setInputValue('')
    setIsPinnedToBottom(true)
    setPopupState(null)
  }, [])

  const applyToggleSelection = useCallback((field: ToggleField, value: boolean) => {
    const message = `${TOGGLE_LABELS[field]} ${value ? 'enabled' : 'disabled'}`
    if (field === 'polish') {
      setPolishEnabled(value)
    } else if (field === 'copy') {
      setCopyEnabled(value)
    } else if (field === 'chatgpt') {
      setChatGptEnabled(value)
    }
    setHistory((prev) => [...prev, message])
    setInputValue('')
    setIsPinnedToBottom(true)
    setPopupState(null)
  }, [])

  useInput(
    (_input, key) => {
      if (!popupState) {
        return
      }
      if (popupState.type === 'model') {
        const options = filterModelOptions(popupState.query)
        if (key.upArrow) {
          if (!options.length) {
            return
          }
          setPopupState((prev) => {
            if (!prev || prev.type !== 'model') {
              return prev
            }
            const nextIndex = (prev.selectionIndex - 1 + options.length) % options.length
            return { ...prev, selectionIndex: nextIndex }
          })
          return
        }
        if (key.downArrow) {
          if (!options.length) {
            return
          }
          setPopupState((prev) => {
            if (!prev || prev.type !== 'model') {
              return prev
            }
            const nextIndex = (prev.selectionIndex + 1) % options.length
            return { ...prev, selectionIndex: nextIndex }
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
          setPopupState((prev) => {
            if (!prev || prev.type !== 'toggle') {
              return prev
            }
            const nextIndex = (prev.selectionIndex - 1 + options.length) % options.length
            return { ...prev, selectionIndex: nextIndex }
          })
          return
        }
        if (key.rightArrow || key.downArrow) {
          setPopupState((prev) => {
            if (!prev || prev.type !== 'toggle') {
              return prev
            }
            const nextIndex = (prev.selectionIndex + 1) % options.length
            return { ...prev, selectionIndex: nextIndex }
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

  const handleCommandSelection = useCallback(
    (commandId: CommandDescriptor['id']) => {
      if (commandId === 'model') {
        openModelPopup()
        return
      }
      if (commandId === 'polish' || commandId === 'copy' || commandId === 'chatgpt') {
        openTogglePopup(commandId)
        return
      }
      setHistory((prev) => [...prev, `Selected ${commandId}`])
      setIsPinnedToBottom(true)
    },
    [openModelPopup, openTogglePopup],
  )

  const handleSubmit = useCallback(
    (value: string) => {
      if (popupState) {
        return
      }

      if (isCommandMenuActive) {
        if (selectedCommand) {
          handleCommandSelection(selectedCommand.id)
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
      setHistory((prev) => [...prev, `> ${trimmed}`])
      setInputValue('')
      setIsPinnedToBottom(true)
    },
    [handleCommandSelection, isCommandMenuActive, isCommandMode, popupState, selectedCommand],
  )

  const statusChips = useMemo(() => {
    const chips = [`[${currentModel}]`]
    chips.push(`[polish:${polishEnabled ? 'on' : 'off'}]`)
    chips.push(`[copy:${copyEnabled ? 'on' : 'off'}]`)
    chips.push(`[chatgpt:${chatGptEnabled ? 'on' : 'off'}]`)
    return chips
  }, [currentModel, polishEnabled, copyEnabled, chatGptEnabled])

  const modelPopupOptions = popupState?.type === 'model' ? filterModelOptions(popupState.query) : []
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
                setPopupState((prev) => {
                  if (!prev || prev.type !== 'model') {
                    return prev
                  }
                  return { ...prev, query: next, selectionIndex: 0 }
                })
              }
              onSubmit={() => applyModelSelection(modelPopupOptions[modelPopupSelection])}
            />
          ) : (
            <TogglePopup field={popupState.field} selectionIndex={popupState.selectionIndex} />
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
        onChange={(next) => {
          if (popupState) {
            return
          }
          setInputValue(next)
        }}
        onSubmit={handleSubmit}
        isDisabled={isPopupOpen}
        statusChips={statusChips}
      />
    </Box>
  )
}
