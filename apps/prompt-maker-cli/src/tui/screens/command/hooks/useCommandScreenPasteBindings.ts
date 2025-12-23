import type { PopupState } from '../../../types'

import { usePasteManager } from './usePasteManager'

export type UseCommandScreenPasteBindingsOptions = {
  inputValue: string
  popupState: PopupState
  helpOpen: boolean

  setInputValue: (value: string | ((prev: string) => string)) => void
  setPasteActive: (active: boolean) => void

  consumeSuppressedTextInputChange: () => boolean
  suppressNextInput: () => void
  updateLastTypedIntent: (next: string) => void
}

export type UseCommandScreenPasteBindingsResult = {
  tokenLabel: (token: string) => string | null
  handleInputChange: (next: string) => void
  expandInputForSubmit: (value: string) => string
}

export const useCommandScreenPasteBindings = ({
  inputValue,
  popupState,
  helpOpen,
  setInputValue,
  setPasteActive,
  consumeSuppressedTextInputChange,
  suppressNextInput,
  updateLastTypedIntent,
}: UseCommandScreenPasteBindingsOptions): UseCommandScreenPasteBindingsResult => {
  const { tokenLabel, handleInputChange, expandInputForSubmit } = usePasteManager({
    inputValue,
    popupState,
    helpOpen,
    setInputValue,
    setPasteActive,
    consumeSuppressedTextInputChange,
    suppressNextInput,
    updateLastTypedIntent,
  })

  return {
    tokenLabel,
    handleInputChange,
    expandInputForSubmit,
  }
}
