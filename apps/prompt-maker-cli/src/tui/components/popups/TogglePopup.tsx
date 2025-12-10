import React from 'react'
import { Box, Text } from 'ink'

const TOGGLE_OPTIONS = ['On', 'Off'] as const

export type TogglePopupProps = {
  label: string
  selectionIndex: number
}

export const TogglePopup: React.FC<TogglePopupProps> = ({ label, selectionIndex }) => (
  <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} paddingY={0}>
    <Text color="yellowBright">{label} Setting</Text>
    <Box flexDirection="column" marginTop={1}>
      {TOGGLE_OPTIONS.map((option, index) => {
        const isSelected = index === selectionIndex
        const textProps = isSelected
          ? ({ color: 'black', backgroundColor: 'yellowBright' } as const)
          : ({ color: 'white' } as const)
        return (
          <Text key={option} {...textProps}>
            {option}
          </Text>
        )
      })}
    </Box>
    <Box marginTop={1}>
      <Text color="gray">Use arrows to select · Enter to confirm · Esc to cancel</Text>
    </Box>
  </Box>
)
