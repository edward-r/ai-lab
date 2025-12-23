import { useCallback } from 'react'

import type { HistoryEntry, PopupState } from '../../../types'

import { useIntentSubmitHandler } from './useIntentSubmitHandler'

export type UseCommandScreenSubmitBindingsOptions = {
  popupState: PopupState

  isAwaitingRefinement: boolean
  submitRefinement: (value: string) => void

  isCommandMenuActive: boolean
  selectedCommandId: import('../../../types').CommandDescriptor['id'] | null
  commandMenuArgsRaw: string
  isCommandMode: boolean

  intentFilePath: string
  isGenerating: boolean

  expandInputForSubmit: (value: string) => string
  setInputValue: (value: string | ((prev: string) => string)) => void

  pushHistory: (content: string, kind?: HistoryEntry['kind']) => void
  addCommandHistoryEntry: (value: string) => void

  runGeneration: (payload: { intent?: string; intentFile?: string }) => Promise<void>

  handleCommandSelection: (
    commandId: import('../../../types').CommandDescriptor['id'],
    argsRaw?: string,
  ) => void
  handleNewCommand: (argsRaw: string) => void
  handleReuseCommand: () => void

  lastUserIntentRef: import('react').MutableRefObject<string | null>

  handleSeriesIntentSubmit: (value: string) => void
}

export type UseCommandScreenSubmitBindingsResult = {
  handleSubmit: (value: string) => void
  onSeriesSubmit: (value: string) => void
}

export const useCommandScreenSubmitBindings = ({
  popupState,
  isAwaitingRefinement,
  submitRefinement,
  isCommandMenuActive,
  selectedCommandId,
  commandMenuArgsRaw,
  isCommandMode,
  intentFilePath,
  isGenerating,
  expandInputForSubmit,
  setInputValue,
  pushHistory,
  addCommandHistoryEntry,
  runGeneration,
  handleCommandSelection,
  handleNewCommand,
  handleReuseCommand,
  lastUserIntentRef,
  handleSeriesIntentSubmit,
}: UseCommandScreenSubmitBindingsOptions): UseCommandScreenSubmitBindingsResult => {
  const handleSubmit = useIntentSubmitHandler({
    popupState,
    isAwaitingRefinement,
    submitRefinement,
    isCommandMenuActive,
    selectedCommandId,
    commandMenuArgsRaw,
    isCommandMode,
    intentFilePath,
    isGenerating,
    expandInputForSubmit,
    setInputValue,
    pushHistory,
    addCommandHistoryEntry,
    runGeneration,
    handleCommandSelection,
    handleNewCommand,
    handleReuseCommand,
    lastUserIntentRef,
  })

  const onSeriesSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      if (trimmed) {
        addCommandHistoryEntry(`/series ${trimmed}`)
      }
      handleSeriesIntentSubmit(value)
    },
    [addCommandHistoryEntry, handleSeriesIntentSubmit],
  )

  return {
    handleSubmit,
    onSeriesSubmit,
  }
}
