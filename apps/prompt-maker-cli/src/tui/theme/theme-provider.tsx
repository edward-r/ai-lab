import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { DEFAULT_THEME_NAME, getThemeJson } from './theme-registry'
import type { ThemeDescriptor } from './theme-loader'
import { resolveTheme } from './theme-resolver'
import {
  loadThemeSelection,
  saveThemeSelection,
  type ThemeSelectionWarning,
} from './theme-settings-service'
import {
  REQUIRED_THEME_SLOTS,
  type ResolvedTheme,
  type ThemeAppearanceMode,
  type ThemeJson,
  type ThemeMode,
} from './theme-types'

export type ThemeProviderError = {
  kind: 'load-failed' | 'resolve-failed'
  message: string
}

export type ThemeContextValue = {
  theme: ResolvedTheme
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  activeThemeName: string
  setTheme: (name: string) => void
  themes: readonly ThemeDescriptor[]
  warnings: readonly ThemeSelectionWarning[]
  error: ThemeProviderError | null
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

const FALLBACK_THEME: ResolvedTheme = Object.fromEntries(
  REQUIRED_THEME_SLOTS.map((slot) => [slot, undefined]),
) as ResolvedTheme

const resolveThemeOrThrow = (themeJson: ThemeJson, mode: ThemeAppearanceMode): ResolvedTheme =>
  resolveTheme(themeJson, mode)

const resolveAppearanceMode = (mode: ThemeMode): ThemeAppearanceMode => {
  // OpenCode detects terminal background and chooses a mode.
  // We treat `system` as `dark` until that detection exists here.
  return mode === 'light' ? 'light' : 'dark'
}

const resolveThemeFromName = (params: {
  themes: readonly ThemeDescriptor[]
  name: string
  appearanceMode: ThemeAppearanceMode
}): { theme: ResolvedTheme; themeName: string } => {
  const descriptor = params.themes.find((theme) => theme.name === params.name)
  if (descriptor) {
    return {
      theme: resolveThemeOrThrow(descriptor.theme, params.appearanceMode),
      themeName: params.name,
    }
  }

  const fallbackJson = getThemeJson(DEFAULT_THEME_NAME)
  if (!fallbackJson) {
    return { theme: FALLBACK_THEME, themeName: DEFAULT_THEME_NAME }
  }

  return {
    theme: resolveThemeOrThrow(fallbackJson, params.appearanceMode),
    themeName: DEFAULT_THEME_NAME,
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themes, setThemes] = useState<readonly ThemeDescriptor[]>([])
  const [activeThemeName, setActiveThemeName] = useState(DEFAULT_THEME_NAME)
  const [mode, setModeState] = useState<ThemeMode>('dark')
  const [warnings, setWarnings] = useState<readonly ThemeSelectionWarning[]>([])
  const [error, setError] = useState<ThemeProviderError | null>(null)

  const [theme, setThemeState] = useState<ResolvedTheme>(() => {
    const base = getThemeJson(DEFAULT_THEME_NAME)
    if (!base) {
      return FALLBACK_THEME
    }
    try {
      return resolveThemeOrThrow(base, 'dark')
    } catch {
      return FALLBACK_THEME
    }
  })

  useEffect(() => {
    let cancelled = false

    const run = async (): Promise<void> => {
      try {
        const loaded = await loadThemeSelection()
        if (cancelled) {
          return
        }

        setThemes(loaded.themes)
        setWarnings(loaded.warnings)
        setModeState(loaded.selection.themeMode)

        const appearanceMode = resolveAppearanceMode(loaded.selection.themeMode)

        try {
          const resolved = resolveThemeFromName({
            themes: loaded.themes,
            name: loaded.selection.themeName,
            appearanceMode,
          })

          setActiveThemeName(resolved.themeName)
          setThemeState(resolved.theme)

          if (resolved.themeName !== loaded.selection.themeName) {
            void saveThemeSelection({ themeName: resolved.themeName })
          }

          setError(null)
        } catch (resolveError) {
          const message =
            resolveError instanceof Error ? resolveError.message : 'Unknown theme resolution error.'
          setError({ kind: 'resolve-failed', message })

          const fallbackJson = getThemeJson(DEFAULT_THEME_NAME)
          if (fallbackJson) {
            setActiveThemeName(DEFAULT_THEME_NAME)
            setThemeState(resolveThemeOrThrow(fallbackJson, appearanceMode))
            void saveThemeSelection({ themeName: DEFAULT_THEME_NAME })
          }
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Unknown theme load error.'
        setError({ kind: 'load-failed', message })
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  const applySelection = useCallback(
    (next: { themeName?: string; mode?: ThemeMode }) => {
      const nextMode = next.mode ?? mode
      const appearanceMode = resolveAppearanceMode(nextMode)

      const nextThemeName = next.themeName ?? activeThemeName

      try {
        const resolved = resolveThemeFromName({ themes, name: nextThemeName, appearanceMode })
        setActiveThemeName(resolved.themeName)
        setThemeState(resolved.theme)
        setModeState(nextMode)
        setError(null)

        void saveThemeSelection({
          ...(next.themeName !== undefined ? { themeName: resolved.themeName } : {}),
          ...(next.mode !== undefined ? { themeMode: nextMode } : {}),
        })
      } catch (resolveError) {
        const message =
          resolveError instanceof Error ? resolveError.message : 'Unknown theme resolution error.'
        setError({ kind: 'resolve-failed', message })

        const fallbackJson = getThemeJson(DEFAULT_THEME_NAME)
        if (!fallbackJson) {
          return
        }

        setActiveThemeName(DEFAULT_THEME_NAME)
        setThemeState(resolveThemeOrThrow(fallbackJson, appearanceMode))
        setModeState(nextMode)
        void saveThemeSelection({ themeName: DEFAULT_THEME_NAME })
      }
    },
    [activeThemeName, mode, themes],
  )

  const setTheme = useCallback(
    (name: string) => {
      applySelection({ themeName: name })
    },
    [applySelection],
  )

  const setMode = useCallback(
    (nextMode: ThemeMode) => {
      applySelection({ mode: nextMode })
    },
    [applySelection],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      mode,
      setMode,
      activeThemeName,
      setTheme,
      themes,
      warnings,
      error,
    }),
    [activeThemeName, error, mode, setMode, setTheme, theme, themes, warnings],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
