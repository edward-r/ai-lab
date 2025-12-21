import React, { useMemo } from 'react'
import { Box, Text } from 'ink'

import { resolveIndicatorSegments, type IndicatorSegment } from '../core/status-indicators-layout'

export type SettingsPopupProps = {
  chips: readonly string[]
}

const resolveSegmentLabel = (segment: IndicatorSegment): string => segment.label

const resolveSegmentColor = (segment: IndicatorSegment): string => {
  switch (segment.style) {
    case 'success':
      return 'green'
    case 'warning':
      return 'yellow'
    case 'danger':
      return 'red'
    case 'primary':
      return 'white'
    case 'muted':
    default:
      return 'gray'
  }
}

export const SettingsPopup: React.FC<SettingsPopupProps> = ({ chips }) => {
  const segments = useMemo(() => resolveIndicatorSegments(chips), [chips])

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="blue" paddingX={1} paddingY={0}>
      <Text color="blueBright">Current Settings</Text>
      <Box marginTop={1} flexDirection="column">
        {segments.length === 0 ? (
          <Text color="gray">No settings available yet.</Text>
        ) : (
          segments.map((segment) => (
            <Text key={segment.id} color={resolveSegmentColor(segment)}>
              <Text color="gray">{resolveSegmentLabel(segment)}: </Text>
              {segment.value}
            </Text>
          ))
        )}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Esc to close</Text>
      </Box>
    </Box>
  )
}
