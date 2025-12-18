import React from 'react'
import { Box, Text } from 'ink'

import { SingleLineTextInput } from '../core/SingleLineTextInput'

import { MODEL_PROVIDER_LABELS } from '../../../model-providers'
import type { ModelOption, ProviderStatusMap } from '../../types'

export type ModelPopupProps = {
  query: string
  options: readonly ModelOption[]
  selectedIndex: number
  providerStatuses: ProviderStatusMap
  onQueryChange: (value: string) => void
  onSubmit: (option?: ModelOption) => void
}

const getRowColors = (selected: boolean, status: ModelOptionStatus): Record<string, string> => {
  if (!selected) {
    if (status === 'ok') {
      return { color: 'white' }
    }
    if (status === 'missing') {
      return { color: 'yellow' }
    }
    return { color: 'red' }
  }
  if (status === 'ok') {
    return { color: 'black', backgroundColor: 'cyanBright' }
  }
  if (status === 'missing') {
    return { color: 'black', backgroundColor: 'yellow' }
  }
  return { color: 'white', backgroundColor: 'red' }
}

type ModelOptionStatus = 'ok' | 'missing' | 'error'

const resolveOptionStatus = (
  option: ModelOption,
  providerStatuses: ProviderStatusMap,
): { status: ModelOptionStatus; message: string } => {
  const providerStatus = providerStatuses[option.provider]
  if (!providerStatus) {
    return { status: 'ok', message: 'Status unknown' }
  }
  return { status: providerStatus.status, message: providerStatus.message }
}

const describeCapabilities = (option: ModelOption): string => {
  if (option.capabilities.length > 0) {
    return option.capabilities.join(', ')
  }
  return option.description
}

export const ModelPopup: React.FC<ModelPopupProps> = ({
  query,
  options,
  selectedIndex,
  providerStatuses,
  onQueryChange,
  onSubmit,
}) => {
  const selectedOption = options[selectedIndex]
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
      <Text color="cyanBright">Select Model</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text color="gray">Search</Text>
        <SingleLineTextInput
          value={query}
          onChange={onQueryChange}
          onSubmit={() => onSubmit(selectedOption)}
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
            const { status, message } = resolveOptionStatus(option, providerStatuses)
            const rowColors = getRowColors(isSelected, status)
            const providerLabel = MODEL_PROVIDER_LABELS[option.provider]
            const annotationParts = [providerLabel, status === 'ok' ? 'OK' : message]
            if (option.source === 'config') {
              annotationParts.push('custom')
            }
            const secondaryTextParts = [describeCapabilities(option)]
            if (option.notes) {
              secondaryTextParts.push(option.notes)
            }
            return (
              <Box key={option.id} flexDirection="column" marginBottom={0}>
                <Text {...rowColors}>
                  {option.label} · {annotationParts.join(' · ')}
                </Text>
                <Text color={isSelected ? 'white' : 'gray'}>{secondaryTextParts.join(' · ')}</Text>
              </Box>
            )
          })
        )}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Enter to confirm · Esc to cancel</Text>
      </Box>
    </Box>
  )
}
