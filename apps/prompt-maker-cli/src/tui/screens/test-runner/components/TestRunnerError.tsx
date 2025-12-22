/*
 * TestRunnerError
 *
 * Presentational component for showing an error message.
 */

import { Text } from 'ink'

export type TestRunnerErrorProps = {
  message: string | null
}

export const TestRunnerError = ({ message }: TestRunnerErrorProps) => {
  if (!message) {
    return null
  }

  return <Text color="red">{message}</Text>
}
