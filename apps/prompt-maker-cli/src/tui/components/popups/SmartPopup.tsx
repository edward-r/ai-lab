import React, { useMemo } from 'react'
import { Box, Text } from 'ink'

import { SingleLineTextInput } from '../core/SingleLineTextInput'
import { resolveWindowedList } from './list-window'

export type SmartPopupProps = {
  enabled: boolean
  savedRoot: string | null
  draft: string
  suggestedItems: readonly string[]
  suggestedSelectionIndex: number
  suggestedFocused: boolean
  maxHeight?: number
  onDraftChange: (value: string) => void
  onSubmitRoot: (value: string) => void
}

type SuggestionWindow = {
  start: number
  values: readonly string[]
  showBefore: boolean
  showAfter: boolean
}

const resolveSuggestionWindow = (
  suggestions: readonly string[],
  selectedIndex: number,
  maxRows: number,
): SuggestionWindow => {
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

export const SmartPopup: React.FC<SmartPopupProps> = ({
  enabled,
  savedRoot,
  draft,
  suggestedItems,
  suggestedSelectionIndex,
  suggestedFocused,
  maxHeight,
  onDraftChange,
  onSubmitRoot,
}) => {
  const hasSuggestions = suggestedItems.length > 0
  const safeSuggestedSelection = Math.max(
    0,
    Math.min(suggestedSelectionIndex, Math.max(suggestedItems.length - 1, 0)),
  )
  const effectiveSuggestedFocused = hasSuggestions && suggestedFocused

  const suggestionRows = useMemo(() => {
    const borderRows = 2
    const resolvedHeight = maxHeight ?? 9
    const contentRows = Math.max(1, resolvedHeight - borderRows)

    const fixedRows = 5
    return Math.max(0, contentRows - fixedRows)
  }, [maxHeight])

  const visibleSuggestions = useMemo(
    () => resolveSuggestionWindow(suggestedItems, safeSuggestedSelection, suggestionRows),
    [safeSuggestedSelection, suggestedItems, suggestionRows],
  )

  const savedLabel = savedRoot ? savedRoot : '(none)'

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="green"
      paddingX={1}
      paddingY={0}
      {...(typeof maxHeight === 'number' ? { height: maxHeight } : {})}
      overflow="hidden"
    >
      <Text color="greenBright">Smart Context</Text>
      <Text color="white">
        Status: {enabled ? 'enabled' : 'disabled'} · Ctrl+T toggle · Tab suggestions · Esc close
      </Text>

      <Box flexDirection="row">
        <Text color="gray">Root: </Text>
        <SingleLineTextInput
          value={draft}
          onChange={onDraftChange}
          onSubmit={onSubmitRoot}
          placeholder="relative/dir"
          focus={!effectiveSuggestedFocused}
        />
      </Box>

      <Text color="gray">Saved root: {savedLabel}</Text>

      <Text color="gray">Suggestions</Text>

      {suggestionRows > 0 ? (
        <Box flexDirection="column" height={suggestionRows} flexShrink={0} overflow="hidden">
          {hasSuggestions ? (
            <>
              {visibleSuggestions.showBefore ? <Text color="gray">… earlier …</Text> : null}
              {visibleSuggestions.values.map((value, index) => {
                const actualIndex = visibleSuggestions.start + index
                const isSelected = actualIndex === safeSuggestedSelection
                const textProps = isSelected
                  ? effectiveSuggestedFocused
                    ? ({ color: 'black', backgroundColor: 'cyanBright' } as const)
                    : ({ color: 'black', backgroundColor: 'gray' } as const)
                  : ({ color: 'white' } as const)

                return (
                  <Text key={`${value}-${actualIndex}`} {...textProps}>
                    {value}
                  </Text>
                )
              })}
              {visibleSuggestions.showAfter ? <Text color="gray">… later …</Text> : null}
            </>
          ) : (
            <Text color="gray">(type to filter)</Text>
          )}
        </Box>
      ) : null}
    </Box>
  )
}
