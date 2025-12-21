import React, { useMemo } from 'react'
import { Box, Text, useStdout } from 'ink'

import {
  formatIndicatorLines,
  type IndicatorSegment,
  type IndicatorStyle,
} from './status-indicators-layout'

export type StatusIndicatorsProps = {
  chips: readonly string[]
}

const resolveSegmentColor = (style: IndicatorStyle): string => {
  switch (style) {
    case 'success':
      return 'green'
    case 'warning':
      return 'yellow'
    case 'danger':
      return 'red'
    case 'primary':
      return 'cyan'
    case 'muted':
    default:
      return 'gray'
  }
}

const renderSegment = (segment: IndicatorSegment): React.ReactNode => (
  <>
    <Text color="gray">{segment.label}: </Text>
    <Text color={resolveSegmentColor(segment.style)}>{segment.value}</Text>
  </>
)

export const StatusIndicators: React.FC<StatusIndicatorsProps> = ({ chips }) => {
  const { stdout } = useStdout()

  const maxWidth = useMemo(() => {
    const columns = stdout?.columns ?? 80
    return Math.max(24, columns - 6)
  }, [stdout])

  const lines = useMemo(
    () =>
      formatIndicatorLines({
        chips,
        maxWidth,
      }),
    [chips, maxWidth],
  )

  return (
    <Box flexDirection="column">
      {lines.map((line, lineIndex) => (
        <Text key={`status-line-${lineIndex}`} wrap="wrap">
          {line.segments.map((segment, segmentIndex) => (
            <React.Fragment key={segment.id}>
              {segmentIndex > 0 ? <Text color="gray"> · </Text> : null}
              {renderSegment(segment)}
            </React.Fragment>
          ))}
        </Text>
      ))}
    </Box>
  )
}
