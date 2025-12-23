import type { ThemeSlot } from './theme-types'

export type ColorAuditEntry = {
  file: string
  tokenSuggestion: ThemeSlot
  notes: string
}

// This module exists to track any remaining hard-coded Ink colors.
// After migrating the TUI to `useTheme()`, this list should stay empty.
export const COLOR_AUDIT: readonly ColorAuditEntry[] = []
