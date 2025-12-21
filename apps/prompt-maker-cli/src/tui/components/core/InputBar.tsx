import React from 'react'
import { Box, Text } from 'ink'

import { MultilineTextInput, type DebugKeyEvent } from './MultilineTextInput'
import { resolveIndicatorSegments } from './status-indicators-layout'
import { resolveInputBarPresentation, type InputBarMode } from './input-bar-presentation'
import type { TokenLabelLookup } from './tokenized-text'
import { getLineCount } from './multiline-text-buffer'

export type InputBarProps = {
  value: string
  onChange: (next: string) => void
  onSubmit: (value: string) => void
  mode?: InputBarMode
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
  mode = 'intent',
  isDisabled = false,
  isPasteActive = false,
  statusChips,
  placeholder,
  hint,
  debugLine,
  tokenLabel,
  onDebugKeyEvent,
}) => {
  const presentation = resolveInputBarPresentation(mode)

  const summary = React.useMemo(() => {
    const segments = resolveIndicatorSegments(statusChips)
    const status = segments.find((segment) => segment.label === 'Status')
    const model = segments.find((segment) => segment.label === 'Model')
    return { status, model }
  }, [statusChips])

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={presentation.borderColor}
      paddingX={1}
      paddingY={0}
    >
      <Text color={presentation.labelColor} bold={presentation.labelBold}>
        {presentation.label}
      </Text>
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

      {summary.status || summary.model ? (
        <Text color="gray">
          {summary.status ? (
            <>
              <Text color="gray">Status: </Text>
              <Text color="cyan">{summary.status.value}</Text>
            </>
          ) : null}
          {summary.status && summary.model ? <Text color="gray"> · </Text> : null}
          {summary.model ? (
            <>
              <Text color="gray">Model: </Text>
              <Text color="white">{summary.model.value}</Text>
            </>
          ) : null}
        </Text>
      ) : null}
    </Box>
  )
}
