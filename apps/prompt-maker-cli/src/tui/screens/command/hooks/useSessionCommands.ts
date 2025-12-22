import type { MutableRefObject } from 'react'
import { useCallback } from 'react'

import { planSessionCommand } from '../../../new-command'
import type { HistoryEntry, PopupState } from '../../../types'

type ResetContext = () => void

type ResetHistory = () => void

type ScrollTo = (row: number) => void

type SetInputValue = (next: string) => void

type SetPopupState = (next: PopupState | ((prev: PopupState) => PopupState)) => void

type SetMetaInstructions = (next: string) => void

type PushHistory = (content: string, kind?: HistoryEntry['kind']) => void

export type UseSessionCommandsOptions = {
  isGenerating: boolean
  lastGeneratedPrompt: string | null

  resetContext: ResetContext
  resetHistory: ResetHistory
  scrollTo: ScrollTo

  setInputValue: SetInputValue
  setPopupState: SetPopupState
  setIntentFilePath: (value: string) => void
  setMetaInstructions: SetMetaInstructions

  lastUserIntentRef: MutableRefObject<string | null>
  lastTypedIntentRef: MutableRefObject<string>

  pushHistory: PushHistory
}

export type UseSessionCommandsResult = {
  resetSessionState: () => void
  handleNewCommand: (argsRaw: string) => void
  handleReuseCommand: () => void
}

export const useSessionCommands = ({
  isGenerating,
  lastGeneratedPrompt,
  resetContext,
  resetHistory,
  scrollTo,
  setInputValue,
  setPopupState,
  setIntentFilePath,
  setMetaInstructions,
  lastUserIntentRef,
  lastTypedIntentRef,
  pushHistory,
}: UseSessionCommandsOptions): UseSessionCommandsResult => {
  const resetSessionState = useCallback(() => {
    resetContext()
    setIntentFilePath('')
    lastUserIntentRef.current = null
    lastTypedIntentRef.current = ''
    setInputValue('')
    setPopupState(null)
    resetHistory()
    scrollTo(Number.MAX_SAFE_INTEGER)
  }, [
    lastTypedIntentRef,
    lastUserIntentRef,
    resetContext,
    resetHistory,
    scrollTo,
    setInputValue,
    setIntentFilePath,
    setPopupState,
  ])

  const handleNewCommand = useCallback(
    (argsRaw: string) => {
      if (isGenerating) {
        pushHistory('[new] Cannot reset while generation is running.', 'system')
        return
      }

      resetSessionState()
      const plan = planSessionCommand({ commandId: 'new', lastGeneratedPrompt: null })
      pushHistory(plan.message, 'system')

      if (argsRaw.includes('--reuse')) {
        pushHistory('[new] Tip: use /reuse to reuse the last prompt.', 'system')
      }
    },
    [isGenerating, pushHistory, resetSessionState],
  )

  const handleReuseCommand = useCallback(() => {
    if (isGenerating) {
      pushHistory('[reuse] Cannot reset while generation is running.', 'system')
      return
    }

    const previousPrompt = lastGeneratedPrompt
    resetSessionState()
    const plan = planSessionCommand({
      commandId: 'reuse',
      lastGeneratedPrompt: previousPrompt,
    })

    if (plan.type === 'reset-and-load-meta') {
      setMetaInstructions(plan.metaInstructions)
    }

    pushHistory(plan.message, 'system')
  }, [isGenerating, lastGeneratedPrompt, pushHistory, resetSessionState, setMetaInstructions])

  return {
    resetSessionState,
    handleNewCommand,
    handleReuseCommand,
  }
}
