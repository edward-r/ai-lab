import React from 'react'
import { Box, Text } from 'ink'

const TOGGLE_LABELS = {
  polish: 'Polish',
  copy: 'Copy',
  chatgpt: 'ChatGPT',
  json: 'JSON',
} as const

export type ToggleField = keyof typeof TOGGLE_LABELS

export type TogglePopupProps = {
  field: ToggleField
  selectionIndex: number
}

export const TogglePopup: React.FC<TogglePopupProps> = ({ field, selectionIndex }) => {
  const options = ['On', 'Off']
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} paddingY={0}>
      <Text color="yellowBright">{TOGGLE_LABELS[field]} Setting</Text>
      <Box flexDirection="column" marginTop={1}>
        {options.map((label, index) => {
          const isSelected = index === selectionIndex
          const textProps = isSelected
            ? ({ color: 'black', backgroundColor: 'yellowBright' } as const)
            : ({ color: 'white' } as const)
          return (
            <Text key={label} {...textProps}>
              {label}
            </Text>
          )
        })}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Use arrows to select · Enter to confirm · Esc to cancel</Text>
      </Box>
    </Box>
  )
}
