import { Box, Text, useStdout } from 'ink'

import type { TokenUsageBreakdown, TokenUsageRun } from '../../token-usage-store'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'

const formatNumber = (value: number): string => value.toLocaleString('en-US')

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max))

const padRight = (value: string, width: number): string => {
  if (width <= 0) {
    return ''
  }

  const trimmed = value.length > width ? value.slice(0, width) : value
  return trimmed.length === width ? trimmed : trimmed.padEnd(width, ' ')
}

const formatUsd = (value: number | null): string => {
  if (value === null) {
    return 'n/a'
  }
  if (value === 0) {
    return '$0.00'
  }
  if (value < 0.01) {
    return `$${value.toFixed(4)}`
  }
  return `$${value.toFixed(2)}`
}

const padCell = (value: string, width: number, align: 'left' | 'right'): string => {
  if (value.length >= width) {
    return value
  }
  const padding = ' '.repeat(width - value.length)
  return align === 'right' ? `${padding}${value}` : `${value}${padding}`
}

type Row = {
  label: string
  tokens: number
}

const renderTable = (rows: readonly Row[]): string[] => {
  const labelWidth = Math.max(12, ...rows.map((row) => row.label.length))
  const tokenWidth = Math.max(8, ...rows.map((row) => formatNumber(row.tokens).length))

  return rows.map((row) => {
    const label = padCell(row.label, labelWidth, 'left')
    const tokens = padCell(formatNumber(row.tokens), tokenWidth, 'right')
    return `${label}  ${tokens}`
  })
}

export type TokenUsagePopupProps = {
  run: TokenUsageRun | null
  breakdown: TokenUsageBreakdown | null
}

export const TokenUsagePopup = ({ run, breakdown }: TokenUsagePopupProps) => {
  const { theme } = useTheme()
  const { stdout } = useStdout()

  const terminalColumns = stdout?.columns ?? 80
  const popupWidth = clamp(terminalColumns - 10, 40, 72)

  const borderColumns = 2
  const paddingColumns = 2
  const contentWidth = Math.max(0, popupWidth - borderColumns - paddingColumns)

  const backgroundProps = inkBackgroundColorProps(theme.popupBackground)

  if (!run || !breakdown) {
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
          {padRight('Token Usage', contentWidth)}
        </Text>
        <Box marginTop={1}>
          <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
            {padRight('No token usage recorded yet. Run generation first.', contentWidth)}
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
            {padRight('Esc to close', contentWidth)}
          </Text>
        </Box>
      </Box>
    )
  }

  const inputRows = renderTable([
    { label: 'Intent', tokens: breakdown.input.intent },
    { label: 'Files', tokens: breakdown.input.files },
    { label: 'System', tokens: breakdown.input.system },
    { label: 'Input total', tokens: breakdown.input.total },
  ])

  const outputRows = renderTable([
    { label: 'Reasoning', tokens: breakdown.output.reasoning },
    { label: 'Final prompt', tokens: breakdown.output.prompt },
    { label: 'Output total', tokens: breakdown.output.total },
  ])

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
        {padRight('Token Usage', contentWidth)}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text {...backgroundProps} {...inkColorProps(theme.text)}>
          {padRight(`Model: ${run.model}`, contentWidth)}
        </Text>
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {padRight(`Started: ${run.startedAt}`, contentWidth)}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {padRight('Input', contentWidth)}
        </Text>
        {inputRows.map((line) => (
          <Text key={`input-${line}`} {...backgroundProps} {...inkColorProps(theme.text)}>
            {padRight(line, contentWidth)}
          </Text>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {padRight('Output', contentWidth)}
        </Text>
        {outputRows.map((line) => (
          <Text key={`output-${line}`} {...backgroundProps} {...inkColorProps(theme.text)}>
            {padRight(line, contentWidth)}
          </Text>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {padRight('Totals', contentWidth)}
        </Text>
        <Text {...backgroundProps} {...inkColorProps(theme.text)}>
          {padRight(`Total tokens ${formatNumber(breakdown.totals.tokens)}`, contentWidth)}
        </Text>
        <Text {...backgroundProps} {...inkColorProps(theme.text)}>
          {padRight(`Estimated cost ${formatUsd(breakdown.totals.estimatedCostUsd)}`, contentWidth)}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {padRight('Esc to close', contentWidth)}
        </Text>
      </Box>
    </Box>
  )
}
