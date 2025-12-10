import React from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'

export type InputBarProps = {
  value: string
  onChange: (next: string) => void
  onSubmit: (value: string) => void
  isDisabled?: boolean
  statusChips: readonly string[]
}

export const InputBar: React.FC<InputBarProps> = ({
  value,
  onChange,
  onSubmit,
  isDisabled = false,
  statusChips,
}) => (
  <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
    <Text color="cyan">{statusChips.join(' ')}</Text>
    <Text color="gray">Intent / Command</Text>
    <Box>
      <Text color="cyan">› </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder="Describe your goal or type /command"
        focus={!isDisabled}
      />
    </Box>
  </Box>
)
