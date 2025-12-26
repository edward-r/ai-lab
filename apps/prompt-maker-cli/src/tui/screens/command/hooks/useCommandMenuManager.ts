import { useEffect, useMemo, useRef } from 'react'
import { useInput, type Key } from 'ink'

import { useStableCallback } from '../../../hooks/useStableCallback'

import { resolveCommandMenuKeyAction } from '../../../components/core/command-menu-keymap'
import { filterCommandDescriptors, resolveCommandMenuSearchState } from '../../../command-filter'
import type { CommandDescriptor, PopupState } from '../../../types'
import { isCommandInput } from '../../../drag-drop-path'

type SetNumber = (next: number | ((prev: number) => number)) => void

type ScrollTo = (row: number) => void

type SetInputValue = (next: string) => void

type SetPopupState = (next: PopupState | ((prev: PopupState) => PopupState)) => void

type ExistsSync = (candidate: string) => boolean

export type UseCommandMenuManagerOptions = {
  inputValue: string
  existsSync: ExistsSync
  popupState: PopupState
  helpOpen: boolean
  commandMenuSignal?: number

  commands: readonly CommandDescriptor[]
  commandMenuHeight: number

  commandSelectionIndex: number
  setCommandSelectionIndex: SetNumber

  setInputValue: SetInputValue
  setPopupState: SetPopupState
  scrollTo: ScrollTo
}

export type UseCommandMenuManagerResult = {
  isCommandMode: boolean
  commandMenuFilterQuery: string
  commandMenuArgsRaw: string
  visibleCommands: readonly CommandDescriptor[]
  isCommandMenuActive: boolean
  menuHeight: number
  selectedCommand: CommandDescriptor | undefined
}

export const useCommandMenuManager = ({
  inputValue,
  existsSync,
  popupState,
  helpOpen,
  commandMenuSignal,
  commands,
  commandMenuHeight,
  commandSelectionIndex,
  setCommandSelectionIndex,
  setInputValue,
  setPopupState,
  scrollTo,
}: UseCommandMenuManagerOptions): UseCommandMenuManagerResult => {
  const trimmedInput = inputValue.trimStart()
  const isCommandMode = isCommandInput(inputValue, existsSync)
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

  const commandArgsRaw = parsedCommand.args

  const commandMenuSearchState = useMemo(
    () => resolveCommandMenuSearchState({ commandQuery, commands }),
    [commandQuery, commands],
  )

  const commandMenuFilterQuery = commandMenuSearchState.filterQuery
  const commandMenuArgsRaw = commandMenuSearchState.treatRemainderAsArgs ? commandArgsRaw : ''

  const commandMatches = useMemo(() => {
    if (!isCommandMode) {
      return commands
    }

    return filterCommandDescriptors({
      query: commandMenuFilterQuery,
      commands,
    })
  }, [commandMenuFilterQuery, commands, isCommandMode])

  const visibleCommands = commandMatches
  const isPopupOpen = popupState !== null
  const isCommandMenuActive = isCommandMode && !isPopupOpen && !helpOpen

  const menuHeight = isCommandMenuActive
    ? Math.min(commandMenuHeight, Math.max(visibleCommands.length, 1) + 2)
    : 0

  useEffect(() => {
    setCommandSelectionIndex(0)
  }, [commandMenuFilterQuery, isCommandMode, setCommandSelectionIndex])

  useEffect(() => {
    if (!commandMatches.length) {
      setCommandSelectionIndex(0)
      return
    }
    setCommandSelectionIndex((prev) => Math.min(prev, commandMatches.length - 1))
  }, [commandMatches.length, setCommandSelectionIndex])

  const lastCommandMenuSignalRef = useRef<number>(0)
  useEffect(() => {
    if (!commandMenuSignal || commandMenuSignal === lastCommandMenuSignalRef.current) {
      return
    }

    lastCommandMenuSignalRef.current = commandMenuSignal
    setPopupState(null)
    setInputValue('/')
    setCommandSelectionIndex(0)
    scrollTo(Number.MAX_SAFE_INTEGER)
  }, [commandMenuSignal, scrollTo, setCommandSelectionIndex, setInputValue, setPopupState])

  const handleCommandMenuKey = useStableCallback((_input: string, key: Key) => {
    if (!isCommandMenuActive) {
      return
    }

    const action = resolveCommandMenuKeyAction({
      key,
      selectedIndex: commandSelectionIndex,
      itemCount: visibleCommands.length,
    })

    if (action.type === 'close') {
      setInputValue('')
      setCommandSelectionIndex(0)
      return
    }

    if (action.type === 'change-selection') {
      setCommandSelectionIndex(action.nextIndex)
    }
  })

  useInput(handleCommandMenuKey, { isActive: isCommandMenuActive && !helpOpen })

  const selectedCommand =
    isCommandMenuActive && visibleCommands.length > 0
      ? visibleCommands[Math.min(commandSelectionIndex, visibleCommands.length - 1)]
      : undefined

  return {
    isCommandMode,
    commandMenuFilterQuery,
    commandMenuArgsRaw,
    visibleCommands,
    isCommandMenuActive,
    menuHeight,
    selectedCommand,
  }
}
