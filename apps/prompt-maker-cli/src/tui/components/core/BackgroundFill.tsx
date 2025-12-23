import React, { useMemo } from 'react'
import { Box, Text } from 'ink'

const NBSP = '\u00A0'

import type { InkColorValue } from '../../theme/theme-types'
import { inkBackgroundColorProps } from '../../theme/theme-types'

export type BackgroundFillProps = {
  rows: number
  columns: number
  background: InkColorValue
}

export const BackgroundFill: React.FC<BackgroundFillProps> = ({ rows, columns, background }) => {
  const safeRows = Math.max(0, Math.floor(rows))
  const safeColumns = Math.max(0, Math.floor(columns))

  const line = useMemo(() => {
    if (safeColumns === 0) {
      return ''
    }
    return NBSP.repeat(safeColumns)
  }, [safeColumns])

  if (safeRows === 0 || safeColumns === 0) {
    return null
  }

  return (
    <Box flexDirection="column" width={safeColumns} height={safeRows} overflow="hidden">
      {Array.from({ length: safeRows }).map((_, index) => (
        <Text key={`bg-${index}`} {...inkBackgroundColorProps(background)} wrap="truncate">
          {line}
        </Text>
      ))}
    </Box>
  )
}
