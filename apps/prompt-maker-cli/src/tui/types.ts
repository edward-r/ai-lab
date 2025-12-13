import type { ModelProvider } from '../model-providers'
import type { COMMAND_DESCRIPTORS, POPUP_HEIGHTS, TOGGLE_LABELS } from './config'

export type CommandDescriptor = (typeof COMMAND_DESCRIPTORS)[number]
export type ToggleField = keyof typeof TOGGLE_LABELS
export type PopupKind = keyof typeof POPUP_HEIGHTS

export type ModelOption = {
  id: string
  label: string
  provider: ModelProvider
  description: string
  capabilities: string[]
  default?: boolean
  notes?: string
  source: 'builtin' | 'config'
}

export type ProviderStatus = {
  provider: ModelProvider
  status: 'ok' | 'missing' | 'error'
  message: string
}

export type ProviderStatusMap = Record<ModelProvider, ProviderStatus>

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
  | { type: 'history'; draft: string; selectionIndex: number }
  | { type: 'smart'; draft: string }
  | { type: 'tokens' }
  | { type: 'reasoning'; scrollOffset: number }
  | { type: 'test'; draft: string }
  | { type: 'intent'; draft: string }
  | { type: 'instructions'; draft: string }
  | { type: 'series'; draft: string; hint?: string }
  | null

export type HistoryEntry = {
  id: string
  content: string
  kind: 'user' | 'system' | 'progress'
}
