import { memo, useMemo } from 'react'
import { Box, Text, useStdout } from 'ink'

import type { CommandDescriptor } from '../../types'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'

const APP_CONTAINER_PADDING_X = 2
const COMMAND_SCREEN_PADDING_X = 1

const padRight = (value: string, width: number): string => {
  if (width <= 0) {
    return ''
  }

  const trimmed = value.length > width ? value.slice(0, width) : value
  return trimmed.length === width ? trimmed : trimmed.padEnd(width, ' ')
}

export type CommandMenuProps = {
  commands: readonly CommandDescriptor[]
  selectedIndex: number
}

export const CommandMenu = memo(({ commands, selectedIndex }: CommandMenuProps) => {
  const { theme } = useTheme()
  const { stdout } = useStdout()

  const terminalColumns = stdout?.columns ?? 80
  const borderColumns = 2
  const paddingColumns = 2
  const boxWidth = Math.max(
    0,
    terminalColumns - 2 * (APP_CONTAINER_PADDING_X + COMMAND_SCREEN_PADDING_X),
  )
  const contentWidth = Math.max(0, boxWidth - borderColumns - paddingColumns)

  const backgroundProps = inkBackgroundColorProps(theme.panelBackground)

  const commandLines = useMemo(
    () =>
      commands.map((command) => {
        const shortcut = `/${command.id}`.padEnd(10)
        return padRight(`${shortcut} ${command.description}`, contentWidth)
      }),
    [commands, contentWidth],
  )

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      width="100%"
      {...inkBorderColorProps(theme.border)}
      {...backgroundProps}
    >
      <Text {...backgroundProps} {...inkColorProps(theme.accent)}>
        {padRight('Commands', contentWidth)}
      </Text>
      {commandLines.length === 0 ? (
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {padRight('No commands match.', contentWidth)}
        </Text>
      ) : (
        commandLines.map((line, index) => {
          const isSelected = index === selectedIndex

          const textProps = isSelected
            ? {
                ...inkColorProps(theme.selectionText),
                ...inkBackgroundColorProps(theme.selectionBackground),
              }
            : { ...backgroundProps, ...inkColorProps(theme.text) }

          return (
            <Text key={commands[index]?.id ?? String(index)} {...textProps}>
              {line}
            </Text>
          )
        })
      )}
    </Box>
  )
})

CommandMenu.displayName = 'CommandMenu'
