import type { ThemeJson } from '../theme-types'

export const PM_DARK_THEME = {
  defs: {
    bg: '#0b0f14',
    panelBg: '#111820',
    text: '#e6edf3',
    muted: '#8b949e',
    border: '#30363d',
    accent: '#58a6ff',
    warning: '#d29922',
    error: '#f85149',
    success: '#3fb950',
    selectionBg: '#1f6feb',
  },
  theme: {
    background: 'bg',
    text: 'text',
    mutedText: 'muted',
    border: 'border',

    accent: 'accent',
    accentText: 'bg',

    warning: 'warning',
    error: 'error',
    success: 'success',

    panelBackground: 'panelBg',
    popupBackground: 'panelBackground',

    selectionBackground: 'selectionBg',
    selectionText: 'bg',

    chipBackground: 'panelBackground',
    chipText: 'text',
    chipMutedText: 'mutedText',
  },
} as const satisfies ThemeJson
