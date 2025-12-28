import { useMemo } from 'react'
import { Box, Text, useStdout } from 'ink'

import { SingleLineTextInput } from '../core/SingleLineTextInput'

import { MODEL_PROVIDER_LABELS } from '../../../model-providers'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'
import type { InkColorValue } from '../../theme/theme-types'
import { resolveWindowedList } from './list-window'
import type { ModelOption, ProviderStatusMap } from '../../types'

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max))

const padRight = (value: string, width: number): string => {
  if (width <= 0) {
    return ''
  }

  const trimmed = value.length > width ? value.slice(0, width) : value
  return trimmed.length === width ? trimmed : trimmed.padEnd(width, ' ')
}

const joinColumns = (left: string, right: string, width: number): string => {
  const safeWidth = Math.max(0, width)
  if (safeWidth === 0) {
    return ''
  }

  const leftTrimmed = left.length > safeWidth ? left.slice(0, safeWidth) : left
  const remaining = Math.max(0, safeWidth - leftTrimmed.length)

  const rightTrimmed = right.length > remaining ? right.slice(0, remaining) : right
  const gap = Math.max(1, safeWidth - leftTrimmed.length - rightTrimmed.length)

  return `${leftTrimmed}${' '.repeat(gap)}${rightTrimmed}`
}

export type ModelPopupProps = {
  title?: string
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

export const ModelPopup = ({
  title,
  query,
  options,
  selectedIndex,
  recentCount,
  maxHeight,
  providerStatuses,
  onQueryChange,
  onSubmit,
}: ModelPopupProps) => {
  const { theme } = useTheme()
  const { stdout } = useStdout()

  const terminalColumns = stdout?.columns ?? 80
  const popupWidth = clamp(terminalColumns - 10, 40, 72)

  const borderColumns = 2
  const paddingColumns = 2
  const contentWidth = Math.max(0, popupWidth - borderColumns - paddingColumns)

  const backgroundProps = inkBackgroundColorProps(theme.popupBackground)

  const resolveOptionColor = (option: ModelOption): InkColorValue => {
    const status = providerStatuses[option.provider]?.status
    if (status === 'missing') {
      return theme.warning
    }
    if (status === 'error') {
      return theme.error
    }
    return theme.text
  }

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

  const visibleRows = useMemo(() => {
    const base = rows.slice(slice.start, slice.end)
    if (base.length >= listRows) {
      return base
    }

    const padded: ModelRow[] = [...base]
    while (padded.length < listRows) {
      padded.push({ type: 'spacer' })
    }

    return padded
  }, [listRows, rows, slice.end, slice.start])

  const selectedTextProps = {
    ...inkColorProps(theme.selectionText),
    ...inkBackgroundColorProps(theme.selectionBackground),
  }

  const headerLeft = title ?? 'Select model'
  const headerRight = 'esc'
  const headerGap = Math.max(0, contentWidth - headerLeft.length - headerRight.length)

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
      <Box flexDirection="row">
        <Text {...backgroundProps} {...inkColorProps(theme.accent)}>
          {headerLeft}
        </Text>
        <Text {...backgroundProps}>{' '.repeat(headerGap)}</Text>
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {headerRight}
        </Text>
      </Box>

      <Box marginTop={1}>
        <SingleLineTextInput
          value={query}
          onChange={onQueryChange}
          onSubmit={() => onSubmit(selectedOption)}
          placeholder="Search"
          focus
          width={contentWidth}
          backgroundColor={theme.popupBackground}
        />
      </Box>

      <Box flexDirection="column" marginTop={1} height={listRows} overflow="hidden">
        {rows.length === 0 ? (
          <>
            <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
              {padRight('No models match.', contentWidth)}
            </Text>
            {Array.from({ length: Math.max(0, listRows - 1) }).map((_, index) => (
              <Text key={`empty-${index}`} {...backgroundProps}>
                {padRight('', contentWidth)}
              </Text>
            ))}
          </>
        ) : (
          visibleRows.map((row, rowIndex) => {
            if (row.type === 'spacer') {
              return (
                <Text key={`spacer-${slice.start + rowIndex}`} {...backgroundProps}>
                  {padRight('', contentWidth)}
                </Text>
              )
            }

            if (row.type === 'header') {
              return (
                <Text
                  key={`header-${row.title}-${slice.start + rowIndex}`}
                  {...backgroundProps}
                  {...inkColorProps(theme.accent)}
                >
                  {padRight(row.title, contentWidth)}
                </Text>
              )
            }

            const isSelected = row.optionIndex === selectedIndex
            const providerLabel = MODEL_PROVIDER_LABELS[row.option.provider]

            const rowTextProps = isSelected
              ? selectedTextProps
              : { ...backgroundProps, ...inkColorProps(resolveOptionColor(row.option)) }

            const line = joinColumns(row.option.label, providerLabel, contentWidth)

            return (
              <Text key={`option-${row.option.id}`} {...rowTextProps}>
                {padRight(line, contentWidth)}
              </Text>
            )
          })
        )}
      </Box>

      <Box marginTop={1}>
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {padRight('Enter to select', contentWidth)}
        </Text>
      </Box>
    </Box>
  )
}
