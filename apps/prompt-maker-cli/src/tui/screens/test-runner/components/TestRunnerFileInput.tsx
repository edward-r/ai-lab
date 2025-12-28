/*
 * TestRunnerFileInput
 *
 * Presentational component for the test file input section.
 */

import { Box, Text, useStdout } from 'ink'

import { SingleLineTextInput } from '../../../components/core/SingleLineTextInput'
import { useTheme } from '../../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../../theme/theme-types'

const APP_CONTAINER_PADDING_X = 2

const padRight = (value: string, width: number): string => {
  if (width <= 0) {
    return ''
  }

  const trimmed = value.length > width ? value.slice(0, width) : value
  return trimmed.length === width ? trimmed : trimmed.padEnd(width, ' ')
}

export type TestRunnerFileInputProps = {
  filePath: string
  isFocused: boolean
  helpOpen: boolean
  onChange: (next: string) => void
  onSubmit: () => void
}

export const TestRunnerFileInput = ({
  filePath,
  isFocused,
  helpOpen,
  onChange,
  onSubmit,
}: TestRunnerFileInputProps) => {
  const { theme } = useTheme()
  const { stdout } = useStdout()

  const terminalColumns = stdout?.columns ?? 80
  const boxWidth = Math.max(0, terminalColumns - 2 * APP_CONTAINER_PADDING_X)

  const borderColumns = 2
  const paddingColumns = 2
  const contentWidth = Math.max(0, boxWidth - borderColumns - paddingColumns)

  const backgroundProps = inkBackgroundColorProps(theme.panelBackground)

  const borderColor = isFocused ? theme.accent : theme.border

  return (
    <>
      <Text {...backgroundProps} {...inkColorProps(isFocused ? theme.accent : theme.text)}>
        {padRight('Test File', contentWidth)}
      </Text>
      <Box
        borderStyle="round"
        paddingX={1}
        width={boxWidth}
        {...inkBorderColorProps(borderColor)}
        {...backgroundProps}
      >
        <SingleLineTextInput
          value={filePath}
          onChange={onChange}
          placeholder="prompt-tests.yaml"
          focus={isFocused && !helpOpen}
          onSubmit={onSubmit}
          width={contentWidth}
          backgroundColor={theme.panelBackground}
        />
      </Box>
    </>
  )
}
