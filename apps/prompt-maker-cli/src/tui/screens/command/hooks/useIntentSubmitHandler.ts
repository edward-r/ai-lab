import type { MutableRefObject } from 'react'
import { useCallback } from 'react'

import type { CommandDescriptor, HistoryEntry, PopupState } from '../../../types'

import { resolveSubmitPlan } from '../utils/submit-plan'

type PushHistory = (content: string, kind?: HistoryEntry['kind']) => void

type AddCommandHistoryEntry = (value: string) => void

type RunGeneration = (payload: { intent?: string; intentFile?: string }) => Promise<void>

export type UseIntentSubmitHandlerOptions = {
  popupState: PopupState
  isAwaitingRefinement: boolean
  submitRefinement: (value: string) => void

  isCommandMenuActive: boolean
  selectedCommandId: CommandDescriptor['id'] | null
  commandMenuArgsRaw: string

  isCommandMode: boolean

  intentFilePath: string
  isGenerating: boolean

  expandInputForSubmit: (value: string) => string

  setInputValue: (value: string) => void
  pushHistory: PushHistory
  addCommandHistoryEntry: AddCommandHistoryEntry

  runGeneration: RunGeneration

  handleCommandSelection: (commandId: CommandDescriptor['id'], argsRaw?: string) => void
  handleNewCommand: (argsRaw: string) => void
  handleReuseCommand: () => void

  lastUserIntentRef: MutableRefObject<string | null>
}

export const useIntentSubmitHandler = ({
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
}: UseIntentSubmitHandlerOptions): ((value: string) => void) => {
  return useCallback(
    (value: string) => {
      const expandedValue = expandInputForSubmit(value)

      const plan = resolveSubmitPlan({
        expandedValue,
        isAwaitingRefinement,
        popupOpen: Boolean(popupState),
        isCommandMenuActive,
        selectedCommandId,
        commandMenuArgsRaw,
        isCommandMode,
        intentFilePath,
        isGenerating,
      })

      for (const action of plan) {
        switch (action.type) {
          case 'set-input': {
            setInputValue(action.value)
            break
          }
          case 'push-history': {
            pushHistory(action.content, action.kind)
            break
          }
          case 'add-command-history': {
            addCommandHistoryEntry(action.value)
            break
          }
          case 'set-last-user-intent': {
            lastUserIntentRef.current = action.value
            break
          }
          case 'submit-refinement': {
            submitRefinement(action.value)
            break
          }
          case 'run-generation': {
            const payload: { intent?: string; intentFile?: string } = {}
            if (action.intent) {
              payload.intent = action.intent
            }
            if (action.intentFile) {
              payload.intentFile = action.intentFile
            }
            void runGeneration(payload)
            break
          }
          case 'run-new': {
            handleNewCommand(action.argsRaw)
            break
          }
          case 'run-reuse': {
            handleReuseCommand()
            break
          }
          case 'run-command': {
            handleCommandSelection(action.commandId, action.argsRaw)
            break
          }
          default: {
            throw new Error('Unhandled submit plan action')
          }
        }
      }
    },
    [
      addCommandHistoryEntry,
      commandMenuArgsRaw,
      expandInputForSubmit,
      handleCommandSelection,
      handleNewCommand,
      handleReuseCommand,
      intentFilePath,
      isAwaitingRefinement,
      isCommandMenuActive,
      isCommandMode,
      isGenerating,
      lastUserIntentRef,
      popupState,
      pushHistory,
      runGeneration,
      selectedCommandId,
      setInputValue,
      submitRefinement,
    ],
  )
}
