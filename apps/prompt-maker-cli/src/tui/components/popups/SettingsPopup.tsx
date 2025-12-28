import { useMemo } from 'react'
import { Box, Text, useStdout } from 'ink'

import { resolveIndicatorSegments, type IndicatorSegment } from '../core/status-indicators-layout'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'
import type { InkColorValue } from '../../theme/theme-types'

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max))

const padRight = (value: string, width: number): string => {
  if (width <= 0) {
    return ''
  }

  const trimmed = value.length > width ? value.slice(0, width) : value
  return trimmed.length === width ? trimmed : trimmed.padEnd(width, ' ')
}

export type SettingsPopupProps = {
  chips: readonly string[]
}

const resolveSegmentLabel = (segment: IndicatorSegment): string => segment.label

export const SettingsPopup = ({ chips }: SettingsPopupProps) => {
  const { theme } = useTheme()
  const { stdout } = useStdout()
  const segments = useMemo(() => resolveIndicatorSegments(chips), [chips])

  const terminalColumns = stdout?.columns ?? 80
  const popupWidth = clamp(terminalColumns - 10, 40, 72)

  const borderColumns = 2
  const paddingColumns = 2
  const contentWidth = Math.max(0, popupWidth - borderColumns - paddingColumns)

  const backgroundProps = inkBackgroundColorProps(theme.popupBackground)

  const resolveSegmentColor = (segment: IndicatorSegment): InkColorValue => {
    switch (segment.style) {
      case 'success':
        return theme.success
      case 'warning':
        return theme.warning
      case 'danger':
        return theme.error
      case 'primary':
        return theme.text
      case 'muted':
      default:
        return theme.mutedText
    }
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
        {padRight('Current Settings', contentWidth)}
      </Text>
      <Box marginTop={1} flexDirection="column">
        {segments.length === 0 ? (
          <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
            {padRight('No settings available yet.', contentWidth)}
          </Text>
        ) : (
          segments.map((segment) => {
            const label = `${resolveSegmentLabel(segment)}: `
            const value = segment.value
            const remaining = Math.max(0, contentWidth - label.length - value.length)

            return (
              <Box key={segment.id} flexDirection="row">
                <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
                  {label}
                </Text>
                <Text {...backgroundProps} {...inkColorProps(resolveSegmentColor(segment))}>
                  {value}
                </Text>
                <Text {...backgroundProps}>{' '.repeat(remaining)}</Text>
              </Box>
            )
          })
        )}
      </Box>
      <Box marginTop={1}>
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {padRight('Esc to close', contentWidth)}
        </Text>
      </Box>
    </Box>
  )
}
