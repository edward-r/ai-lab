import { Box, Text } from 'ink'
import { useMemo } from 'react'

import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'
import { resolveWindowedList } from './list-window'

export type ThemePickerPopupProps = {
  selectionIndex: number
  initialThemeName: string
  maxHeight?: number
}

const resolveListRows = (maxHeight: number | undefined, hasError: boolean): number => {
  const fallbackHeight = 16
  const resolvedHeight = maxHeight ?? fallbackHeight
  const borderRows = 2
  const contentHeight = Math.max(1, resolvedHeight - borderRows)

  const fixedRows = 4 + (hasError ? 1 : 0)
  return Math.max(1, contentHeight - fixedRows)
}

export const ThemePickerPopup = ({
  selectionIndex,
  initialThemeName,
  maxHeight,
}: ThemePickerPopupProps) => {
  const { theme, themes, activeThemeName, error } = useTheme()

  const listRows = useMemo(() => resolveListRows(maxHeight, Boolean(error)), [error, maxHeight])

  const names = useMemo(() => themes.map((descriptor) => descriptor.name), [themes])
  const labelsByName = useMemo(() => {
    const entries = themes.map((descriptor) => [descriptor.name, descriptor.label] as const)
    return new Map(entries)
  }, [themes])

  const initialLabel = labelsByName.get(initialThemeName) ?? initialThemeName

  const clampedSelection = Math.min(selectionIndex, Math.max(names.length - 1, 0))

  const window = useMemo(
    () =>
      resolveWindowedList({
        itemCount: names.length,
        selectedIndex: clampedSelection,
        maxVisibleRows: listRows,
        lead: 2,
      }),
    [clampedSelection, listRows, names.length],
  )

  const visibleNames = names.slice(window.start, window.end)

  const selectedTextProps = {
    ...inkColorProps(theme.selectionText),
    ...inkBackgroundColorProps(theme.selectionBackground),
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      {...inkBorderColorProps(theme.border)}
      {...(typeof maxHeight === 'number' ? { height: maxHeight } : {})}
      overflow="hidden"
    >
      <Box flexDirection="row" justifyContent="space-between">
        <Text {...inkColorProps(theme.accent)}>Theme</Text>
        <Text {...inkColorProps(theme.mutedText)}>esc</Text>
      </Box>

      <Text {...inkColorProps(theme.mutedText)}>Current: {initialLabel}</Text>

      <Box flexDirection="column" marginTop={1} height={listRows} overflow="hidden">
        {names.length === 0 ? (
          <Text {...inkColorProps(theme.mutedText)}>No themes loaded.</Text>
        ) : (
          <>
            {window.showBefore ? (
              <Text {...inkColorProps(theme.mutedText)}>… earlier …</Text>
            ) : null}
            {visibleNames.map((name, offset) => {
              const index = window.start + offset
              const label = labelsByName.get(name) ?? name
              const isSelected = index === clampedSelection
              const isActive = name === activeThemeName

              const line = `${isActive ? '●' : ' '} ${label}`

              return (
                <Text key={name} {...(isSelected ? selectedTextProps : inkColorProps(theme.text))}>
                  {line}
                </Text>
              )
            })}
            {window.showAfter ? <Text {...inkColorProps(theme.mutedText)}>… later …</Text> : null}
          </>
        )}
      </Box>

      {error ? <Text {...inkColorProps(theme.error)}>{error.message}</Text> : null}

      <Box marginTop={1}>
        <Text {...inkColorProps(theme.mutedText)}>↑/↓ preview · Enter confirm · Esc cancel</Text>
      </Box>
    </Box>
  )
}
