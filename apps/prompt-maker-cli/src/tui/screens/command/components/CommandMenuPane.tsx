/*
 * CommandMenuPane
 *
 * Presentational wrapper for the command palette list.
 */

import { Box } from 'ink'

import { CommandMenu } from '../../../components/core/CommandMenu'
import type { CommandDescriptor } from '../../../types'

export type CommandMenuPaneProps = {
  isActive: boolean
  height: number
  commands: readonly CommandDescriptor[]
  selectedIndex: number
}

export const CommandMenuPane = ({
  isActive,
  height,
  commands,
  selectedIndex,
}: CommandMenuPaneProps) => {
  if (!isActive) {
    return null
  }

  return (
    <Box marginBottom={1} height={height} flexShrink={0} overflow="hidden">
      <CommandMenu commands={commands} selectedIndex={selectedIndex} />
    </Box>
  )
}
