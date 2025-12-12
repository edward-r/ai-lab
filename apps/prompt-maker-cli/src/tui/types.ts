import type { COMMAND_DESCRIPTORS, MODEL_OPTIONS, POPUP_HEIGHTS, TOGGLE_LABELS } from './config'

export type CommandDescriptor = (typeof COMMAND_DESCRIPTORS)[number]
export type ModelOption = (typeof MODEL_OPTIONS)[number]
export type ToggleField = keyof typeof TOGGLE_LABELS
export type PopupKind = keyof typeof POPUP_HEIGHTS

export type PopupState =
  | { type: 'model'; query: string; selectionIndex: number }
  | { type: 'toggle'; field: ToggleField; selectionIndex: number }
  | {
      type: 'file'
      draft: string
      selectionIndex: number
      suggestedItems: string[]
      suggestedSelectionIndex: number
      suggestedFocused: boolean
    }
  | { type: 'url'; draft: string; selectionIndex: number }
  | { type: 'smart'; draft: string }
  | { type: 'test'; draft: string }
  | { type: 'intent'; draft: string }
  | { type: 'series'; draft: string; hint?: string }
  | null

export type HistoryEntry = {
  id: string
  content: string
  kind: 'user' | 'system' | 'progress'
}
