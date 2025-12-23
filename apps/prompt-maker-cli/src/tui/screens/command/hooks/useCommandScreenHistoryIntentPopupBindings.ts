import type { PopupState } from '../../../types'

import { useHistoryPopupGlue } from './useHistoryPopupGlue'
import { useIntentPopupGlue } from './useIntentPopupGlue'

export type UseCommandScreenHistoryIntentPopupBindingsOptions = {
  popupState: PopupState
  setPopupState: import('react').Dispatch<import('react').SetStateAction<PopupState>>
  closePopup: () => void
  setInputValue: (value: string | ((prev: string) => string)) => void

  consumeSuppressedTextInputChange: () => boolean
  suppressNextInput: () => void

  commandHistoryValues: string[]
}

export type UseCommandScreenHistoryIntentPopupBindingsResult = {
  history: ReturnType<typeof useHistoryPopupGlue>
  intent: ReturnType<typeof useIntentPopupGlue>
}

export const useCommandScreenHistoryIntentPopupBindings = ({
  popupState,
  setPopupState,
  closePopup,
  setInputValue,
  consumeSuppressedTextInputChange,
  suppressNextInput,
  commandHistoryValues,
}: UseCommandScreenHistoryIntentPopupBindingsOptions): UseCommandScreenHistoryIntentPopupBindingsResult => {
  const history = useHistoryPopupGlue({
    popupState,
    setPopupState,
    closePopup,
    setInputValue,
    consumeSuppressedTextInputChange,
    suppressNextInput,
    commandHistoryValues,
  })

  const intent = useIntentPopupGlue({ popupState, setPopupState })

  return { history, intent }
}
