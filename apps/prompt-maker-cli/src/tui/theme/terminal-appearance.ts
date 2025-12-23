import type { ThemeAppearanceMode } from './theme-types'

const parseAnsiIndex = (value: string): number | null => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : null
}

const detectFromColorFgBg = (envValue: string): ThemeAppearanceMode | null => {
  // `COLORFGBG` commonly looks like "15;0" (foreground;background)
  // but some terminals include extra segments. We only care about the last.
  const parts = envValue
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  const last = parts[parts.length - 1]
  if (!last) {
    return null
  }

  const background = parseAnsiIndex(last)
  if (background === null) {
    return null
  }

  if (background >= 0 && background <= 6) {
    return 'dark'
  }

  if (background >= 7 && background <= 15) {
    return 'light'
  }

  return null
}

export const detectTerminalAppearanceMode = (
  env: NodeJS.ProcessEnv,
): ThemeAppearanceMode | null => {
  const explicit = env.TERM_BACKGROUND?.trim().toLowerCase()
  if (explicit === 'light' || explicit === 'dark') {
    return explicit
  }

  const colorFgBg = env.COLORFGBG?.trim()
  if (colorFgBg) {
    return detectFromColorFgBg(colorFgBg)
  }

  return null
}
