import { useMemo } from 'react'
import { Box, Text } from 'ink'

import { SingleLineTextInput } from '../core/SingleLineTextInput'

import { MODEL_PROVIDER_LABELS } from '../../../model-providers'
import { resolveWindowedList } from './list-window'
import type { ModelOption, ProviderStatusMap } from '../../types'

export type ModelPopupProps = {
  query: string
  options: readonly ModelOption[]
  selectedIndex: number
  recentCount: number
  maxHeight?: number
  providerStatuses: ProviderStatusMap
  onQueryChange: (value: string) => void
  onSubmit: (option?: ModelOption) => void
}

type ModelRow =
  | { type: 'header'; title: string }
  | { type: 'spacer' }
  | { type: 'option'; option: ModelOption; optionIndex: number }

const resolveListRows = (maxHeight: number | undefined): number => {
  const fallbackHeight = 16
  const resolvedHeight = maxHeight ?? fallbackHeight
  const borderRows = 2
  const contentHeight = Math.max(1, resolvedHeight - borderRows)

  const fixedRows = 3
  return Math.max(1, contentHeight - fixedRows)
}

const resolveOptionColor = (option: ModelOption, providerStatuses: ProviderStatusMap): string => {
  const status = providerStatuses[option.provider]?.status
  if (status === 'missing') {
    return 'yellow'
  }
  if (status === 'error') {
    return 'red'
  }
  return 'white'
}

const buildRows = (options: readonly ModelOption[], recentCount: number): ModelRow[] => {
  if (options.length === 0) {
    return []
  }

  const rows: ModelRow[] = []

  const safeRecentCount = Math.max(0, Math.min(recentCount, options.length))
  if (safeRecentCount > 0) {
    rows.push({ type: 'header', title: 'Recent' })
    for (let index = 0; index < safeRecentCount; index += 1) {
      const option = options[index]
      if (!option) {
        continue
      }
      rows.push({ type: 'option', option, optionIndex: index })
    }
    if (safeRecentCount < options.length) {
      rows.push({ type: 'spacer' })
    }
  }

  let lastProvider: string | null = null
  for (let index = safeRecentCount; index < options.length; index += 1) {
    const option = options[index]
    if (!option) {
      continue
    }

    const providerLabel = MODEL_PROVIDER_LABELS[option.provider]
    if (providerLabel !== lastProvider) {
      rows.push({ type: 'header', title: providerLabel })
      lastProvider = providerLabel
    }

    rows.push({ type: 'option', option, optionIndex: index })
  }

  return rows
}

const ensureHeaderVisible = (
  rows: readonly ModelRow[],
  start: number,
  end: number,
  maxRows: number,
): { start: number; end: number } => {
  if (start <= 0 || end - start >= maxRows) {
    return { start, end }
  }

  const first = rows[start]
  const previous = rows[start - 1]
  if (first?.type === 'option' && previous?.type === 'header') {
    const nextStart = start - 1
    const nextEnd = Math.min(rows.length, nextStart + maxRows)
    return { start: nextStart, end: nextEnd }
  }

  return { start, end }
}

export const ModelPopup: React.FC<ModelPopupProps> = ({
  query,
  options,
  selectedIndex,
  recentCount,
  maxHeight,
  providerStatuses,
  onQueryChange,
  onSubmit,
}) => {
  const selectedOption = options[selectedIndex]
  const listRows = useMemo(() => resolveListRows(maxHeight), [maxHeight])

  const rows = useMemo(() => buildRows(options, recentCount), [options, recentCount])

  const selectedRowIndex = useMemo(() => {
    if (rows.length === 0) {
      return 0
    }

    const index = rows.findIndex(
      (row) => row.type === 'option' && row.optionIndex === selectedIndex,
    )
    return index >= 0 ? index : 0
  }, [rows, selectedIndex])

  const window = useMemo(
    () =>
      resolveWindowedList({
        itemCount: rows.length,
        selectedIndex: selectedRowIndex,
        maxVisibleRows: listRows,
        lead: 2,
      }),
    [listRows, rows.length, selectedRowIndex],
  )

  const slice = useMemo(
    () => ensureHeaderVisible(rows, window.start, window.end, listRows),
    [listRows, rows, window.end, window.start],
  )

  const visibleRows = rows.slice(slice.start, slice.end)

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color="cyanBright">Select model</Text>
        <Text color="gray">esc</Text>
      </Box>

      <Box marginTop={1}>
        <SingleLineTextInput
          value={query}
          onChange={onQueryChange}
          onSubmit={() => onSubmit(selectedOption)}
          placeholder="Search"
          focus
        />
      </Box>

      <Box flexDirection="column" marginTop={1} height={listRows} overflow="hidden">
        {rows.length === 0 ? (
          <Text color="gray">No models match.</Text>
        ) : (
          visibleRows.map((row, rowIndex) => {
            if (row.type === 'spacer') {
              return <Text key={`spacer-${slice.start + rowIndex}`}> </Text>
            }

            if (row.type === 'header') {
              return (
                <Text key={`header-${row.title}-${slice.start + rowIndex}`} color="magenta">
                  {row.title}
                </Text>
              )
            }

            const isSelected = row.optionIndex === selectedIndex
            const providerLabel = MODEL_PROVIDER_LABELS[row.option.provider]

            const textColor = resolveOptionColor(row.option, providerStatuses)
            const rowTextProps = isSelected
              ? ({ color: 'black', backgroundColor: 'blueBright' } as const)
              : ({ color: textColor } as const)

            const providerTextProps = isSelected
              ? ({ color: 'black' } as const)
              : ({ color: 'gray' } as const)

            return (
              <Box
                key={`option-${row.option.id}`}
                flexDirection="row"
                justifyContent="space-between"
                width="100%"
              >
                <Text {...rowTextProps}>{row.option.label}</Text>
                <Text {...providerTextProps}>{providerLabel}</Text>
              </Box>
            )
          })
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Enter to select</Text>
      </Box>
    </Box>
  )
}
