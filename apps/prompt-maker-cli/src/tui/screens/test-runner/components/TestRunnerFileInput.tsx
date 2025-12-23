/*
 * TestRunnerFileInput
 *
 * Presentational component for the test file input section.
 */

import { Box, Text } from 'ink'

import { SingleLineTextInput } from '../../../components/core/SingleLineTextInput'
import { useTheme } from '../../../theme/theme-provider'
import { inkBorderColorProps, inkColorProps } from '../../../theme/theme-types'

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

  const borderColor = isFocused ? theme.accent : theme.border

  return (
    <>
      {isFocused ? <Text {...inkColorProps(theme.accent)}>Test File</Text> : <Text>Test File</Text>}
      <Box borderStyle="round" paddingX={1} {...inkBorderColorProps(borderColor)}>
        <SingleLineTextInput
          value={filePath}
          onChange={onChange}
          placeholder="prompt-tests.yaml"
          focus={isFocused && !helpOpen}
          onSubmit={onSubmit}
        />
      </Box>
    </>
  )
}
