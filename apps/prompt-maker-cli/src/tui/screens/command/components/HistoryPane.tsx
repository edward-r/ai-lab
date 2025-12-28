/*
 * HistoryPane
 *
 * Presentational component: renders the scrollable history/log output.
 *
 * Keeping this separate from `CommandScreen` makes the screen easier to scan:
 * the screen model decides *what* to show, and this component decides *how* it
 * is laid out.
 */

import { Box, useStdout } from 'ink'

import { ScrollableOutput } from '../../../components/core/ScrollableOutput'
import { useTheme } from '../../../theme/theme-provider'
import { inkBackgroundColorProps } from '../../../theme/theme-types'

const APP_CONTAINER_PADDING_X = 2
const COMMAND_SCREEN_PADDING_X = 1
import type { HistoryEntry } from '../../../types'

export type HistoryPaneProps = {
  lines: HistoryEntry[]
  visibleRows: number
  scrollOffset: number
}

export const HistoryPane = ({ lines, visibleRows, scrollOffset }: HistoryPaneProps) => {
  const { theme } = useTheme()
  const { stdout } = useStdout()

  const terminalColumns = stdout?.columns ?? 80
  const contentWidth = Math.max(
    0,
    terminalColumns - 2 * (APP_CONTAINER_PADDING_X + COMMAND_SCREEN_PADDING_X),
  )

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
      <ScrollableOutput
        lines={lines}
        visibleRows={visibleRows}
        scrollOffset={scrollOffset}
        contentWidth={contentWidth}
        backgroundColor={theme.panelBackground}
      />
    </Box>
  )
}
