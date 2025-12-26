import { useCallback, useEffect, useMemo } from 'react'

import { stripTerminalPasteArtifacts } from '../../../components/core/bracketed-paste'
import { filterIntentFileSuggestions } from '../../../file-suggestions'
import type { PopupState } from '../../../types'

const EMPTY_SUGGESTIONS: string[] = []

type SetPopupState = (next: PopupState | ((prev: PopupState) => PopupState)) => void

export type UseIntentPopupGlueOptions = {
  popupState: PopupState
  setPopupState: SetPopupState
}

export type UseIntentPopupGlueResult = {
  intentPopupSuggestions: string[]
  intentPopupSuggestionSelectionIndex: number
  intentPopupSuggestionsFocused: boolean
  onIntentPopupDraftChange: (next: string) => void
}

export const useIntentPopupGlue = ({
  popupState,
  setPopupState,
}: UseIntentPopupGlueOptions): UseIntentPopupGlueResult => {
  const intentPopupDraft = popupState?.type === 'intent' ? popupState.draft : ''
  const intentPopupSuggestedItems =
    popupState?.type === 'intent' ? popupState.suggestedItems : EMPTY_SUGGESTIONS
  const intentPopupSuggestedFocused =
    popupState?.type === 'intent' ? popupState.suggestedFocused : false
  const intentPopupSuggestedSelectionIndex =
    popupState?.type === 'intent' ? popupState.suggestedSelectionIndex : 0

  const intentPopupSuggestions = useMemo(() => {
    if (!intentPopupSuggestedItems.length) {
      return []
    }
    return filterIntentFileSuggestions({
      suggestions: intentPopupSuggestedItems,
      query: intentPopupDraft,
      limit: 200,
    })
  }, [intentPopupDraft, intentPopupSuggestedItems])

  const intentPopupSuggestionSelectionIndex = Math.min(
    intentPopupSuggestedSelectionIndex,
    Math.max(intentPopupSuggestions.length - 1, 0),
  )

  const intentPopupSuggestionsFocused =
    intentPopupSuggestedFocused && intentPopupSuggestions.length > 0

  useEffect(() => {
    if (popupState?.type !== 'intent') {
      return
    }
    if (!intentPopupSuggestedFocused) {
      return
    }
    if (intentPopupSuggestions.length > 0) {
      return
    }

    setPopupState((prev) =>
      prev?.type === 'intent'
        ? { ...prev, suggestedFocused: false, suggestedSelectionIndex: 0 }
        : prev,
    )
  }, [intentPopupSuggestedFocused, intentPopupSuggestions.length, popupState?.type, setPopupState])

  const onIntentPopupDraftChange = useCallback(
    (next: string) => {
      const sanitized = stripTerminalPasteArtifacts(next)
      setPopupState((prev) =>
        prev?.type === 'intent'
          ? {
              ...prev,
              draft: sanitized,
              suggestedSelectionIndex: 0,
              suggestedFocused: false,
            }
          : prev,
      )
    },
    [setPopupState],
  )

  return {
    intentPopupSuggestions,
    intentPopupSuggestionSelectionIndex,
    intentPopupSuggestionsFocused,
    onIntentPopupDraftChange,
  }
}
