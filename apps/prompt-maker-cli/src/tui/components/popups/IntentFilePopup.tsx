import { useMemo } from 'react'
import { Box, Text } from 'ink'

import { SingleLineTextInput } from '../core/SingleLineTextInput'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'
import { resolveWindowedList } from './list-window'

export type IntentFilePopupProps = {
  draft: string
  suggestions: readonly string[]
  suggestedSelectionIndex: number
  suggestedFocused: boolean
  maxHeight?: number
  onDraftChange: (value: string) => void
  onSubmitDraft: (value: string) => void
}

type VisibleSuggestions = {
  start: number
  values: readonly string[]
  showBefore: boolean
  showAfter: boolean
}

const resolveSuggestionWindow = (
  suggestions: readonly string[],
  selectedIndex: number,
  maxRows: number,
): VisibleSuggestions => {
  if (suggestions.length === 0 || maxRows <= 0) {
    return { start: 0, values: [], showBefore: false, showAfter: false }
  }

  const window = resolveWindowedList({
    itemCount: suggestions.length,
    selectedIndex,
    maxVisibleRows: maxRows,
    lead: 1,
  })

  return {
    start: window.start,
    values: suggestions.slice(window.start, window.end),
    showBefore: window.showBefore,
    showAfter: window.showAfter,
  }
}

export const IntentFilePopup = ({
  draft,
  suggestions,
  suggestedSelectionIndex,
  suggestedFocused,
  maxHeight,
  onDraftChange,
  onSubmitDraft,
}: IntentFilePopupProps) => {
  const { theme } = useTheme()

  const resolvedHeight = maxHeight ?? 9

  const suggestionRows = useMemo(() => {
    const borderRows = 2
    const contentRows = Math.max(1, resolvedHeight - borderRows)
    const fixedRows = 3
    return Math.max(0, contentRows - fixedRows)
  }, [resolvedHeight])

  const hasSuggestions = suggestions.length > 0

  const safeSuggestedSelection = Math.max(
    0,
    Math.min(suggestedSelectionIndex, Math.max(suggestions.length - 1, 0)),
  )

  const effectiveSuggestedFocused = hasSuggestions && suggestedFocused

  const visibleSuggestions = useMemo(
    () => resolveSuggestionWindow(suggestions, safeSuggestedSelection, suggestionRows),
    [safeSuggestedSelection, suggestions, suggestionRows],
  )

  const focusedSelectionProps = {
    ...inkColorProps(theme.selectionText),
    ...inkBackgroundColorProps(theme.selectionBackground),
  }

  const unfocusedSelectionProps = {
    ...inkColorProps(theme.chipText),
    ...inkBackgroundColorProps(theme.chipBackground),
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      {...inkBorderColorProps(theme.border)}
      {...inkBackgroundColorProps(theme.popupBackground)}
      {...(typeof maxHeight === 'number' ? { height: maxHeight } : {})}
      overflow="hidden"
    >
      <Text {...inkColorProps(theme.accent)}>Intent File</Text>

      <Box flexDirection="row">
        <Text {...inkColorProps(theme.mutedText)}>Path: </Text>
        <SingleLineTextInput
          value={draft}
          onChange={onDraftChange}
          onSubmit={() => onSubmitDraft(draft)}
          placeholder="prompts/intent.md"
          focus={!effectiveSuggestedFocused}
        />
      </Box>

      {suggestionRows > 0 ? (
        <Box flexDirection="column" height={suggestionRows} flexShrink={0} overflow="hidden">
          {hasSuggestions ? (
            <>
              {visibleSuggestions.showBefore ? (
                <Text {...inkColorProps(theme.mutedText)}>… earlier …</Text>
              ) : null}
              {visibleSuggestions.values.map((value: string, index: number) => {
                const actualIndex = visibleSuggestions.start + index
                const isSelected = actualIndex === safeSuggestedSelection
                const textProps = isSelected
                  ? effectiveSuggestedFocused
                    ? focusedSelectionProps
                    : unfocusedSelectionProps
                  : inkColorProps(theme.text)

                return (
                  <Text key={`${value}-${actualIndex}`} {...textProps}>
                    {value}
                  </Text>
                )
              })}
              {visibleSuggestions.showAfter ? (
                <Text {...inkColorProps(theme.mutedText)}>… later …</Text>
              ) : null}
            </>
          ) : (
            <Text {...inkColorProps(theme.mutedText)}>(type to search)</Text>
          )}
        </Box>
      ) : null}

      <Box flexShrink={0}>
        <Text {...inkColorProps(theme.mutedText)}>
          Tab suggestions · ↑/↓ select · Enter apply · Esc close
        </Text>
      </Box>
    </Box>
  )
}
