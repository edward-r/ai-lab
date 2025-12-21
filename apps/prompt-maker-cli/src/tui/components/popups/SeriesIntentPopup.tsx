import React from 'react'
import { Box, Text } from 'ink'

import { SingleLineTextInput } from '../core/SingleLineTextInput'

export type SeriesIntentPopupProps = {
  draft: string
  hint?: string | undefined
  isRunning: boolean
  onDraftChange: (value: string) => void
  onSubmitDraft: (value: string) => void
}

export const SeriesIntentPopup: React.FC<SeriesIntentPopupProps> = ({
  draft,
  hint,
  isRunning,
  onDraftChange,
  onSubmitDraft,
}) => (
  <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
    <Text color="cyanBright">Series Intent</Text>
    <Box flexDirection="column" marginTop={1}>
      {hint ? (
        <>
          <Text color="gray">{hint}</Text>
          <Text color="gray">Draft may come from typed text, last run, or the intent file.</Text>
        </>
      ) : (
        <Text color="gray">Draft may come from typed text, last run, or the intent file.</Text>
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
      <Text color="gray">
        {isRunning ? 'Series run in progress… please wait' : 'Enter runs series · Esc closes'}
      </Text>
    </Box>
  </Box>
)
