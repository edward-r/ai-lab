/*
 * TestRunnerSummary
 *
 * Presentational component for displaying test run summary.
 */

import { Box, Text } from 'ink'

import type { TestRunSummary } from '../test-runner-reducer'

export type TestRunnerSummaryProps = {
  summary: TestRunSummary | null
}

export const TestRunnerSummary = ({ summary }: TestRunnerSummaryProps) => {
  if (!summary) {
    return null
  }

  return (
    <Box marginTop={1} flexDirection="column">
      <Text color="yellow">Summary</Text>
      <Text color="green">Passed: {summary.passed}</Text>
      <Text color={summary.failed > 0 ? 'red' : 'green'}>Failed: {summary.failed}</Text>
    </Box>
  )
}
