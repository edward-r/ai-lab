import { memo } from 'react'
import { Box, Text } from 'ink'

import type { CommandDescriptor } from '../../types'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'

export type CommandMenuProps = {
  commands: readonly CommandDescriptor[]
  selectedIndex: number
}

export const CommandMenu = memo(({ commands, selectedIndex }: CommandMenuProps) => {
  const { theme } = useTheme()

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      width="100%"
      {...inkBorderColorProps(theme.border)}
      {...inkBackgroundColorProps(theme.panelBackground)}
    >
      <Text {...inkColorProps(theme.accent)}>Commands</Text>
      {commands.length === 0 ? (
        <Text {...inkColorProps(theme.mutedText)}>No commands match.</Text>
      ) : (
        commands.map((command, index) => {
          const isSelected = index === selectedIndex
          const shortcut = `/${command.id}`.padEnd(10)

          const textProps = isSelected
            ? {
                ...inkColorProps(theme.selectionText),
                ...inkBackgroundColorProps(theme.selectionBackground),
              }
            : inkColorProps(theme.text)

          return (
            <Text key={command.id} {...textProps}>
              {shortcut} {command.description}
            </Text>
          )
        })
      )}
    </Box>
  )
})

CommandMenu.displayName = 'CommandMenu'
