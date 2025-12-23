/*
 * TestRunnerError
 *
 * Presentational component for showing an error message.
 */

import { Text } from 'ink'

import { useTheme } from '../../../theme/theme-provider'
import { inkColorProps } from '../../../theme/theme-types'

export type TestRunnerErrorProps = {
  message: string | null
}

export const TestRunnerError = ({ message }: TestRunnerErrorProps) => {
  const { theme } = useTheme()

  if (!message) {
    return null
  }

  return <Text {...inkColorProps(theme.error)}>{message}</Text>
}
