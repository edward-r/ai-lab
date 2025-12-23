/*
 * TestRunnerSummary
 *
 * Presentational component for displaying test run summary.
 */

import { Box, Text } from 'ink'

import { useTheme } from '../../../theme/theme-provider'
import { inkColorProps } from '../../../theme/theme-types'
import type { TestRunSummary } from '../test-runner-reducer'

export type TestRunnerSummaryProps = {
  summary: TestRunSummary | null
}

export const TestRunnerSummary = ({ summary }: TestRunnerSummaryProps) => {
  const { theme } = useTheme()

  if (!summary) {
    return null
  }

  return (
    <Box marginTop={1} flexDirection="column">
      <Text {...inkColorProps(theme.accent)}>Summary</Text>
      <Text {...inkColorProps(theme.success)}>Passed: {summary.passed}</Text>
      <Text {...inkColorProps(summary.failed > 0 ? theme.error : theme.success)}>
        Failed: {summary.failed}
      </Text>
    </Box>
  )
}
