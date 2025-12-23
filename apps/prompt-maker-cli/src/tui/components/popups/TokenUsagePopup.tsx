import { Box, Text } from 'ink'

import type { TokenUsageBreakdown, TokenUsageRun } from '../../token-usage-store'
import { useTheme } from '../../theme/theme-provider'
import { inkBorderColorProps, inkColorProps } from '../../theme/theme-types'

const formatNumber = (value: number): string => value.toLocaleString('en-US')

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

  if (!run || !breakdown) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        paddingX={1}
        paddingY={0}
        {...inkBorderColorProps(theme.border)}
      >
        <Text {...inkColorProps(theme.accent)}>Token Usage</Text>
        <Box marginTop={1}>
          <Text {...inkColorProps(theme.mutedText)}>
            No token usage recorded yet. Run generation first.
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text {...inkColorProps(theme.mutedText)}>Esc to close</Text>
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
      {...inkBorderColorProps(theme.border)}
    >
      <Text {...inkColorProps(theme.accent)}>Token Usage</Text>
      <Box marginTop={1} flexDirection="column">
        <Text {...inkColorProps(theme.text)}>Model: {run.model}</Text>
        <Text {...inkColorProps(theme.mutedText)}>Started: {run.startedAt}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text {...inkColorProps(theme.mutedText)}>Input</Text>
        {inputRows.map((line) => (
          <Text key={`input-${line}`} {...inkColorProps(theme.text)}>
            {line}
          </Text>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text {...inkColorProps(theme.mutedText)}>Output</Text>
        {outputRows.map((line) => (
          <Text key={`output-${line}`} {...inkColorProps(theme.text)}>
            {line}
          </Text>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text {...inkColorProps(theme.mutedText)}>Totals</Text>
        <Text {...inkColorProps(theme.text)}>
          Total tokens {formatNumber(breakdown.totals.tokens)}
        </Text>
        <Text {...inkColorProps(theme.text)}>
          Estimated cost {formatUsd(breakdown.totals.estimatedCostUsd)}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text {...inkColorProps(theme.mutedText)}>Esc to close</Text>
      </Box>
    </Box>
  )
}
