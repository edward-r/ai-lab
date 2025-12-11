import React from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'

export type IntentFilePopupProps = {
  draft: string
  onDraftChange: (value: string) => void
  onSubmitDraft: (value: string) => void
}

export const IntentFilePopup: React.FC<IntentFilePopupProps> = ({
  draft,
  onDraftChange,
  onSubmitDraft,
}) => (
  <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
    <Text color="cyanBright">Intent File</Text>
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">Enter a file path (blank clears; Enter to apply)</Text>
      <TextInput
        value={draft}
        onChange={onDraftChange}
        onSubmit={() => onSubmitDraft(draft)}
        placeholder="prompts/intent.md"
        focus
      />
    </Box>
    <Box marginTop={1}>
      <Text color="gray">Esc closes · Enter saves</Text>
    </Box>
  </Box>
)
