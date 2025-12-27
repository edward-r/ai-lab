import fs from 'node:fs'

import type { MutableRefObject } from 'react'
import { useCallback, useMemo, useRef } from 'react'

import type { DebugKeyEvent } from '../../../components/core/MultilineTextInput'
import { isCommandInput } from '../../../drag-drop-path'
import type { HistoryEntry } from '../../../types'

import { useCommandScreen } from '../useCommandScreen'
import { formatDebugKeyEvent } from '../utils/debug-keys'

export type UseCommandScreenInputStateOptions = {
  pushHistoryProxy: (content: string, kind?: HistoryEntry['kind']) => void
}

export type UseCommandScreenInputStateResult = {
  // Screen state
  terminalRows: number
  terminalColumns: number
  inputValue: string
  isPasteActive: boolean
  commandSelectionIndex: number
  debugKeyLine: string | null

  // Setters
  setTerminalSize: (rows: number, columns: number) => void
  setInputValue: (value: string | ((prev: string) => string)) => void
  setPasteActive: (active: boolean) => void
  setCommandSelectionIndex: (next: number | ((prev: number) => number)) => void
  setDebugKeyLine: (value: string) => void

  // Local toggles/state
  intentFilePath: string
  setIntentFilePath: (value: string) => void
  polishEnabled: boolean
  setPolishEnabled: (value: boolean) => void
  copyEnabled: boolean
  setCopyEnabled: (value: boolean) => void
  chatGptEnabled: boolean
  setChatGptEnabled: (value: boolean) => void
  jsonOutputEnabled: boolean
  setJsonOutputEnabled: (value: boolean) => void

  // Intent refs
  lastUserIntentRef: MutableRefObject<string | null>
  lastTypedIntentRef: MutableRefObject<string>

  // Text input suppression
  consumeSuppressedTextInputChange: () => boolean
  suppressNextInput: () => void

  // Debug
  debugKeysEnabled: boolean
  onDebugKeyEvent: (event: DebugKeyEvent) => void

  // Helpers
  updateLastTypedIntent: (next: string) => void
}

export const useCommandScreenInputState = ({
  pushHistoryProxy: _pushHistoryProxy,
}: UseCommandScreenInputStateOptions): UseCommandScreenInputStateResult => {
  const {
    state: screenState,
    setTerminalSize,
    setInputValue,
    setPasteActive,
    setCommandSelectionIndex,
    setDebugKeyLine,
    setIntentFilePath: setIntentFilePathState,
    setPolishEnabled: setPolishEnabledState,
    setCopyEnabled: setCopyEnabledState,
    setChatGptEnabled: setChatGptEnabledState,
    setJsonOutputEnabled: setJsonOutputEnabledState,
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

  const onDebugKeyEvent = useCallback(
    (event: DebugKeyEvent): void => {
      if (!debugKeysEnabled) {
        return
      }
      setDebugKeyLine(formatDebugKeyEvent(event))
    },
    [debugKeysEnabled, setDebugKeyLine],
  )

  const intentFilePath = screenState.intentFilePath
  const polishEnabled = screenState.polishEnabled
  const copyEnabled = screenState.copyEnabled
  const chatGptEnabled = screenState.chatGptEnabled
  const jsonOutputEnabled = screenState.jsonOutputEnabled

  const setIntentFilePath = useCallback(
    (value: string) => {
      setIntentFilePathState(value)
    },
    [setIntentFilePathState],
  )

  const setPolishEnabled = useCallback(
    (value: boolean) => {
      setPolishEnabledState(value)
    },
    [setPolishEnabledState],
  )

  const setCopyEnabled = useCallback(
    (value: boolean) => {
      setCopyEnabledState(value)
    },
    [setCopyEnabledState],
  )

  const setChatGptEnabled = useCallback(
    (value: boolean) => {
      setChatGptEnabledState(value)
    },
    [setChatGptEnabledState],
  )

  const setJsonOutputEnabled = useCallback(
    (value: boolean) => {
      setJsonOutputEnabledState(value)
    },
    [setJsonOutputEnabledState],
  )

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

  return {
    terminalRows,
    terminalColumns,
    inputValue,
    isPasteActive,
    commandSelectionIndex,
    debugKeyLine,
    setTerminalSize,
    setInputValue,
    setPasteActive,
    setCommandSelectionIndex,
    setDebugKeyLine,
    intentFilePath,
    setIntentFilePath,
    polishEnabled,
    setPolishEnabled,
    copyEnabled,
    setCopyEnabled,
    chatGptEnabled,
    setChatGptEnabled,
    jsonOutputEnabled,
    setJsonOutputEnabled,
    lastUserIntentRef,
    lastTypedIntentRef,
    consumeSuppressedTextInputChange,
    suppressNextInput,
    debugKeysEnabled,
    onDebugKeyEvent,
    updateLastTypedIntent,
  }
}
