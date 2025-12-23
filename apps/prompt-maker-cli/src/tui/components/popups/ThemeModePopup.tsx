import { Box, Text } from 'ink'

import type { ThemeMode } from '../../theme/theme-types'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'

export type ThemeModePopupProps = {
  selectionIndex: number
  initialMode: ThemeMode
}

const OPTIONS: readonly ThemeMode[] = ['system', 'dark', 'light']

const formatMode = (mode: ThemeMode): string => {
  if (mode === 'system') {
    return 'System'
  }
  return mode.charAt(0).toUpperCase() + mode.slice(1)
}

export const ThemeModePopup = ({ selectionIndex, initialMode }: ThemeModePopupProps) => {
  const { theme, mode, error } = useTheme()

  const selected = Math.min(selectionIndex, OPTIONS.length - 1)

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      {...inkBorderColorProps(theme.border)}
      {...inkBackgroundColorProps(theme.popupBackground)}
    >
      <Text {...inkColorProps(theme.accent)}>Theme Mode</Text>
      <Text {...inkColorProps(theme.mutedText)}>
        Current: {formatMode(initialMode)} · Active: {formatMode(mode)}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {OPTIONS.map((option, index) => {
          const isSelected = index === selected

          const textProps = isSelected
            ? {
                ...inkColorProps(theme.selectionText),
                ...inkBackgroundColorProps(theme.selectionBackground),
              }
            : inkColorProps(theme.text)

          return (
            <Text key={option} {...textProps}>
              {formatMode(option)}
            </Text>
          )
        })}
      </Box>
      {error ? <Text {...inkColorProps(theme.error)}>{error.message}</Text> : null}
      <Box marginTop={1}>
        <Text {...inkColorProps(theme.mutedText)}>↑/↓ select · Enter apply · Esc close</Text>
      </Box>
    </Box>
  )
}

export const THEME_MODE_OPTIONS = OPTIONS
