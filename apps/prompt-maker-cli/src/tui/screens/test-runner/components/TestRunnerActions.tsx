/*
 * TestRunnerActions
 *
 * Presentational component for the "actions" section.
 */

import { Box, Text } from 'ink'

export type TestRunnerActionsProps = {
  isFocused: boolean
  status: 'idle' | 'running'
  lastRunFile: string | null
}

export const TestRunnerActions = ({ isFocused, status, lastRunFile }: TestRunnerActionsProps) => {
  return (
    <Box marginTop={1} flexDirection="column">
      {isFocused ? <Text color="green">Actions</Text> : <Text>Actions</Text>}
      <Text>Press Enter to run tests</Text>
      <Text color="gray">Status: {status === 'running' ? 'Running tests…' : 'Idle'}</Text>
      {lastRunFile ? (
        <Text color="gray">Last suite: {lastRunFile}</Text>
      ) : (
        <Text color="gray">No runs yet</Text>
      )}
    </Box>
  )
}
