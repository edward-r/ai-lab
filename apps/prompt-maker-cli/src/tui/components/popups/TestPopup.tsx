import { Box, Text } from 'ink'

import { SingleLineTextInput } from '../core/SingleLineTextInput'
import { useTheme } from '../../theme/theme-provider'
import { inkBorderColorProps, inkColorProps } from '../../theme/theme-types'

export type TestPopupProps = {
  draft: string
  isRunning: boolean
  onDraftChange: (value: string) => void
  onSubmitDraft: (value: string) => void
}

export const TestPopup = ({ draft, isRunning, onDraftChange, onSubmitDraft }: TestPopupProps) => {
  const { theme } = useTheme()

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      {...inkBorderColorProps(theme.border)}
    >
      <Text {...inkColorProps(theme.accent)}>Prompt Tests</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text {...inkColorProps(theme.mutedText)}>
          Suite path (Enter to run; blank uses prompt-tests.yaml)
        </Text>
        <SingleLineTextInput
          value={draft}
          onChange={onDraftChange}
          onSubmit={() => onSubmitDraft(draft)}
          placeholder="prompt-tests.yaml"
          focus
        />
      </Box>
      <Box marginTop={1}>
        <Text {...inkColorProps(theme.mutedText)}>
          {isRunning ? 'Tests running… please wait' : 'Enter to start tests · Esc to close'}
        </Text>
      </Box>
    </Box>
  )
}
