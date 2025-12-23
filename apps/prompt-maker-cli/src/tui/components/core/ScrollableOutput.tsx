import { memo, useMemo } from 'react'
import { Box, Text } from 'ink'

import type { HistoryEntry } from '../../types'
import { useTheme } from '../../theme/theme-provider'
import { inkColorProps } from '../../theme/theme-types'

export type ScrollableOutputProps = {
  lines: readonly HistoryEntry[]
  visibleRows: number
  scrollOffset: number
}

export const ScrollableOutput = memo(
  ({ lines, visibleRows, scrollOffset }: ScrollableOutputProps) => {
    const { theme } = useTheme()

    const startIndex = Math.max(0, Math.min(scrollOffset, Math.max(0, lines.length - visibleRows)))
    const endIndex = Math.min(lines.length, startIndex + visibleRows)
    const visibleLines = useMemo(
      () => lines.slice(startIndex, endIndex),
      [lines, startIndex, endIndex],
    )

    return (
      <Box flexDirection="column" height={visibleRows} overflow="hidden">
        {visibleLines.map((entry, index) => {
          const key = `${entry.id}-${startIndex + index}`

          const color =
            entry.kind === 'user'
              ? theme.accent
              : entry.kind === 'progress'
                ? theme.warning
                : theme.text

          return (
            <Text key={key} {...inkColorProps(color)}>
              {entry.content}
            </Text>
          )
        })}
      </Box>
    )
  },
)

ScrollableOutput.displayName = 'ScrollableOutput'
