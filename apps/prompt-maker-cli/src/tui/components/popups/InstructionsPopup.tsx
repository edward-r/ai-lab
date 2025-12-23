import { Box, Text } from 'ink'

import { SingleLineTextInput } from '../core/SingleLineTextInput'
import { useTheme } from '../../theme/theme-provider'
import { inkBorderColorProps, inkColorProps } from '../../theme/theme-types'

export type InstructionsPopupProps = {
  draft: string
  onDraftChange: (value: string) => void
  onSubmitDraft: (value: string) => void
}

export const InstructionsPopup = ({
  draft,
  onDraftChange,
  onSubmitDraft,
}: InstructionsPopupProps) => {
  const { theme } = useTheme()

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      {...inkBorderColorProps(theme.border)}
    >
      <Text {...inkColorProps(theme.accent)}>Meta Instructions</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text {...inkColorProps(theme.mutedText)}>
          Add optional guidance (blank clears; Enter applies)
        </Text>
        <SingleLineTextInput
          value={draft}
          onChange={onDraftChange}
          onSubmit={() => onSubmitDraft(draft)}
          placeholder="Be concise and focus on security"
          focus
        />
      </Box>
      <Box marginTop={1}>
        <Text {...inkColorProps(theme.mutedText)}>Esc closes · Enter saves</Text>
      </Box>
    </Box>
  )
}
