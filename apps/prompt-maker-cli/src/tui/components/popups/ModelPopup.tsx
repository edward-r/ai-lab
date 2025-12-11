import React from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'

export type ModelPopupOption = {
  id: string
  label: string
  description: string
}

export type ModelPopupProps = {
  query: string
  options: readonly ModelPopupOption[]
  selectedIndex: number
  onQueryChange: (value: string) => void
  onSubmit: (option?: ModelPopupOption) => void
}

export const ModelPopup: React.FC<ModelPopupProps> = ({
  query,
  options,
  selectedIndex,
  onQueryChange,
  onSubmit,
}) => (
  <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
    <Text color="cyanBright">Select Model</Text>
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">Search</Text>
      <TextInput
        value={query}
        onChange={onQueryChange}
        onSubmit={() => onSubmit(options[selectedIndex])}
        placeholder="Start typing a model name"
        focus
      />
    </Box>
    <Box flexDirection="column" marginTop={1}>
      {options.length === 0 ? (
        <Text color="gray">No models match.</Text>
      ) : (
        options.map((option, index) => {
          const isSelected = index === selectedIndex
          const textProps = isSelected
            ? ({ color: 'black', backgroundColor: 'cyanBright' } as const)
            : ({ color: 'white' } as const)
          return (
            <Text key={option.id} {...textProps}>
              {option.label} · {option.description}
            </Text>
          )
        })
      )}
    </Box>
    <Box marginTop={1}>
      <Text color="gray">Enter to confirm · Esc to cancel</Text>
    </Box>
  </Box>
)
