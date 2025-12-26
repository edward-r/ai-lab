import fs from 'node:fs'

import type { WriteStream } from 'node:tty'
import { useEffect, useMemo } from 'react'

import { COMMAND_DESCRIPTORS, POPUP_HEIGHTS } from '../../../config'
import { parseAbsolutePathFromInput } from '../../../drag-drop-path'
import { useCommandHistory } from '../../../hooks/useCommandHistory'
import type { HistoryEntry, PopupState } from '../../../types'

import { useCommandMenuManager } from './useCommandMenuManager'
import { useCommandScreenLayout } from './useCommandScreenLayout'
import { useHistoryScrollKeys } from './useHistoryScrollKeys'
import { usePopupSelectionClamp } from './usePopupSelectionClamp'
import { useSessionCommands } from './useSessionCommands'
import { useTerminalEffects } from './useTerminalEffects'

const APP_STATIC_ROWS = 7
const COMMAND_SCREEN_OVERHEAD_ROWS = 3
const COMMAND_MENU_HEIGHT = COMMAND_DESCRIPTORS.length + 2

const EMPTY_HISTORY: HistoryEntry[] = []

type SetPopupState = import('react').Dispatch<import('react').SetStateAction<PopupState>>

type UseCommandScreenShellOptions = {
  stdout: WriteStream | undefined
  setTerminalSize: (rows: number, columns: number) => void
  interactiveTransportPath?: string | undefined

  // screen state
  terminalRows: number
  inputValue: string
  debugKeyLine: string | null
  debugKeysEnabled: boolean
  helpOpen: boolean
  reservedRows: number

  popupState: PopupState
  isPopupOpen: boolean
  setPopupState: SetPopupState

  commandMenuSignal?: number | undefined
  commandSelectionIndex: number
  setCommandSelectionIndex: (next: number | ((prev: number) => number)) => void

  // generation state
  isGenerating: boolean
  awaitingInteractiveMode:
    | import('../../../generation-pipeline-reducer').InteractiveAwaitingMode
    | null

  // context
  files: string[]
  urls: string[]
  lastGeneratedPrompt: string | null
  resetContext: () => void

  // mutable refs
  lastUserIntentRef: import('react').MutableRefObject<string | null>
  lastTypedIntentRef: import('react').MutableRefObject<string>

  // setters
  setInputValue: (value: string | ((prev: string) => string)) => void
  setIntentFilePath: (value: string) => void
  setMetaInstructions: (value: string) => void

  scrollToRef: import('react').MutableRefObject<(row: number) => void>
  clearHistoryRef: import('react').MutableRefObject<() => void>
  pushHistoryRef: import('react').MutableRefObject<
    (content: string, kind?: HistoryEntry['kind']) => void
  >
  scrollToProxy: (row: number) => void
}

export type UseCommandScreenShellResult = {
  // menu
  isCommandMode: boolean
  commandMenuArgsRaw: string
  visibleCommands: readonly import('../../../types').CommandDescriptor[]
  isCommandMenuActive: boolean
  menuHeight: number
  selectedCommand: import('../../../types').CommandDescriptor | undefined

  // layout
  overlayHeight: number
  inputBarHint: string | undefined
  inputBarDebugLine: string | undefined
  isAwaitingTransportInput: boolean
  historyRows: number

  // history output
  history: HistoryEntry[]
  scrollOffset: number
  scrollBy: (delta: number) => void

  // history
  scrollTo: (row: number) => void
  clearHistory: () => void

  // session
  handleNewCommand: (argsRaw: string) => void
  handleReuseCommand: () => void
}

export const useCommandScreenShell = ({
  stdout,
  setTerminalSize,
  interactiveTransportPath,
  terminalRows,
  inputValue,
  debugKeyLine,
  debugKeysEnabled,
  helpOpen,
  reservedRows,
  popupState,
  isPopupOpen,
  setPopupState,
  commandMenuSignal,
  commandSelectionIndex,
  setCommandSelectionIndex,
  isGenerating,
  awaitingInteractiveMode,
  files,
  urls,
  lastGeneratedPrompt,
  resetContext,
  lastUserIntentRef,
  lastTypedIntentRef,
  setInputValue,
  setIntentFilePath,
  setMetaInstructions,
  scrollToRef,
  clearHistoryRef,
  pushHistoryRef,
  scrollToProxy,
}: UseCommandScreenShellOptions): UseCommandScreenShellResult => {
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

  const { overlayHeight, inputBarHint, inputBarDebugLine, isAwaitingTransportInput, historyRows } =
    useCommandScreenLayout({
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

  const {
    history,
    resetHistory: resetOutputHistory,
    clearHistory,
    pushHistory: pushOutputHistory,
    scroll,
  } = useCommandHistory({
    initialEntries: EMPTY_HISTORY,
    visibleRows: historyRows,
  })

  // Keep upstream refs in sync.
  useEffect(() => {
    pushHistoryRef.current = pushOutputHistory
    clearHistoryRef.current = clearHistory
    scrollToRef.current = scroll.scrollTo
  }, [
    clearHistory,
    pushHistoryRef,
    pushOutputHistory,
    scroll.scrollTo,
    scrollToRef,
    clearHistoryRef,
  ])

  useTerminalEffects({
    stdout,
    setTerminalSize,
    interactiveTransportPath,
    history,
    pushHistory: pushOutputHistory,
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
    scrollBy: scroll.scrollBy,
  })

  const { handleNewCommand, handleReuseCommand } = useSessionCommands({
    isGenerating,
    lastGeneratedPrompt,
    resetContext,
    resetHistory: resetOutputHistory,
    scrollTo: scroll.scrollTo,
    setInputValue,
    setPopupState,
    setIntentFilePath,
    setMetaInstructions,
    lastUserIntentRef,
    lastTypedIntentRef,
    pushHistory: pushOutputHistory,
  })

  return {
    isCommandMode,
    commandMenuArgsRaw,
    visibleCommands,
    isCommandMenuActive,
    menuHeight,
    selectedCommand,
    overlayHeight,
    inputBarHint,
    inputBarDebugLine,
    isAwaitingTransportInput,
    historyRows,
    history,
    scrollOffset: scroll.offset,
    scrollBy: scroll.scrollBy,
    scrollTo: scroll.scrollTo,
    clearHistory,
    handleNewCommand,
    handleReuseCommand,
  }
}
