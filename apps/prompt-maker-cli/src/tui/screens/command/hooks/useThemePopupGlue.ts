import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import type { PopupState } from '../../../types'
import { useTheme } from '../../../theme/theme-provider'

export type UseThemePopupGlueOptions = {
  popupState: PopupState
  setPopupState: Dispatch<SetStateAction<PopupState>>
  closePopup: () => void
}

export type UseThemePopupGlueResult = {
  themeCount: number
  onThemeConfirm: () => void
  onThemeCancel: () => void
}

export const useThemePopupGlue = ({
  popupState,
  setPopupState,
  closePopup,
}: UseThemePopupGlueOptions): UseThemePopupGlueResult => {
  const { themes, previewTheme, setTheme } = useTheme()

  const themeNames = useMemo(() => themes.map((descriptor) => descriptor.name), [themes])

  const themeCount = themeNames.length

  useEffect(() => {
    if (popupState?.type !== 'theme' || themeCount === 0) {
      return
    }

    setPopupState((prev) => {
      if (prev?.type !== 'theme') {
        return prev
      }

      const clamped = Math.min(prev.selectionIndex, Math.max(themeCount - 1, 0))
      if (clamped === prev.selectionIndex) {
        return prev
      }

      return { ...prev, selectionIndex: clamped }
    })
  }, [popupState?.type, setPopupState, themeCount])

  const lastPreviewNameRef = useRef<string | null>(null)

  useEffect(() => {
    if (popupState?.type !== 'theme') {
      lastPreviewNameRef.current = null
      return
    }

    const selectedName = themeNames[popupState.selectionIndex]
    if (!selectedName) {
      return
    }

    if (selectedName === lastPreviewNameRef.current) {
      return
    }

    lastPreviewNameRef.current = selectedName
    previewTheme(selectedName)
  }, [popupState, previewTheme, themeNames])

  const onThemeCancel = useCallback(() => {
    if (popupState?.type !== 'theme') {
      closePopup()
      return
    }

    previewTheme(popupState.initialThemeName)
    closePopup()
  }, [closePopup, popupState, previewTheme])

  const onThemeConfirm = useCallback(() => {
    if (popupState?.type !== 'theme') {
      closePopup()
      return
    }

    const selectedName = themeNames[popupState.selectionIndex]
    if (!selectedName) {
      return
    }

    const commit = async (): Promise<void> => {
      const ok = await setTheme(selectedName)
      if (ok) {
        closePopup()
      }
    }

    void commit()
  }, [closePopup, popupState, setTheme, themeNames])

  return {
    themeCount,
    onThemeConfirm,
    onThemeCancel,
  }
}
