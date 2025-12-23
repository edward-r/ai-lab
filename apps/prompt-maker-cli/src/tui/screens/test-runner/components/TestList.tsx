/*
 * TestList
 *
 * Presentational component for rendering the loaded test list.
 *
 * Note: we intentionally only show the first 15 tests, matching the existing UX.
 */

import { Box, Text } from 'ink'

import { useTheme } from '../../../theme/theme-provider'
import { inkColorProps } from '../../../theme/theme-types'
import type { TestDisplayState, TestStatus } from '../test-runner-reducer'

const STATUS_LABEL: Record<TestStatus, string> = {
  pending: 'PENDING',
  running: 'RUNNING',
  pass: 'PASS',
  fail: 'FAIL',
}

export type TestListProps = {
  tests: readonly TestDisplayState[]
}

export const TestList = ({ tests }: TestListProps) => {
  const { theme } = useTheme()

  const resolveStatusColor = (status: TestStatus) => {
    switch (status) {
      case 'pending':
        return theme.mutedText
      case 'running':
        return theme.accent
      case 'pass':
        return theme.success
      case 'fail':
        return theme.error
      default: {
        const exhaustive: never = status
        return exhaustive
      }
    }
  }

  if (tests.length === 0) {
    return <Text {...inkColorProps(theme.mutedText)}>No test suite loaded yet.</Text>
  }

  const displayed = tests.slice(0, 15).map((testState, index) => (
    <Box key={`${testState.name}-${index}`} flexDirection="column">
      <Text {...inkColorProps(resolveStatusColor(testState.status))}>
        {STATUS_LABEL[testState.status].padEnd(7)} {testState.name}
      </Text>
      {testState.reason && testState.status === 'fail' ? (
        <Text {...inkColorProps(theme.mutedText)}>↳ {testState.reason}</Text>
      ) : null}
    </Box>
  ))

  return (
    <>
      {displayed}
      {tests.length > 15 ? (
        <Text {...inkColorProps(theme.mutedText)}>…and {tests.length - 15} more test(s)</Text>
      ) : null}
    </>
  )
}
