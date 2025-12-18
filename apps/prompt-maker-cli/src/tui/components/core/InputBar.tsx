import React from 'react'
import { Box, Text } from 'ink'

import { MultilineTextInput, type DebugKeyEvent } from './MultilineTextInput'
import type { TokenLabelLookup } from './tokenized-text'
import { getLineCount } from './multiline-text-buffer'

export type InputBarProps = {
  value: string
  onChange: (next: string) => void
  onSubmit: (value: string) => void
  isDisabled?: boolean
  isPasteActive?: boolean
  statusChips: readonly string[]
  placeholder?: string
  hint?: string | undefined
  debugLine?: string | undefined
  tokenLabel?: TokenLabelLookup | undefined
  onDebugKeyEvent?: ((event: DebugKeyEvent) => void) | undefined
}

export type InputBarRowEstimateOptions = {
  value: string
  hint?: string | undefined
  debugLine?: string | undefined
}

export const estimateInputBarRows = ({
  value,
  hint,
  debugLine,
}: InputBarRowEstimateOptions): number => {
  const lineCount = getLineCount(value)
  const contentRows = 2 + (hint ? 1 : 0) + (debugLine ? 1 : 0) + lineCount
  const borderRows = 2
  return Math.max(6, borderRows + contentRows)
}

export const InputBar: React.FC<InputBarProps> = ({
  value,
  onChange,
  onSubmit,
  isDisabled = false,
  isPasteActive = false,
  statusChips,
  placeholder,
  hint,
  debugLine,
  tokenLabel,
  onDebugKeyEvent,
}) => (
  <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
    <Text color="cyan">{statusChips.join(' ')}</Text>
    <Text color="gray">Intent / Command</Text>
    {hint ? <Text color="gray">{hint}</Text> : null}
    {debugLine ? <Text color="gray">{debugLine}</Text> : null}
    <MultilineTextInput
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      placeholder={placeholder ?? 'Describe your goal or type /command'}
      focus={!isDisabled}
      isDisabled={isDisabled}
      isPasteActive={isPasteActive}
      tokenLabel={tokenLabel}
      onDebugKeyEvent={onDebugKeyEvent}
    />
  </Box>
)
