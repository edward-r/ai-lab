import React, { useMemo } from 'react'
import { Box, Text } from 'ink'

import { SingleLineTextInput } from '../core/SingleLineTextInput'
import { resolveListPopupHeights, DEFAULT_MAX_VISIBLE_LIST_ITEMS } from './list-popup-layout'
import { resolveWindowedList } from './list-window'

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
  maxHeight?: number
  onDraftChange: (value: string) => void
  onSubmitDraft: (value: string) => void
}

const resolveSelectedVisible = (
  items: readonly string[],
  selectedIndex: number,
  maxRows: number,
): { start: number; values: readonly string[]; showBefore: boolean; showAfter: boolean } => {
  if (items.length === 0) {
    return { start: 0, values: [], showBefore: false, showAfter: false }
  }

  const window = resolveWindowedList({
    itemCount: items.length,
    selectedIndex,
    maxVisibleRows: maxRows,
    lead: 2,
  })

  return {
    start: window.start,
    values: items.slice(window.start, window.end),
    showBefore: window.showBefore,
    showAfter: window.showAfter,
  }
}

const resolveSuggestedVisible = (
  suggestions: readonly string[],
  selectedIndex: number,
  maxRows: number,
): { start: number; values: readonly string[]; showBefore: boolean; showAfter: boolean } => {
  if (suggestions.length === 0) {
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
  maxHeight,
  onDraftChange,
  onSubmitDraft,
}) => {
  const hasSuggestions = (suggestedItems?.length ?? 0) > 0

  const safeSuggestedSelection = Math.max(
    0,
    Math.min(suggestedSelectionIndex ?? 0, Math.max((suggestedItems?.length ?? 0) - 1, 0)),
  )
  const effectiveSuggestedFocused = Boolean(hasSuggestions && suggestedFocused)

  if (!hasSuggestions) {
    const upperBound = Math.max(items.length - DEFAULT_MAX_VISIBLE_LIST_ITEMS, 0)
    const start = Math.max(0, Math.min(selectedIndex - 2, upperBound))
    const visibleItems = items.slice(start, start + DEFAULT_MAX_VISIBLE_LIST_ITEMS)

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="blue" paddingX={1} paddingY={0}>
        <Text color="blueBright">{title}</Text>
        <Box flexDirection="column" marginTop={1}>
          <Text color="gray">Add new</Text>
          <SingleLineTextInput
            value={draft}
            onChange={onDraftChange}
            placeholder={placeholder}
            onSubmit={() => onSubmitDraft(draft)}
            focus
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
              {start + DEFAULT_MAX_VISIBLE_LIST_ITEMS < items.length ? (
                <Text color="gray">… later entries …</Text>
              ) : null}
            </>
          )}
        </Box>

        <Box marginTop={1}>
          <Text color="gray">{instructions}</Text>
        </Box>
      </Box>
    )
  }

  const heights = useMemo(
    () => resolveListPopupHeights({ maxHeight, hasSuggestions: true }),
    [maxHeight],
  )

  const selectedVisible = useMemo(
    () => resolveSelectedVisible(items, selectedIndex, heights.selectedRows),
    [heights.selectedRows, items, selectedIndex],
  )

  const suggestionRows = heights.suggestionRows
  const suggestedVisible = useMemo(
    () =>
      suggestionRows > 0
        ? resolveSuggestedVisible(suggestedItems ?? [], safeSuggestedSelection, suggestionRows)
        : { start: 0, values: [], showBefore: false, showAfter: false },
    [safeSuggestedSelection, suggestedItems, suggestionRows],
  )

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="blue"
      paddingX={1}
      paddingY={0}
      {...(typeof maxHeight === 'number' ? { height: maxHeight } : {})}
      overflow="hidden"
    >
      <Text color="blueBright">{title}</Text>

      <Box flexDirection="row">
        <Text color="gray">Add: </Text>
        <SingleLineTextInput
          value={draft}
          onChange={onDraftChange}
          placeholder={placeholder}
          onSubmit={() => onSubmitDraft(draft)}
          focus={!effectiveSuggestedFocused}
        />
      </Box>

      <Box
        flexDirection="column"
        height={1 + heights.selectedRows}
        flexShrink={0}
        overflow="hidden"
      >
        <Text color="gray">Selected</Text>
        {items.length === 0 ? (
          <Text color="gray">{emptyLabel}</Text>
        ) : (
          <>
            {selectedVisible.showBefore ? <Text color="gray">… earlier entries …</Text> : null}
            {selectedVisible.values.map((value, index) => {
              const actualIndex = selectedVisible.start + index
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
            {selectedVisible.showAfter ? <Text color="gray">… later entries …</Text> : null}
          </>
        )}
      </Box>

      {suggestionRows > 0 ? (
        <Box flexDirection="column" height={1 + suggestionRows} flexShrink={0} overflow="hidden">
          <Text color="gray">Suggestions</Text>
          {suggestedVisible.showBefore ? <Text color="gray">… earlier suggestions …</Text> : null}
          {suggestedVisible.values.map((value, index) => {
            const actualIndex = suggestedVisible.start + index
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
          {suggestedVisible.showAfter ? <Text color="gray">… later suggestions …</Text> : null}
        </Box>
      ) : null}

      <Box flexShrink={0}>
        <Text color="gray">{instructions}</Text>
      </Box>
    </Box>
  )
}
