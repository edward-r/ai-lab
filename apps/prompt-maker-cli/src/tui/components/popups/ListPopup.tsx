import React from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'

const MAX_VISIBLE_LIST_ITEMS = 6

export type ListPopupProps = {
  title: string
  placeholder: string
  draft: string
  items: readonly string[]
  selectedIndex: number
  emptyLabel: string
  instructions: string
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
  onDraftChange,
  onSubmitDraft,
}) => {
  const upperBound = Math.max(items.length - MAX_VISIBLE_LIST_ITEMS, 0)
  const start = Math.max(0, Math.min(selectedIndex - 2, upperBound))
  const visibleItems = items.slice(start, start + MAX_VISIBLE_LIST_ITEMS)

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
            {start + MAX_VISIBLE_LIST_ITEMS < items.length ? (
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
