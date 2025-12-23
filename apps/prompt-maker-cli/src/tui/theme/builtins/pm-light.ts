import type { ThemeJson } from '../theme-types'

export const PM_LIGHT_THEME = {
  defs: {
    bg: '#ffffff',
    panelBg: '#f6f8fa',
    text: '#24292f',
    muted: '#57606a',
    border: '#d0d7de',
    accent: '#0969da',
    warning: '#9a6700',
    error: '#cf222e',
    success: '#1a7f37',
    selectionBg: '#ddf4ff',
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
    selectionText: 'text',

    chipBackground: 'panelBackground',
    chipText: 'text',
    chipMutedText: 'mutedText',
  },
} as const satisfies ThemeJson
