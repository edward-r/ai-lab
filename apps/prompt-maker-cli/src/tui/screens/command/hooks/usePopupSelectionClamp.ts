import { useEffect } from 'react'

import type { PopupState } from '../../../types'

type SetPopupState = (next: PopupState | ((prev: PopupState) => PopupState)) => void

export type UsePopupSelectionClampOptions = {
  setPopupState: SetPopupState
  filesLength: number
  urlsLength: number
}

export const usePopupSelectionClamp = ({
  setPopupState,
  filesLength,
  urlsLength,
}: UsePopupSelectionClampOptions): void => {
  useEffect(() => {
    setPopupState((prev) => {
      if (!prev) {
        return prev
      }
      if (prev.type === 'file') {
        const maxIndex = Math.max(filesLength - 1, 0)
        const nextIndex = Math.min(prev.selectionIndex, maxIndex)
        return prev.selectionIndex === nextIndex ? prev : { ...prev, selectionIndex: nextIndex }
      }
      if (prev.type === 'url') {
        const maxIndex = Math.max(urlsLength - 1, 0)
        const nextIndex = Math.min(prev.selectionIndex, maxIndex)
        return prev.selectionIndex === nextIndex ? prev : { ...prev, selectionIndex: nextIndex }
      }
      return prev
    })
  }, [filesLength, setPopupState, urlsLength])
}
