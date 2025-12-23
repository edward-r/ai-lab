import type { ThemeJson } from './theme-types'

import { PM_DARK_THEME } from './builtins/pm-dark'
import { PM_LIGHT_THEME } from './builtins/pm-light'

export type ThemeRegistryEntry = {
  name: string
  label: string
  theme: ThemeJson
}

export const DEFAULT_THEME_NAME = 'pm-dark'

const BUILTIN_THEMES: readonly ThemeRegistryEntry[] = [
  {
    name: 'pm-dark',
    label: 'Prompt Maker Dark',
    theme: PM_DARK_THEME,
  },
  {
    name: 'pm-light',
    label: 'Prompt Maker Light',
    theme: PM_LIGHT_THEME,
  },
]

export const listThemes = (): readonly ThemeRegistryEntry[] => BUILTIN_THEMES

export const getTheme = (name: string): ThemeRegistryEntry | undefined =>
  BUILTIN_THEMES.find((theme) => theme.name === name)

export const getThemeJson = (name: string): ThemeJson | undefined => getTheme(name)?.theme
