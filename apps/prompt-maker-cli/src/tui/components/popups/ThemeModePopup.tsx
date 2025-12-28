import { Box, Text, useStdout } from 'ink'

import type { ThemeMode } from '../../theme/theme-types'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max))

const padRight = (value: string, width: number): string => {
  if (width <= 0) {
    return ''
  }

  const trimmed = value.length > width ? value.slice(0, width) : value
  return trimmed.length === width ? trimmed : trimmed.padEnd(width, ' ')
}

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
  const { stdout } = useStdout()

  const terminalColumns = stdout?.columns ?? 80
  const popupWidth = clamp(terminalColumns - 10, 40, 72)

  const borderColumns = 2
  const paddingColumns = 2
  const contentWidth = Math.max(0, popupWidth - borderColumns - paddingColumns)

  const backgroundProps = inkBackgroundColorProps(theme.popupBackground)

  const selected = Math.min(selectionIndex, OPTIONS.length - 1)

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      width={popupWidth}
      {...inkBorderColorProps(theme.border)}
      {...backgroundProps}
    >
      <Text {...backgroundProps} {...inkColorProps(theme.accent)}>
        {padRight('Theme Mode', contentWidth)}
      </Text>
      <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
        {padRight(
          `Current: ${formatMode(initialMode)} · Active: ${formatMode(mode)}`,
          contentWidth,
        )}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {OPTIONS.map((option, index) => {
          const isSelected = index === selected

          const textProps = isSelected
            ? {
                ...inkColorProps(theme.selectionText),
                ...inkBackgroundColorProps(theme.selectionBackground),
              }
            : { ...backgroundProps, ...inkColorProps(theme.text) }

          return (
            <Text key={option} {...textProps}>
              {padRight(formatMode(option), contentWidth)}
            </Text>
          )
        })}
      </Box>
      {error ? (
        <Text {...backgroundProps} {...inkColorProps(theme.error)}>
          {padRight(error.message, contentWidth)}
        </Text>
      ) : null}
      <Box marginTop={1}>
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {padRight('↑/↓ select · Enter apply · Esc close', contentWidth)}
        </Text>
      </Box>
    </Box>
  )
}

export const THEME_MODE_OPTIONS = OPTIONS
