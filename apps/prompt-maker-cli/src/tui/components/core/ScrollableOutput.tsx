import { memo, useMemo } from 'react'
import { Box, Text } from 'ink'

import type { HistoryEntry } from '../../types'
import { useTheme } from '../../theme/theme-provider'
import { inkBackgroundColorProps, inkColorProps, type InkColorValue } from '../../theme/theme-types'

const padRight = (value: string, width: number | undefined): string => {
  if (typeof width !== 'number' || width <= 0) {
    return value
  }

  const trimmed = value.length > width ? value.slice(0, width) : value
  return trimmed.length === width ? trimmed : trimmed.padEnd(width, ' ')
}

export type ScrollableOutputProps = {
  lines: readonly HistoryEntry[]
  visibleRows: number
  scrollOffset: number

  contentWidth?: number | undefined
  backgroundColor?: InkColorValue
}

export const ScrollableOutput = memo(
  ({ lines, visibleRows, scrollOffset, contentWidth, backgroundColor }: ScrollableOutputProps) => {
    const { theme } = useTheme()

    const startIndex = Math.max(0, Math.min(scrollOffset, Math.max(0, lines.length - visibleRows)))
    const endIndex = Math.min(lines.length, startIndex + visibleRows)
    const visibleLines = useMemo(
      () => lines.slice(startIndex, endIndex),
      [lines, startIndex, endIndex],
    )

    const backgroundProps = inkBackgroundColorProps(backgroundColor)

    const padded = useMemo(() => {
      const next: Array<HistoryEntry | null> = [...visibleLines]
      while (next.length < visibleRows) {
        next.push(null)
      }
      return next
    }, [visibleLines, visibleRows])

    return (
      <Box flexDirection="column" height={visibleRows} overflow="hidden">
        {padded.map((entry, index) => {
          if (!entry) {
            return (
              <Text key={`blank-${startIndex + index}`} {...backgroundProps}>
                {padRight('', contentWidth)}
              </Text>
            )
          }

          const key = `${entry.id}-${startIndex + index}`

          const color =
            entry.kind === 'user'
              ? theme.accent
              : entry.kind === 'progress'
                ? theme.warning
                : theme.text

          return (
            <Text key={key} {...backgroundProps} {...inkColorProps(color)}>
              {padRight(entry.content, contentWidth)}
            </Text>
          )
        })}
      </Box>
    )
  },
)

ScrollableOutput.displayName = 'ScrollableOutput'
