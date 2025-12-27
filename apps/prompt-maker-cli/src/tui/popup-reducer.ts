/*
 * Popup reducer (pure state transitions).
 *
 * This file intentionally contains *no Ink/React runtime imports*.
 *
 * Why a reducer?
 * - Popups behave like a small state machine: open, close, update fields, and
 *   sometimes receive async data (workspace scan suggestions).
 * - Reducers make transitions explicit and testable: (state, action) => nextState.
 *
 * Important behavior we preserve:
 * - `CommandScreen` and popup components still call `setPopupState(prev => ...)`.
 *   We model that as a `set` action that can optionally keep active scan state
 *   when the popup type does not change.
 * - Async scan results must not overwrite newer popups.
 */

import type { PopupState, ToggleField } from './types'
import type { ThemeMode } from './theme/theme-types'

// Lightweight replacement for React's SetStateAction type.
// Keeping it local avoids importing React into a pure helper.
export type SetStateAction<State> = State | ((prev: State) => State)

export type PopupScanKind = 'file' | 'image' | 'video' | 'smart' | 'intent'

export type PopupManagerState = {
  popupState: PopupState
  activeScan: { kind: PopupScanKind; id: number } | null
}

export type PopupAction =
  | { type: 'set'; next: SetStateAction<PopupState> }
  | { type: 'close' }
  | { type: 'open-model'; kind: 'generation' | 'target'; query: string; selectionIndex: number }
  | { type: 'open-toggle'; field: ToggleField; selectionIndex: number }
  | { type: 'open-file'; scanId: number }
  | { type: 'open-url' }
  | { type: 'open-image'; scanId: number }
  | { type: 'open-video'; scanId: number }
  | { type: 'open-history' }
  | { type: 'open-smart'; scanId: number; draft: string }
  | { type: 'open-tokens' }
  | { type: 'open-settings' }
  | { type: 'open-theme'; selectionIndex: number; initialThemeName: string }
  | {
      type: 'open-theme-mode'
      selectionIndex: number
      initialMode: ThemeMode
    }
  | { type: 'open-reasoning'; scrollOffset: number }
  | { type: 'open-test'; draft: string }
  | { type: 'open-intent'; scanId: number; draft: string }
  | { type: 'open-instructions'; draft: string }
  | { type: 'open-series'; draft: string; hint: string }
  | { type: 'scan-suggestions-success'; kind: PopupScanKind; scanId: number; suggestions: string[] }

export const INITIAL_POPUP_MANAGER_STATE: PopupManagerState = { popupState: null, activeScan: null }

const buildFilePopupState = (): PopupState => ({
  type: 'file',
  draft: '',
  selectionIndex: 0,
  suggestedItems: [],
  suggestedSelectionIndex: 0,
  suggestedFocused: false,
})

const buildImagePopupState = (): PopupState => ({
  type: 'image',
  draft: '',
  selectionIndex: 0,
  suggestedItems: [],
  suggestedSelectionIndex: 0,
  suggestedFocused: false,
})

const buildVideoPopupState = (): PopupState => ({
  type: 'video',
  draft: '',
  selectionIndex: 0,
  suggestedItems: [],
  suggestedSelectionIndex: 0,
  suggestedFocused: false,
})

const buildSmartPopupState = (draft: string): PopupState => ({
  type: 'smart',
  draft,
  suggestedItems: [],
  suggestedSelectionIndex: 0,
  suggestedFocused: false,
})

const buildIntentPopupState = (draft: string): PopupState => ({
  type: 'intent',
  draft,
  suggestedItems: [],
  suggestedSelectionIndex: 0,
  suggestedFocused: false,
})

