import { useMemo } from 'react'
import { Box, Text } from 'ink'

import { resolveIndicatorSegments, type IndicatorSegment } from '../core/status-indicators-layout'
import { useTheme } from '../../theme/theme-provider'
import { inkBorderColorProps, inkColorProps } from '../../theme/theme-types'
import type { InkColorValue } from '../../theme/theme-types'

export type SettingsPopupProps = {
  chips: readonly string[]
}

const resolveSegmentLabel = (segment: IndicatorSegment): string => segment.label

export const SettingsPopup = ({ chips }: SettingsPopupProps) => {
  const { theme } = useTheme()
  const segments = useMemo(() => resolveIndicatorSegments(chips), [chips])

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
      {...inkBorderColorProps(theme.border)}
    >
      <Text {...inkColorProps(theme.accent)}>Current Settings</Text>
      <Box marginTop={1} flexDirection="column">
        {segments.length === 0 ? (
          <Text {...inkColorProps(theme.mutedText)}>No settings available yet.</Text>
        ) : (
          segments.map((segment) => (
            <Text key={segment.id} {...inkColorProps(resolveSegmentColor(segment))}>
              <Text {...inkColorProps(theme.mutedText)}>{resolveSegmentLabel(segment)}: </Text>
              {segment.value}
            </Text>
          ))
        )}
      </Box>
      <Box marginTop={1}>
        <Text {...inkColorProps(theme.mutedText)}>Esc to close</Text>
      </Box>
    </Box>
  )
}
