import React, { useEffect, useMemo, useState } from 'react'
import { Box, Text, useInput, useStdout } from 'ink'

import { COMMAND_DESCRIPTORS } from '../../config'
import { createHelpSections, estimateHelpOverlayHeight } from '../../help-config'
import {
  clampHelpOverlayScrollOffset,
  getHelpOverlayContentRows,
  getHelpOverlayMaxScroll,
  scrollHelpOverlayBy,
} from './help-overlay-scroll'

import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'

const APP_CONTAINER_PADDING_X = 2

const padRight = (value: string, width: number): string => {
  if (width <= 0) {
    return ''
  }

  const trimmed = value.length > width ? value.slice(0, width) : value
  return trimmed.length === width ? trimmed : trimmed.padEnd(width, ' ')
}

const padLeft = (value: string, width: number): string => {
  if (width <= 0) {
    return ''
  }

  const trimmed = value.length > width ? value.slice(0, width) : value
  return trimmed.length === width ? trimmed : trimmed.padStart(width, ' ')
}

export type HelpOverlayProps = {
  activeView: 'generate' | 'tests'
  maxHeight?: number
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ activeView: _activeView, maxHeight }) => {
  const { theme } = useTheme()
  const { stdout } = useStdout()

  const terminalColumns = stdout?.columns ?? 80
  const overlayWidth = Math.max(40, terminalColumns - 2 * APP_CONTAINER_PADDING_X)

  const borderColumns = 2
  const paddingColumns = 2
  const contentWidth = Math.max(0, overlayWidth - borderColumns - paddingColumns)

  const backgroundProps = inkBackgroundColorProps(theme.popupBackground)

  const sections = useMemo(
    () => createHelpSections({ commandDescriptors: COMMAND_DESCRIPTORS }),
    [],
  )

  const idealHeight = estimateHelpOverlayHeight(sections)
  const clampedHeight = maxHeight ? Math.min(idealHeight, maxHeight) : idealHeight
  const height = Math.max(10, clampedHeight)

  const contentLines = useMemo(() => {
    const lines: string[] = []
    for (const section of sections) {
      lines.push(section.title)
      lines.push(...section.lines)
      lines.push('')
    }
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop()
    }
    return lines
  }, [sections])

  const contentRows = getHelpOverlayContentRows(height)
  const maxScroll = getHelpOverlayMaxScroll(contentLines.length, contentRows)
  const [scrollOffset, setScrollOffset] = useState(0)

  useEffect(() => {
    setScrollOffset((prev) => clampHelpOverlayScrollOffset(prev, contentLines.length, contentRows))
  }, [contentLines.length, contentRows])

  useInput((_, key) => {
    if (key.upArrow) {
      setScrollOffset((prev) => scrollHelpOverlayBy(prev, -1, contentLines.length, contentRows))
      return
    }
    if (key.downArrow) {
      setScrollOffset((prev) => scrollHelpOverlayBy(prev, 1, contentLines.length, contentRows))
      return
    }
    if (key.pageUp) {
      setScrollOffset((prev) =>
        scrollHelpOverlayBy(prev, -contentRows, contentLines.length, contentRows),
      )
      return
    }
    if (key.pageDown) {
      setScrollOffset((prev) =>
        scrollHelpOverlayBy(prev, contentRows, contentLines.length, contentRows),
      )
    }
  })

  const sectionTitles = useMemo(() => new Set(sections.map((section) => section.title)), [sections])

  const clampedOffset = clampHelpOverlayScrollOffset(scrollOffset, contentLines.length, contentRows)

  const visibleLines = useMemo(() => {
    const slice = contentLines.slice(clampedOffset, clampedOffset + contentRows)
    if (slice.length >= contentRows) {
      return slice
    }

    const padded = [...slice]
    while (padded.length < contentRows) {
      padded.push('')
    }

    return padded
  }, [clampedOffset, contentLines, contentRows])

  const showScrollHint = maxScroll > 0
  const scrollLabel = showScrollHint
    ? `↑/↓ scroll (${clampedOffset + 1}-${Math.min(clampedOffset + contentRows, contentLines.length)}/${contentLines.length})`
    : ''

  const headerLeft = 'Help'
  const headerRight = 'Esc / ? to close'
  const headerGap = Math.max(0, contentWidth - headerLeft.length - headerRight.length)

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      height={height}
      width={overlayWidth}
      overflow="hidden"
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

      <Box flexDirection="column" marginTop={1} height={contentRows} overflow="hidden">
        {visibleLines.map((line, index) => {
          const isSectionTitle = sectionTitles.has(line)
          const color = isSectionTitle ? theme.accent : theme.mutedText
          return (
            <Text key={`${scrollOffset}-${index}`} {...backgroundProps} {...inkColorProps(color)}>
              {padRight(line, contentWidth)}
            </Text>
          )
        })}
      </Box>

      <Box flexDirection="row">
        <Text {...backgroundProps} {...inkColorProps(theme.mutedText)}>
          {padLeft(scrollLabel, contentWidth)}
        </Text>
      </Box>
    </Box>
  )
}
