import React from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'

const MAX_VISIBLE_LIST_ITEMS = 6
const MAX_VISIBLE_SUGGESTIONS = 4

export type ListPopupProps = {
  title: string
  placeholder: string
  draft: string
  items: readonly string[]
  selectedIndex: number
  emptyLabel: string
  instructions: string
  suggestedItems?: readonly string[]
  suggestedSelectionIndex?: number
  suggestedFocused?: boolean
  onDraftChange: (value: string) => void
  onSubmitDraft: (value: string) => void
}

export const ListPopup: React.FC<ListPopupProps> = ({
  title,
  placeholder,
  draft,
  items,
  selectedIndex,
  emptyLabel,
  instructions,
  suggestedItems,
  suggestedSelectionIndex,
  suggestedFocused,
  onDraftChange,
  onSubmitDraft,
}) => {
  const upperBound = Math.max(items.length - MAX_VISIBLE_LIST_ITEMS, 0)
  const start = Math.max(0, Math.min(selectedIndex - 2, upperBound))
  const visibleItems = items.slice(start, start + MAX_VISIBLE_LIST_ITEMS)

  const hasSuggestions = (suggestedItems?.length ?? 0) > 0
  const effectiveSuggestedFocused = Boolean(hasSuggestions && suggestedFocused)
  const safeSuggestedSelection = Math.max(
    0,
    Math.min(suggestedSelectionIndex ?? 0, Math.max((suggestedItems?.length ?? 0) - 1, 0)),
  )

  const suggestionUpperBound = Math.max((suggestedItems?.length ?? 0) - MAX_VISIBLE_SUGGESTIONS, 0)
  const suggestionStart = Math.max(0, Math.min(safeSuggestedSelection - 1, suggestionUpperBound))
  const visibleSuggestions = hasSuggestions
    ? (suggestedItems?.slice(suggestionStart, suggestionStart + MAX_VISIBLE_SUGGESTIONS) ?? [])
    : []

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="blue" paddingX={1} paddingY={0}>
      <Text color="blueBright">{title}</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text color="gray">Add new</Text>
        <TextInput
          value={draft}
          onChange={onDraftChange}
          placeholder={placeholder}
          onSubmit={() => onSubmitDraft(draft)}
          focus={!effectiveSuggestedFocused}
        />
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {items.length === 0 ? (
          <Text color="gray">{emptyLabel}</Text>
        ) : (
          <>
            {start > 0 ? <Text color="gray">… earlier entries …</Text> : null}
            {visibleItems.map((value, index) => {
              const actualIndex = start + index
              const isSelected = actualIndex === selectedIndex
              const textProps = isSelected
                ? ({ color: 'black', backgroundColor: 'blueBright' } as const)
                : ({ color: 'white' } as const)
              return (
                <Text key={`${value}-${actualIndex}`} {...textProps}>
                  {actualIndex + 1}. {value}
                </Text>
              )
            })}
            {start + MAX_VISIBLE_LIST_ITEMS < items.length ? (
              <Text color="gray">… later entries …</Text>
            ) : null}
          </>
        )}
      </Box>

      {hasSuggestions ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color="gray">Suggestions</Text>
          {suggestionStart > 0 ? <Text color="gray">… earlier suggestions …</Text> : null}
          {visibleSuggestions.map((value, index) => {
            const actualIndex = suggestionStart + index
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
          {suggestionStart + MAX_VISIBLE_SUGGESTIONS < (suggestedItems?.length ?? 0) ? (
            <Text color="gray">… later suggestions …</Text>
          ) : null}
        </Box>
      ) : null}

      <Box marginTop={1}>
        <Text color="gray">{instructions}</Text>
      </Box>
    </Box>
  )
}
