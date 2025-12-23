import { Box, Text } from 'ink'

import { ScrollableOutput } from '../core/ScrollableOutput'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'
import type { HistoryEntry } from '../../types'

export type ReasoningPopupProps = {
  lines: readonly HistoryEntry[]
  visibleRows: number
  scrollOffset: number
}

export const ReasoningPopup = ({ lines, visibleRows, scrollOffset }: ReasoningPopupProps) => {
  const { theme } = useTheme()

  if (lines.length === 0) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        paddingX={1}
        paddingY={0}
        {...inkBorderColorProps(theme.border)}
        {...inkBackgroundColorProps(theme.popupBackground)}
      >
        <Text {...inkColorProps(theme.accent)}>Model Reasoning</Text>
        <Box marginTop={1}>
          <Text {...inkColorProps(theme.mutedText)}>
            No reasoning recorded yet. Run generation first.
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text {...inkColorProps(theme.mutedText)}>Esc to close</Text>
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
      {...inkBorderColorProps(theme.border)}
      {...inkBackgroundColorProps(theme.popupBackground)}
    >
      <Text {...inkColorProps(theme.accent)}>Model Reasoning</Text>
      <Box marginTop={1} flexDirection="column" height={visibleRows} overflow="hidden">
        <ScrollableOutput lines={lines} visibleRows={visibleRows} scrollOffset={scrollOffset} />
      </Box>
      <Box marginTop={1}>
        <Text {...inkColorProps(theme.mutedText)}>↑/↓ scroll · PgUp/PgDn · Esc to close</Text>
      </Box>
    </Box>
  )
}
