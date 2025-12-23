/*
 * TestRunnerActions
 *
 * Presentational component for the "actions" section.
 */

import { Box, Text } from 'ink'

import { useTheme } from '../../../theme/theme-provider'
import { inkColorProps } from '../../../theme/theme-types'

export type TestRunnerActionsProps = {
  isFocused: boolean
  status: 'idle' | 'running'
  lastRunFile: string | null
}

export const TestRunnerActions = ({ isFocused, status, lastRunFile }: TestRunnerActionsProps) => {
  const { theme } = useTheme()

  return (
    <Box marginTop={1} flexDirection="column">
      {isFocused ? <Text {...inkColorProps(theme.accent)}>Actions</Text> : <Text>Actions</Text>}
      <Text>Press Enter to run tests</Text>
      <Text {...inkColorProps(theme.mutedText)}>
        Status: {status === 'running' ? 'Running tests…' : 'Idle'}
      </Text>
      {lastRunFile ? (
        <Text {...inkColorProps(theme.mutedText)}>Last suite: {lastRunFile}</Text>
      ) : (
        <Text {...inkColorProps(theme.mutedText)}>No runs yet</Text>
      )}
    </Box>
  )
}