const applySuggestions = (
  popupState: PopupState,
  kind: PopupScanKind,
  suggestions: string[],
): PopupState => {
  if (kind === 'file' && popupState?.type === 'file') {
    return {
      ...popupState,
      suggestedItems: suggestions,
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    }
  }

  if (kind === 'image' && popupState?.type === 'image') {
    return {
      ...popupState,
      suggestedItems: suggestions,
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    }
  }

  if (kind === 'video' && popupState?.type === 'video') {
    return {
      ...popupState,
      suggestedItems: suggestions,
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    }
  }

  if (kind === 'smart' && popupState?.type === 'smart') {
    return {
      ...popupState,
      suggestedItems: suggestions,
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    }
  }

  if (kind === 'intent' && popupState?.type === 'intent') {
    return {
      ...popupState,
      suggestedItems: suggestions,
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    }
  }

  return popupState
}

export const popupReducer = (state: PopupManagerState, action: PopupAction): PopupManagerState => {
  switch (action.type) {
    case 'set': {
      const next = action.next

      const nextPopupState = typeof next === 'function' ? next(state.popupState) : next

      // Preserve ongoing scan state only if the popup type stays the same.
      // If we switch popup types (file -> smart), any in-flight scan becomes stale.
      const previousType = state.popupState?.type ?? null
      const nextType = nextPopupState?.type ?? null

      return {
        popupState: nextPopupState,
        activeScan: previousType === nextType ? state.activeScan : null,
      }
    }

    case 'close':
      return INITIAL_POPUP_MANAGER_STATE

    case 'open-model':
      return {
        popupState: {
          type: 'model',
          kind: action.kind,
          query: action.query,
          selectionIndex: action.selectionIndex,
        },
        activeScan: null,
      }

    case 'open-toggle':
      return {
        popupState: { type: 'toggle', field: action.field, selectionIndex: action.selectionIndex },
        activeScan: null,
      }

    case 'open-file':
      return { popupState: buildFilePopupState(), activeScan: { kind: 'file', id: action.scanId } }

    case 'open-url':
      return { popupState: { type: 'url', draft: '', selectionIndex: 0 }, activeScan: null }

    case 'open-image':
      return {
        popupState: buildImagePopupState(),
        activeScan: { kind: 'image', id: action.scanId },
      }

    case 'open-video':
      return {
        popupState: buildVideoPopupState(),
        activeScan: { kind: 'video', id: action.scanId },
      }

    case 'open-history':
      return { popupState: { type: 'history', draft: '', selectionIndex: 0 }, activeScan: null }

    case 'open-smart':
      return {
        popupState: buildSmartPopupState(action.draft),
        activeScan: { kind: 'smart', id: action.scanId },
      }

    case 'open-tokens':
      return { popupState: { type: 'tokens' }, activeScan: null }

    case 'open-settings':
      return { popupState: { type: 'settings' }, activeScan: null }

    case 'open-theme':
      return {
        popupState: {
          type: 'theme',
          selectionIndex: action.selectionIndex,
          initialThemeName: action.initialThemeName,
        },
        activeScan: null,
      }

    case 'open-theme-mode':
      return {
        popupState: {
          type: 'themeMode',
          selectionIndex: action.selectionIndex,
          initialMode: action.initialMode,
        },
        activeScan: null,
      }

    case 'open-reasoning':
      return {
        popupState: { type: 'reasoning', scrollOffset: action.scrollOffset },
        activeScan: null,
      }

    case 'open-test':
      return { popupState: { type: 'test', draft: action.draft }, activeScan: null }

    case 'open-intent':
      return {
        popupState: buildIntentPopupState(action.draft),
        activeScan: { kind: 'intent', id: action.scanId },
      }

    case 'open-instructions':
      return { popupState: { type: 'instructions', draft: action.draft }, activeScan: null }

    case 'open-series':
      return {
        popupState: { type: 'series', draft: action.draft, hint: action.hint },
        activeScan: null,
      }

    case 'scan-suggestions-success': {
      if (state.activeScan?.kind !== action.kind || state.activeScan.id !== action.scanId) {
        return state
      }

      return {
        popupState: applySuggestions(state.popupState, action.kind, action.suggestions),
        activeScan: null,
      }
    }

    default:
      return state
  }
}
