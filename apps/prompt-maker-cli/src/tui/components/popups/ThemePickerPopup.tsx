import { useMemo } from 'react'
import { Box, Text, useStdout } from 'ink'

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

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max))

const padRight = (value: string, width: number): string => {
  if (width <= 0) {
    return ''
  }

  const trimmed = value.length > width ? value.slice(0, width) : value
  if (trimmed.length === width) {
    return trimmed
  }

  return `${trimmed}${' '.repeat(width - trimmed.length)}`
}

export const ThemePickerPopup = ({
  selectionIndex,
  initialThemeName,
  maxHeight,
}: ThemePickerPopupProps) => {
  const { theme, themes, activeThemeName, error } = useTheme()
  const { stdout } = useStdout()

  const terminalColumns = stdout?.columns ?? 80

  // Keep the popup reasonably sized and deterministic.
  const popupWidth = clamp(terminalColumns - 10, 40, 72)
  const contentWidth = Math.max(10, popupWidth - 2)

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

  const selectedTextProps = {
    ...inkColorProps(theme.selectionText),
    ...inkBackgroundColorProps(theme.selectionBackground),
  }

  const backgroundProps = inkBackgroundColorProps(theme.popupBackground)

  const renderFill = (width: number): string => (width > 0 ? ' '.repeat(width) : '')

  const headerLeft = 'Theme'
  const headerRight = 'esc'
  const headerGap = Math.max(0, contentWidth - headerLeft.length - headerRight.length)

  const currentLabel = `Current: ${initialLabel}`

  const listLines = useMemo((): Array<{ key: string; label: string; isSelected: boolean }> => {
    const lines: Array<{ key: string; label: string; isSelected: boolean }> = []

    if (names.length === 0) {
      lines.push({
        key: 'empty',
        label: padRight('No themes loaded.', contentWidth),
        isSelected: false,
      })
      while (lines.length < listRows) {
        lines.push({
          key: `pad-${lines.length}`,
          label: padRight('', contentWidth),
          isSelected: false,
        })
      }
      return lines
    }

    if (window.showBefore) {
      lines.push({ key: 'before', label: '… earlier …', isSelected: false })
    }

    for (let offset = 0; offset < window.end - window.start; offset += 1) {
      const name = names[window.start + offset]
      if (!name) {
        continue
      }
      const label = labelsByName.get(name) ?? name
      const isActive = name === activeThemeName
      const line = `${isActive ? '●' : ' '} ${label}`
      const isSelected = window.start + offset === clampedSelection
      lines.push({ key: name, label: line, isSelected })
    }

    if (window.showAfter) {
      lines.push({ key: 'after', label: '… later …', isSelected: false })
    }

    while (lines.length < listRows) {
      lines.push({ key: `pad-${lines.length}`, label: '', isSelected: false })
    }

    return lines.map((line) => ({ ...line, label: padRight(line.label, contentWidth) }))
  }, [activeThemeName, clampedSelection, contentWidth, labelsByName, listRows, names, window])

  const footer = '↑/↓ preview · Enter confirm · Esc cancel'

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={0}
      paddingY={0}
      width={popupWidth}
      {...inkBorderColorProps(theme.border)}
    >
      <Box flexDirection="row">
        <Text {...backgroundProps} {...inkColorProps(theme.accent)}>
          {headerLeft}
        </Text>
        <Text {...backgroundProps}>{renderFill(headerGap)}</Text>
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {headerRight}
        </Text>
      </Box>

      <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
        {padRight(currentLabel, contentWidth)}
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {listLines.map((line) => (
          <Text
            key={line.key}
            {...(line.isSelected
              ? selectedTextProps
              : { ...backgroundProps, ...inkColorProps(theme.text) })}
          >
            {line.label}
          </Text>
        ))}
      </Box>

      {error ? (
        <Text {...backgroundProps} {...inkColorProps(theme.error)}>
          {padRight(error.message, contentWidth)}
        </Text>
      ) : null}

      <Box marginTop={1}>
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {padRight(footer, contentWidth)}
        </Text>
      </Box>
    </Box>
  )
}
