import { useCallback, useEffect, useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import type { PopupState } from '../../../types'
import { useTheme } from '../../../theme/theme-provider'
import { THEME_MODE_OPTIONS } from '../../../components/popups/ThemeModePopup'

export type UseThemeModePopupGlueOptions = {
  popupState: PopupState
  setPopupState: Dispatch<SetStateAction<PopupState>>
  closePopup: () => void
}

export type UseThemeModePopupGlueResult = {
  optionCount: number
  onConfirm: () => void
  onCancel: () => void
}

export const useThemeModePopupGlue = ({
  popupState,
  setPopupState,
  closePopup,
}: UseThemeModePopupGlueOptions): UseThemeModePopupGlueResult => {
  const { setMode } = useTheme()

  const optionCount = THEME_MODE_OPTIONS.length

  useEffect(() => {
    if (popupState?.type !== 'themeMode') {
      return
    }

    setPopupState((prev) => {
      if (prev?.type !== 'themeMode') {
        return prev
      }

      const clamped = Math.min(prev.selectionIndex, optionCount - 1)
      if (clamped === prev.selectionIndex) {
        return prev
      }

      return { ...prev, selectionIndex: clamped }
    })
  }, [optionCount, popupState?.type, setPopupState])

  const onCancel = useCallback(() => {
    closePopup()
  }, [closePopup])

  const onConfirm = useCallback(() => {
    if (popupState?.type !== 'themeMode') {
      return
    }

    const selected = THEME_MODE_OPTIONS[popupState.selectionIndex]
    if (!selected) {
      return
    }

    const run = async (): Promise<void> => {
      const ok = await setMode(selected)
      if (ok) {
        closePopup()
      }
    }

    void run()
  }, [closePopup, popupState, setMode])

  return useMemo(() => ({ optionCount, onConfirm, onCancel }), [onCancel, onConfirm, optionCount])
}
