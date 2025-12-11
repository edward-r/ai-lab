import React from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'

export type TestPopupProps = {
  draft: string
  isRunning: boolean
  onDraftChange: (value: string) => void
  onSubmitDraft: (value: string) => void
}

export const TestPopup: React.FC<TestPopupProps> = ({
  draft,
  isRunning,
  onDraftChange,
  onSubmitDraft,
}) => (
  <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
    <Text color="cyanBright">Prompt Tests</Text>
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">Suite path (Enter to run; blank uses prompt-tests.yaml)</Text>
      <TextInput
        value={draft}
        onChange={onDraftChange}
        onSubmit={() => onSubmitDraft(draft)}
        placeholder="prompt-tests.yaml"
        focus
      />
    </Box>
    <Box marginTop={1}>
      <Text color="gray">
        {isRunning ? 'Tests running… please wait' : 'Enter to start tests · Esc to close'}
      </Text>
    </Box>
  </Box>
)
