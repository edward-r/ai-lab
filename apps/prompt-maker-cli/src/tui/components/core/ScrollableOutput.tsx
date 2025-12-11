import React, { useMemo } from 'react'
import { Box, Text } from 'ink'

export type HistoryEntry = {
  id: string
  content: string
  kind: 'user' | 'system' | 'progress'
}

export type ScrollableOutputProps = {
  lines: readonly HistoryEntry[]
  visibleRows: number
  scrollOffset: number
}

export const ScrollableOutput: React.FC<ScrollableOutputProps> = ({
  lines,
  visibleRows,
  scrollOffset,
}) => {
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
        if (entry.kind === 'user') {
          return (
            <Text key={key} color="cyan">
              {entry.content}
            </Text>
          )
        }
        if (entry.kind === 'progress') {
          return (
            <Text key={key} color="yellow">
              {entry.content}
            </Text>
          )
        }
        return (
          <Text key={key} color="gray">
            {entry.content}
          </Text>
        )
      })}
    </Box>
  )
}
