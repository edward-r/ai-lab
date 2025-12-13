import { Box, Text } from 'ink'

import { ScrollableOutput } from '../core/ScrollableOutput'
import type { HistoryEntry } from '../../types'

export type ReasoningPopupProps = {
  lines: readonly HistoryEntry[]
  visibleRows: number
  scrollOffset: number
}

export const ReasoningPopup: React.FC<ReasoningPopupProps> = ({
  lines,
  visibleRows,
  scrollOffset,
}) => {
  if (lines.length === 0) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="magenta"
        paddingX={1}
        paddingY={0}
      >
        <Text color="magentaBright">Model Reasoning</Text>
        <Box marginTop={1}>
          <Text color="gray">No reasoning recorded yet. Run generation first.</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Esc to close</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1} paddingY={0}>
      <Text color="magentaBright">Model Reasoning</Text>
      <Box marginTop={1} flexDirection="column" height={visibleRows} overflow="hidden">
        <ScrollableOutput lines={lines} visibleRows={visibleRows} scrollOffset={scrollOffset} />
      </Box>
      <Box marginTop={1}>
        <Text color="gray">↑/↓ scroll · PgUp/PgDn · Esc to close</Text>
      </Box>
    </Box>
  )
}
