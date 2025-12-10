import React from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'

export type SmartPopupProps = {
  enabled: boolean
  draft: string
  onDraftChange: (value: string) => void
  onSubmitRoot: (value: string) => void
}

export const SmartPopup: React.FC<SmartPopupProps> = ({
  enabled,
  draft,
  onDraftChange,
  onSubmitRoot,
}) => (
  <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1} paddingY={0}>
    <Text color="greenBright">Smart Context</Text>
    <Box marginTop={1}>
      <Text color="white">Status: {enabled ? 'enabled' : 'disabled'} (press T to toggle)</Text>
    </Box>
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">Root override (Enter to apply; empty to clear)</Text>
      <TextInput
        value={draft}
        onChange={onDraftChange}
        onSubmit={() => onSubmitRoot(draft)}
        placeholder="/absolute/path or relative/dir"
        focus
      />
    </Box>
    <Box marginTop={1}>
      <Text color="gray">Enter to apply root · T to toggle · Esc to close</Text>
    </Box>
    <Box marginTop={1}>
      <Text color="gray">Current root will mirror saved value.</Text>
    </Box>
    <Box marginTop={1}>
      <Text color="gray">Toggle Smart Context carefully—long scans may take time.</Text>
    </Box>
  </Box>
)
