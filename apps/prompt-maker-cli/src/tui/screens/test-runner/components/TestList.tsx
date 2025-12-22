/*
 * TestList
 *
 * Presentational component for rendering the loaded test list.
 *
 * Note: we intentionally only show the first 15 tests, matching the existing UX.
 */

import { Box, Text } from 'ink'

import type { TestDisplayState, TestStatus } from '../test-runner-reducer'

const STATUS_LABEL: Record<TestStatus, string> = {
  pending: 'PENDING',
  running: 'RUNNING',
  pass: 'PASS',
  fail: 'FAIL',
}

const STATUS_COLOR: Record<TestStatus, 'gray' | 'cyan' | 'green' | 'red'> = {
  pending: 'gray',
  running: 'cyan',
  pass: 'green',
  fail: 'red',
}

export type TestListProps = {
  tests: readonly TestDisplayState[]
}

export const TestList = ({ tests }: TestListProps) => {
  if (tests.length === 0) {
    return <Text color="gray">No test suite loaded yet.</Text>
  }

  const displayed = tests.slice(0, 15).map((testState, index) => {
    const color = STATUS_COLOR[testState.status]

    return (
      <Box key={`${testState.name}-${index}`} flexDirection="column">
        <Text color={color}>
          {STATUS_LABEL[testState.status].padEnd(7)} {testState.name}
        </Text>
        {testState.reason && testState.status === 'fail' ? (
          <Text color="gray">↳ {testState.reason}</Text>
        ) : null}
      </Box>
    )
  })

  return (
    <>
      {displayed}
      {tests.length > 15 ? <Text color="gray">…and {tests.length - 15} more test(s)</Text> : null}
    </>
  )
}
