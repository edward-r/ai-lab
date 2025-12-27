import React from 'react'
import { Box, Text } from 'ink'

import { MultilineTextInput, type DebugKeyEvent } from './MultilineTextInput'
import { resolveIndicatorSegments } from './status-indicators-layout'
import { resolveInputBarPresentation, type InputBarMode } from './input-bar-presentation'
import type { TokenLabelLookup } from './tokenized-text'
import { getLineCount } from './multiline-text-buffer'

import { OpencodeSpinner } from '../OpencodeSpinner'

import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'

export type InputBarProps = {
  value: string
  onChange: (next: string) => void
  onSubmit: (value: string) => void
  mode?: InputBarMode
  isDisabled?: boolean
  isPasteActive?: boolean
  isBusy?: boolean
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
  isBusy = false,
  statusChips,
  placeholder,
  hint,
  debugLine,
  tokenLabel,
  onDebugKeyEvent,
}) => {
  const { theme } = useTheme()

  // `resolveInputBarPresentation` is pure but involves string/config mapping.
  // Memoizing it keeps the render path a bit more predictable.
  const presentation = React.useMemo(() => resolveInputBarPresentation(mode), [mode])

  const summary = React.useMemo(() => {
    const segments = resolveIndicatorSegments(statusChips)
    const status = segments.find((segment) => segment.label === 'Status')
    const model = segments.find((segment) => segment.label === 'Model')
    const target = segments.find((segment) => segment.label === 'Target')
    return { status, model, target }
  }, [statusChips])

  const borderColor = presentation.borderTone === 'warning' ? theme.warning : theme.border
  const labelColor = presentation.labelTone === 'warning' ? theme.warning : theme.mutedText

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      width="100%"
      {...inkBorderColorProps(borderColor)}
      {...inkBackgroundColorProps(theme.panelBackground)}
    >
      <Text {...inkColorProps(labelColor)} bold={presentation.labelBold}>
        {presentation.label}
      </Text>
      {hint ? <Text {...inkColorProps(theme.mutedText)}>{hint}</Text> : null}
      {debugLine ? <Text {...inkColorProps(theme.mutedText)}>{debugLine}</Text> : null}
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

      {summary.status || summary.model || summary.target ? (
        <Box flexDirection="row" flexWrap="wrap">
          {summary.status ? (
            <Box flexDirection="row" flexShrink={0}>
              <Text {...inkColorProps(theme.mutedText)}>Status: </Text>
              {isBusy ? (
                <Box flexDirection="row" flexShrink={0}>
                  <OpencodeSpinner />
                  <Text {...inkColorProps(theme.mutedText)}> </Text>
                  <Text {...inkColorProps(theme.accent)}>{summary.status.value}</Text>
                </Box>
              ) : (
                <Text {...inkColorProps(theme.accent)}>{summary.status.value}</Text>
              )}
            </Box>
          ) : null}
          {summary.status && (summary.model || summary.target) ? (
            <Text {...inkColorProps(theme.mutedText)}> · </Text>
          ) : null}
          {summary.model ? (
            <Box flexDirection="row" flexShrink={0}>
              <Text {...inkColorProps(theme.mutedText)}>Model: </Text>
              <Text {...inkColorProps(theme.text)}>{summary.model.value}</Text>
            </Box>
          ) : null}
          {summary.model && summary.target ? (
            <Text {...inkColorProps(theme.mutedText)}> · </Text>
          ) : null}
          {summary.target ? (
            <Box flexDirection="row" flexShrink={0}>
              <Text {...inkColorProps(theme.mutedText)}>Target: </Text>
              <Text {...inkColorProps(theme.text)}>{summary.target.value}</Text>
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  )
}
