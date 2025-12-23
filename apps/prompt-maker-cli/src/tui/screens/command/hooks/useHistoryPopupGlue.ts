import { useCallback, useEffect, useMemo } from 'react'

import type { PopupState } from '../../../types'

type SetPopupState = (next: PopupState | ((prev: PopupState) => PopupState)) => void

type ClosePopup = () => void

type SetInputValue = (next: string) => void

type ConsumeSuppressedTextInputChange = () => boolean

type SuppressNextInput = () => void

export type UseHistoryPopupGlueOptions = {
  popupState: PopupState
  setPopupState: SetPopupState
  closePopup: ClosePopup
  setInputValue: SetInputValue
  consumeSuppressedTextInputChange: ConsumeSuppressedTextInputChange
  suppressNextInput: SuppressNextInput

  commandHistoryValues: readonly string[]
}

export type UseHistoryPopupGlueResult = {
  historyPopupItems: string[]
  onHistoryPopupDraftChange: (next: string) => void
  onHistoryPopupSubmit: (value: string) => void
}

export const useHistoryPopupGlue = ({
  popupState,
  setPopupState,
  closePopup,
  setInputValue,
  consumeSuppressedTextInputChange,
  suppressNextInput,
  commandHistoryValues,
}: UseHistoryPopupGlueOptions): UseHistoryPopupGlueResult => {
  const historyPopupDraft = popupState?.type === 'history' ? popupState.draft : ''

  const historyPopupItems = useMemo(() => {
    const trimmed = historyPopupDraft.trim().toLowerCase()
    if (!trimmed) {
      return [...commandHistoryValues]
    }
    return commandHistoryValues.filter((value) => value.toLowerCase().includes(trimmed))
  }, [commandHistoryValues, historyPopupDraft])

  useEffect(() => {
    if (popupState?.type !== 'history') {
      return
    }

    setPopupState((prev) => {
      if (prev?.type !== 'history') {
        return prev
      }
      const maxIndex = Math.max(historyPopupItems.length - 1, 0)
      const nextIndex = Math.min(prev.selectionIndex, maxIndex)
      return prev.selectionIndex === nextIndex ? prev : { ...prev, selectionIndex: nextIndex }
    })
  }, [historyPopupItems.length, popupState?.type, setPopupState])

  const onHistoryPopupDraftChange = useCallback(
    (next: string) => {
      if (consumeSuppressedTextInputChange()) {
        return
      }
      setPopupState((prev) =>
        prev?.type === 'history' ? { ...prev, draft: next, selectionIndex: 0 } : prev,
      )
    },
    [consumeSuppressedTextInputChange, setPopupState],
  )

  const onHistoryPopupSubmit = useCallback(
    (value: string) => {
      if (popupState?.type !== 'history') {
        return
      }

      const trimmed = value.trim()
      const fallback = historyPopupItems[popupState.selectionIndex] ?? ''
      const selection = trimmed || fallback
      if (!selection.trim()) {
        return
      }

      suppressNextInput()
      setInputValue(selection)
      closePopup()
    },
    [closePopup, historyPopupItems, popupState, setInputValue, suppressNextInput],
  )

  return {
    historyPopupItems,
    onHistoryPopupDraftChange,
    onHistoryPopupSubmit,
  }
}
