import React from 'react'
import { Box, Text } from 'ink'

import type { TokenUsageBreakdown, TokenUsageRun } from '../../token-usage-store'

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

export const TokenUsagePopup: React.FC<TokenUsagePopupProps> = ({ run, breakdown }) => {
  if (!run || !breakdown) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="yellow"
        paddingX={1}
        paddingY={0}
      >
        <Text color="yellowBright">Token Usage</Text>
        <Box marginTop={1}>
          <Text color="gray">No token usage recorded yet. Run generation first.</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Esc to close</Text>
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
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} paddingY={0}>
      <Text color="yellowBright">Token Usage</Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="white">Model: {run.model}</Text>
        <Text color="gray">Started: {run.startedAt}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="gray">Input</Text>
        {inputRows.map((line) => (
          <Text key={`input-${line}`} color="white">
            {line}
          </Text>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="gray">Output</Text>
        {outputRows.map((line) => (
          <Text key={`output-${line}`} color="white">
            {line}
          </Text>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="gray">Totals</Text>
        <Text color="white">Total tokens {formatNumber(breakdown.totals.tokens)}</Text>
        <Text color="white">Estimated cost {formatUsd(breakdown.totals.estimatedCostUsd)}</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Esc to close</Text>
      </Box>
    </Box>
  )
}
