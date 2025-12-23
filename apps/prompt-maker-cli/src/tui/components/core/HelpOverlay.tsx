import React, { useEffect, useMemo, useState } from 'react'
import { Box, Text, useInput } from 'ink'

import { COMMAND_DESCRIPTORS } from '../../config'
import { createHelpSections, estimateHelpOverlayHeight } from '../../help-config'
import {
  clampHelpOverlayScrollOffset,
  getHelpOverlayContentRows,
  getHelpOverlayMaxScroll,
  scrollHelpOverlayBy,
} from './help-overlay-scroll'

import { useTheme } from '../../theme/theme-provider'
import { inkBorderColorProps, inkColorProps } from '../../theme/theme-types'

export type HelpOverlayProps = {
  activeView: 'generate' | 'tests'
  maxHeight?: number
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ activeView: _activeView, maxHeight }) => {
  const { theme } = useTheme()

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

  const clampedOffset = clampHelpOverlayScrollOffset(scrollOffset, contentLines.length, contentRows)

  const visibleLines = useMemo(
    () => contentLines.slice(clampedOffset, clampedOffset + contentRows),
    [clampedOffset, contentLines, contentRows],
  )

  const showScrollHint = maxScroll > 0
  const scrollLabel = showScrollHint
    ? `↑/↓ scroll (${clampedOffset + 1}-${Math.min(clampedOffset + contentRows, contentLines.length)}/${contentLines.length})`
    : ''

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      height={height}
      overflow="hidden"
      {...inkBorderColorProps(theme.border)}
    >
      <Box justifyContent="space-between">
        <Text {...inkColorProps(theme.accent)}>Help</Text>
        <Text {...inkColorProps(theme.mutedText)}>Esc / ? to close</Text>
      </Box>

      <Box flexDirection="column" marginTop={1} height={contentRows} overflow="hidden">
        {visibleLines.map((line, index) => {
          const isSectionTitle = sections.some((section) => section.title === line)
          const color = isSectionTitle ? theme.accent : theme.mutedText
          return (
            <Text key={`${scrollOffset}-${index}`} {...inkColorProps(color)}>
              {line}
            </Text>
          )
        })}
      </Box>

      <Box justifyContent="flex-end">
        <Text {...inkColorProps(theme.mutedText)}>{scrollLabel}</Text>
      </Box>
    </Box>
  )
}
