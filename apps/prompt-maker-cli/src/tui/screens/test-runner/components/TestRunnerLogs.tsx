/*
 * TestRunnerLogs
 *
 * Presentational component for displaying recent test logs.
 */

import { Box, Text } from 'ink'

import type { LogEntry } from '../../../useLogBuffer'
import { useTheme } from '../../../theme/theme-provider'
import { inkColorProps } from '../../../theme/theme-types'

export type TestRunnerLogsProps = {
  logs: readonly LogEntry[]
}

export const TestRunnerLogs = ({ logs }: TestRunnerLogsProps) => {
  const { theme } = useTheme()

  if (logs.length === 0) {
    return null
  }

  return (
    <Box marginTop={1} flexDirection="column">
      <Text {...inkColorProps(theme.accent)}>Recent Logs</Text>
      {logs.map((entry) => {
        const color =
          entry.level === 'error'
            ? theme.error
            : entry.level === 'warn'
              ? theme.warning
              : theme.mutedText

        return (
          <Text key={entry.id} {...inkColorProps(color)}>
            {entry.level.toUpperCase()}: {entry.message}
          </Text>
        )
      })}
    </Box>
  )
}
