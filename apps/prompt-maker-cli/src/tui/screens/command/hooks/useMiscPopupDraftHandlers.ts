import { useCallback } from 'react'

import type { PopupState } from '../../../types'

type SetPopupState = (next: PopupState | ((prev: PopupState) => PopupState)) => void

type ConsumeSuppressedTextInputChange = () => boolean

export type UseMiscPopupDraftHandlersOptions = {
  setPopupState: SetPopupState
  consumeSuppressedTextInputChange: ConsumeSuppressedTextInputChange
}

export type UseMiscPopupDraftHandlersResult = {
  onModelPopupQueryChange: (next: string) => void
  onSeriesDraftChange: (next: string) => void
  onInstructionsDraftChange: (next: string) => void
  onTestDraftChange: (next: string) => void
}

export const useMiscPopupDraftHandlers = ({
  setPopupState,
  consumeSuppressedTextInputChange,
}: UseMiscPopupDraftHandlersOptions): UseMiscPopupDraftHandlersResult => {
  const onModelPopupQueryChange = useCallback(
    (next: string) => {
      if (consumeSuppressedTextInputChange()) {
        return
      }
      setPopupState((prev) =>
        prev?.type === 'model' ? { ...prev, query: next, selectionIndex: 0 } : prev,
      )
    },
    [consumeSuppressedTextInputChange, setPopupState],
  )

  const onSeriesDraftChange = useCallback(
    (next: string) => {
      if (consumeSuppressedTextInputChange()) {
        return
      }
      setPopupState((prev) => (prev?.type === 'series' ? { ...prev, draft: next } : prev))
    },
    [consumeSuppressedTextInputChange, setPopupState],
  )

  const onInstructionsDraftChange = useCallback(
    (next: string) => {
      if (consumeSuppressedTextInputChange()) {
        return
      }
      setPopupState((prev) => (prev?.type === 'instructions' ? { ...prev, draft: next } : prev))
    },
    [consumeSuppressedTextInputChange, setPopupState],
  )

  const onTestDraftChange = useCallback(
    (next: string) => {
      if (consumeSuppressedTextInputChange()) {
        return
      }
      setPopupState((prev) => (prev?.type === 'test' ? { ...prev, draft: next } : prev))
    },
    [consumeSuppressedTextInputChange, setPopupState],
  )

  return {
    onModelPopupQueryChange,
    onSeriesDraftChange,
    onInstructionsDraftChange,
    onTestDraftChange,
  }
}
