import { Box, Text } from 'ink'

import { TOGGLE_LABELS } from '../../config'
import type { ToggleField } from '../../types'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'

export type TogglePopupProps = {
  field: ToggleField
  selectionIndex: number
}

export const TogglePopup = ({ field, selectionIndex }: TogglePopupProps) => {
  const { theme } = useTheme()

  const options = ['On', 'Off']

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      {...inkBorderColorProps(theme.border)}
    >
      <Text {...inkColorProps(theme.accent)}>{TOGGLE_LABELS[field]} Setting</Text>
      <Box flexDirection="column" marginTop={1}>
        {options.map((label, index) => {
          const isSelected = index === selectionIndex
          const textProps = isSelected
            ? {
                ...inkColorProps(theme.selectionText),
                ...inkBackgroundColorProps(theme.selectionBackground),
              }
            : inkColorProps(theme.text)

          return (
            <Text key={label} {...textProps}>
              {label}
            </Text>
          )
        })}
      </Box>
      <Box marginTop={1}>
        <Text {...inkColorProps(theme.mutedText)}>
          Use arrows to select · Enter to confirm · Esc to cancel
        </Text>
      </Box>
    </Box>
  )
}
