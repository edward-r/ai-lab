/*
 * TestRunnerFileInput
 *
 * Presentational component for the test file input section.
 *
 * The test runner has its own simple focus model:
 * - When focused, we draw the label/border in green.
 * - Enter moves focus to the actions section.
 */

import { Box, Text } from 'ink'

import { SingleLineTextInput } from '../../../components/core/SingleLineTextInput'

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
  return (
    <>
      {isFocused ? <Text color="green">Test File</Text> : <Text>Test File</Text>}
      <Box borderStyle="round" borderColor={isFocused ? 'green' : 'gray'} paddingX={1}>
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
