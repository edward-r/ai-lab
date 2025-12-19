import { memo } from 'react'
import { Box, Text } from 'ink'

import type { CommandDescriptor } from '../../types'

export type CommandMenuProps = {
  commands: readonly CommandDescriptor[]
  selectedIndex: number
}

export const CommandMenu = memo(({ commands, selectedIndex }: CommandMenuProps) => (
  <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1} paddingY={0}>
    <Text color="magentaBright">Commands</Text>
    {commands.length === 0 ? (
      <Text color="gray">No commands match.</Text>
    ) : (
      commands.map((command, index) => {
        const isSelected = index === selectedIndex
        const shortcut = `/${command.id}`.padEnd(10)
        const textProps = isSelected
          ? ({ color: 'black', backgroundColor: 'magentaBright' } as const)
          : ({ color: 'white' } as const)
        return (
          <Text key={command.id} {...textProps}>
            {shortcut} {command.description}
          </Text>
        )
      })
    )}
  </Box>
))

CommandMenu.displayName = 'CommandMenu'
