import { loadCliConfig, updateCliThemeSettings, type PromptMakerCliConfig } from '../../config'

import { DEFAULT_THEME_NAME } from './theme-registry'
import {
  loadThemes,
  type LoadThemesOptions,
  type ThemeDescriptor,
  type ThemeLoadError,
} from './theme-loader'
import type { ThemeMode } from './theme-types'

export const DEFAULT_THEME_MODE: ThemeMode = 'dark'

export type ThemeSelection = {
  themeName: string
  themeMode: ThemeMode
}

export type ThemeSelectionWarning = {
  kind: 'unknown-theme'
  requested: string
  fallback: string
  message: string
}

const resolveThemeMode = (config: PromptMakerCliConfig | null): ThemeMode =>
  config?.themeMode ?? DEFAULT_THEME_MODE

const resolveThemeName = (
  config: PromptMakerCliConfig | null,
  themes: readonly ThemeDescriptor[],
): { themeName: string; warnings: ThemeSelectionWarning[] } => {
  const requested = config?.theme?.trim()
  if (!requested) {
    return { themeName: DEFAULT_THEME_NAME, warnings: [] }
  }

  const exists = themes.some((theme) => theme.name === requested)
  if (exists) {
    return { themeName: requested, warnings: [] }
  }

  return {
    themeName: DEFAULT_THEME_NAME,
    warnings: [
      {
        kind: 'unknown-theme',
        requested,
        fallback: DEFAULT_THEME_NAME,
        message: `Unknown theme '${requested}', falling back to '${DEFAULT_THEME_NAME}'.`,
      },
    ],
  }
}

export const resolveThemeSelectionFromConfig = (params: {
  config: PromptMakerCliConfig | null
  themes: readonly ThemeDescriptor[]
}): { selection: ThemeSelection; warnings: ThemeSelectionWarning[] } => {
  const themeMode = resolveThemeMode(params.config)
  const resolved = resolveThemeName(params.config, params.themes)

  return {
    selection: {
      themeName: resolved.themeName,
      themeMode,
    },
    warnings: resolved.warnings,
  }
}

export const loadThemeSelection = async (params?: {
  themeLoadOptions?: LoadThemesOptions
}): Promise<{
  themes: ThemeDescriptor[]
  loadErrors: ThemeLoadError[]
  selection: ThemeSelection
  warnings: ThemeSelectionWarning[]
}> => {
  const [config, loaded] = await Promise.all([
    loadCliConfig(),
    loadThemes(params?.themeLoadOptions ?? {}),
  ])

  const resolved = resolveThemeSelectionFromConfig({ config, themes: loaded.themes })

  return {
    themes: loaded.themes,
    loadErrors: loaded.errors,
    selection: resolved.selection,
    warnings: resolved.warnings,
  }
}

export const saveThemeSelection = async (selection: Partial<ThemeSelection>): Promise<void> => {
  await updateCliThemeSettings({
    ...(selection.themeName !== undefined ? { theme: selection.themeName } : {}),
    ...(selection.themeMode !== undefined ? { themeMode: selection.themeMode } : {}),
  })
}
