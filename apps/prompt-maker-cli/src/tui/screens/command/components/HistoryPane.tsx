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
import { useTheme } from '../../../theme/theme-provider'
import { inkBackgroundColorProps } from '../../../theme/theme-types'
import type { HistoryEntry } from '../../../types'

export type HistoryPaneProps = {
  lines: HistoryEntry[]
  visibleRows: number
  scrollOffset: number
}

export const HistoryPane = ({ lines, visibleRows, scrollOffset }: HistoryPaneProps) => {
  const { theme } = useTheme()

  return (
    <Box
      flexDirection="column"
      height={visibleRows}
      width="100%"
      flexShrink={0}
      overflow="hidden"
      marginBottom={1}
      {...inkBackgroundColorProps(theme.panelBackground)}
    >
      <ScrollableOutput lines={lines} visibleRows={visibleRows} scrollOffset={scrollOffset} />
    </Box>
  )
}
