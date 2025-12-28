import { Box, Text, useStdout } from 'ink'

import { ScrollableOutput } from '../core/ScrollableOutput'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'
import type { HistoryEntry } from '../../types'

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max))

const padRight = (value: string, width: number): string => {
  if (width <= 0) {
    return ''
  }

  const trimmed = value.length > width ? value.slice(0, width) : value
  return trimmed.length === width ? trimmed : trimmed.padEnd(width, ' ')
}

export type ReasoningPopupProps = {
  lines: readonly HistoryEntry[]
  visibleRows: number
  scrollOffset: number
}

export const ReasoningPopup = ({ lines, visibleRows, scrollOffset }: ReasoningPopupProps) => {
  const { theme } = useTheme()
  const { stdout } = useStdout()

  const terminalColumns = stdout?.columns ?? 80
  const popupWidth = clamp(terminalColumns - 10, 40, 72)

  const borderColumns = 2
  const paddingColumns = 2
  const contentWidth = Math.max(0, popupWidth - borderColumns - paddingColumns)

  const backgroundProps = inkBackgroundColorProps(theme.popupBackground)

  if (lines.length === 0) {
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
          {padRight('Model Reasoning', contentWidth)}
        </Text>
        <Box marginTop={1}>
          <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
            {padRight('No reasoning recorded yet. Run generation first.', contentWidth)}
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
            {padRight('Esc to close', contentWidth)}
          </Text>
        </Box>
      </Box>
    )
  }

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
        {padRight('Model Reasoning', contentWidth)}
      </Text>
      <Box marginTop={1} flexDirection="column" height={visibleRows} overflow="hidden">
        <ScrollableOutput
          lines={lines}
          visibleRows={visibleRows}
          scrollOffset={scrollOffset}
          contentWidth={contentWidth}
          backgroundColor={theme.popupBackground}
        />
      </Box>
      <Box marginTop={1}>
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {padRight('↑/↓ scroll · PgUp/PgDn · Esc to close', contentWidth)}
        </Text>
      </Box>
    </Box>
  )
}
