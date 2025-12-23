import { useEffect } from 'react'

export type UseCommandScreenPopupVisibilityOptions = {
  isPopupOpen: boolean
  onPopupVisibilityChange?: ((isOpen: boolean) => void) | undefined
}

export const useCommandScreenPopupVisibility = ({
  isPopupOpen,
  onPopupVisibilityChange,
}: UseCommandScreenPopupVisibilityOptions): void => {
  useEffect(() => {
    if (!onPopupVisibilityChange) {
      return
    }
    onPopupVisibilityChange(isPopupOpen)
  }, [isPopupOpen, onPopupVisibilityChange])

  useEffect(() => {
    if (!onPopupVisibilityChange) {
      return undefined
    }
    return () => {
      onPopupVisibilityChange(false)
    }
  }, [onPopupVisibilityChange])
}
