import { Box, Text, useStdout } from 'ink'

import { SingleLineTextInput } from '../core/SingleLineTextInput'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max))

const padRight = (value: string, width: number): string => {
  if (width <= 0) {
    return ''
  }

  const trimmed = value.length > width ? value.slice(0, width) : value
  return trimmed.length === width ? trimmed : trimmed.padEnd(width, ' ')
}

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
  const { stdout } = useStdout()

  const terminalColumns = stdout?.columns ?? 80
  const popupWidth = clamp(terminalColumns - 10, 40, 72)

  const borderColumns = 2
  const paddingColumns = 2
  const contentWidth = Math.max(0, popupWidth - borderColumns - paddingColumns)

  const backgroundProps = inkBackgroundColorProps(theme.popupBackground)

  const hintLines = hint
    ? [hint, 'Draft may come from typed text, last run, or the intent file.']
    : ['Draft may come from typed text, last run, or the intent file.']

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      width={popupWidth}
      {...inkBorderColorProps(theme.border)}
      {...backgroundProps}
    >
      <Text {...backgroundProps} {...inkColorProps(theme.accent)}>
        {padRight('Series Intent', contentWidth)}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {hintLines.map((line) => (
          <Text key={line} {...backgroundProps} {...inkColorProps(theme.mutedText)}>
            {padRight(line, contentWidth)}
          </Text>
        ))}
        <SingleLineTextInput
          value={draft}
          onChange={onDraftChange}
          onSubmit={() => onSubmitDraft(draft)}
          placeholder="Describe the project to plan"
          focus
          width={contentWidth}
          backgroundColor={theme.popupBackground}
        />
      </Box>
      <Box marginTop={1}>
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {padRight(
            isRunning ? 'Series run in progress… please wait' : 'Enter runs series · Esc closes',
            contentWidth,
          )}
        </Text>
      </Box>
    </Box>
  )
}
