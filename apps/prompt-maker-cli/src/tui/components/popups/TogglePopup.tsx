import { Box, Text, useStdout } from 'ink'

import { TOGGLE_LABELS } from '../../config'
import type { ToggleField } from '../../types'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max))

const padRight = (value: string, width: number): string => {
  if (width <= 0) {
    return ''
  }

  const trimmed = value.length > width ? value.slice(0, width) : value
  return trimmed.length === width ? trimmed : trimmed.padEnd(width, ' ')
}

export type TogglePopupProps = {
  field: ToggleField
  selectionIndex: number
}

export const TogglePopup = ({ field, selectionIndex }: TogglePopupProps) => {
  const { theme } = useTheme()
  const { stdout } = useStdout()

  const terminalColumns = stdout?.columns ?? 80
  const popupWidth = clamp(terminalColumns - 10, 40, 72)

  const borderColumns = 2
  const paddingColumns = 2
  const contentWidth = Math.max(0, popupWidth - borderColumns - paddingColumns)

  const backgroundProps = inkBackgroundColorProps(theme.popupBackground)

  const options = ['On', 'Off']

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      width={popupWidth}
      {...inkBorderColorProps(theme.border)}
      {...backgroundProps}
    >
      <Text {...backgroundProps} {...inkColorProps(theme.accent)}>
        {padRight(`${TOGGLE_LABELS[field]} Setting`, contentWidth)}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {options.map((label, index) => {
          const isSelected = index === selectionIndex
          const textProps = isSelected
            ? {
                ...inkColorProps(theme.selectionText),
                ...inkBackgroundColorProps(theme.selectionBackground),
              }
            : { ...backgroundProps, ...inkColorProps(theme.text) }

          return (
            <Text key={label} {...textProps}>
              {padRight(label, contentWidth)}
            </Text>
          )
        })}
      </Box>
      <Box marginTop={1}>
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {padRight('Use arrows to select · Enter to confirm · Esc to cancel', contentWidth)}
        </Text>
      </Box>
    </Box>
  )
}
