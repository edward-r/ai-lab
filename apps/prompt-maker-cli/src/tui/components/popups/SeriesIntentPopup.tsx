import { Box, Text } from 'ink'

import { SingleLineTextInput } from '../core/SingleLineTextInput'
import { useTheme } from '../../theme/theme-provider'
import { inkBorderColorProps, inkColorProps } from '../../theme/theme-types'

export type SeriesIntentPopupProps = {
  draft: string
  hint?: string | undefined
  isRunning: boolean
  onDraftChange: (value: string) => void
  onSubmitDraft: (value: string) => void
}

export const SeriesIntentPopup = ({
  draft,
  hint,
  isRunning,
  onDraftChange,
  onSubmitDraft,
}: SeriesIntentPopupProps) => {
  const { theme } = useTheme()

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      {...inkBorderColorProps(theme.border)}
    >
      <Text {...inkColorProps(theme.accent)}>Series Intent</Text>
      <Box flexDirection="column" marginTop={1}>
        {hint ? (
          <>
            <Text {...inkColorProps(theme.mutedText)}>{hint}</Text>
            <Text {...inkColorProps(theme.mutedText)}>
              Draft may come from typed text, last run, or the intent file.
            </Text>
          </>
        ) : (
          <Text {...inkColorProps(theme.mutedText)}>
            Draft may come from typed text, last run, or the intent file.
          </Text>
        )}
        <SingleLineTextInput
          value={draft}
          onChange={onDraftChange}
          onSubmit={() => onSubmitDraft(draft)}
          placeholder="Describe the project to plan"
          focus
        />
      </Box>
      <Box marginTop={1}>
        <Text {...inkColorProps(theme.mutedText)}>
          {isRunning ? 'Series run in progress… please wait' : 'Enter runs series · Esc closes'}
        </Text>
      </Box>
    </Box>
  )
}
