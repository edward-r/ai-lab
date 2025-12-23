// Theme types for the Ink TUI.
//
// This module intentionally has *no* imports from `ink` (or any components).
// It defines the data model only; resolution/loading happens elsewhere.

/**
 * User-facing mode preference.
 *
 * We use `system` (not `auto`) to mirror the upstream OpenCode TUI concept:
 * "system" resolves to the terminal's current background/appearance.
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Ink-compatible color value.
 *
 * Ink accepts named colors (e.g. `cyanBright`) and can also accept 0–255 ANSI codes.
 * We keep this loose for now; later we can narrow based on the resolver we add.
 */
export type InkColorValue = string | number

export type ThemeSlot =
  | 'background'
  | 'text'
  | 'mutedText'
  | 'border'
  | 'accent'
  | 'accentText'
  | 'warning'
  | 'error'
  | 'success'
  | 'panelBackground'
  | 'popupBackground'
  | 'selectionBackground'
  | 'selectionText'
  | 'chipBackground'
  | 'chipText'
  | 'chipMutedText'

export const REQUIRED_THEME_SLOTS: readonly ThemeSlot[] = [
  'background',
  'text',
  'mutedText',
  'border',
  'accent',
  'accentText',
  'warning',
  'error',
  'success',
  'panelBackground',
  'popupBackground',
  'selectionBackground',
  'selectionText',
  'chipBackground',
  'chipText',
  'chipMutedText',
]

export type ResolvedTheme = Record<ThemeSlot, InkColorValue>

// Theme JSON model (structure only): modeled after OpenCode's TUI themes.

export type ThemeColorVariant = {
  dark: ThemeColorValue
  light: ThemeColorValue
}

/**
 * A single color value in theme JSON.
 *
 * Mirrors OpenCode behavior:
 * - hex strings ("#RRGGBB")
 * - reference strings (defs key or another theme slot key)
 * - ANSI code numbers (0–255)
 * - variants `{ dark, light }`
 * - special strings like "none" / "transparent" (resolver handles meaning)
 */
export type ThemeColorValue = string | number | ThemeColorVariant

export type ThemeJson<TSlots extends string = ThemeSlot> = {
  defs?: Record<string, ThemeColorValue>
  theme: Record<TSlots, ThemeColorValue> & Record<string, ThemeColorValue>
}
