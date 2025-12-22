/*
 * HistoryPane
 *
 * Presentational component: renders the scrollable history/log output.
 *
 * Keeping this separate from `CommandScreen` makes the screen easier to scan:
 * the screen model decides *what* to show, and this component decides *how* it
 * is laid out.
 */

import { Box } from 'ink'

import { ScrollableOutput } from '../../../components/core/ScrollableOutput'
import type { HistoryEntry } from '../../../types'

export type HistoryPaneProps = {
  lines: HistoryEntry[]
  visibleRows: number
  scrollOffset: number
}

export const HistoryPane = ({ lines, visibleRows, scrollOffset }: HistoryPaneProps) => {
  return (
    <Box
      flexDirection="column"
      height={visibleRows}
      flexShrink={0}
      overflow="hidden"
      marginBottom={1}
    >
      <ScrollableOutput lines={lines} visibleRows={visibleRows} scrollOffset={scrollOffset} />
    </Box>
  )
}
