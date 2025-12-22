/*
 * TestRunnerLogs
 *
 * Presentational component for displaying recent test logs.
 */

import { Box, Text } from 'ink'

import type { LogEntry } from '../../../useLogBuffer'

export type TestRunnerLogsProps = {
  logs: readonly LogEntry[]
}

export const TestRunnerLogs = ({ logs }: TestRunnerLogsProps) => {
  if (logs.length === 0) {
    return null
  }

  return (
    <Box marginTop={1} flexDirection="column">
      <Text color="cyan">Recent Logs</Text>
      {logs.map((entry) => (
        <Text
          key={entry.id}
          color={entry.level === 'error' ? 'red' : entry.level === 'warn' ? 'yellow' : 'gray'}
        >
          {entry.level.toUpperCase()}: {entry.message}
        </Text>
      ))}
    </Box>
  )
}
