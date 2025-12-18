import React from 'react'
import { Box, Text } from 'ink'

import { SingleLineTextInput } from '../core/SingleLineTextInput'

export type InstructionsPopupProps = {
  draft: string
  onDraftChange: (value: string) => void
  onSubmitDraft: (value: string) => void
}

export const InstructionsPopup: React.FC<InstructionsPopupProps> = ({
  draft,
  onDraftChange,
  onSubmitDraft,
}) => (
  <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
    <Text color="cyanBright">Meta Instructions</Text>
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">Add optional guidance (blank clears; Enter applies)</Text>
      <SingleLineTextInput
        value={draft}
        onChange={onDraftChange}
        onSubmit={() => onSubmitDraft(draft)}
        placeholder="Be concise and focus on security"
        focus
      />
    </Box>
    <Box marginTop={1}>
      <Text color="gray">Esc closes · Enter saves</Text>
    </Box>
  </Box>
)
