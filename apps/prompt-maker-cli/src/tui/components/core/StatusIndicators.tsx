import React, { useMemo } from 'react'
import { Box, Text, useStdout } from 'ink'

import {
  formatIndicatorLines,
  type IndicatorSegment,
  type IndicatorStyle,
} from './status-indicators-layout'

import { useTheme } from '../../theme/theme-provider'
import { inkColorProps } from '../../theme/theme-types'
import type { InkColorValue } from '../../theme/theme-types'

export type StatusIndicatorsProps = {
  chips: readonly string[]
}

export const StatusIndicators: React.FC<StatusIndicatorsProps> = ({ chips }) => {
  const { theme } = useTheme()
  const { stdout } = useStdout()

  const resolveSegmentColor = (style: IndicatorStyle): InkColorValue => {
    switch (style) {
      case 'success':
        return theme.success
      case 'warning':
        return theme.warning
      case 'danger':
        return theme.error
      case 'primary':
        return theme.accent
      case 'muted':
      default:
        return theme.mutedText
    }
  }

  const renderSegment = (segment: IndicatorSegment): React.ReactNode => (
    <>
      <Text {...inkColorProps(theme.mutedText)}>{segment.label}: </Text>
      <Text {...inkColorProps(resolveSegmentColor(segment.style))}>{segment.value}</Text>
    </>
  )

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
              {segmentIndex > 0 ? <Text {...inkColorProps(theme.mutedText)}> · </Text> : null}
              {renderSegment(segment)}
            </React.Fragment>
          ))}
        </Text>
      ))}
    </Box>
  )
}
