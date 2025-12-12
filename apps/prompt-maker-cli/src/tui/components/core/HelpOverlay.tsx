import React, { useMemo, useState } from 'react'
import { Box, Text, useInput } from 'ink'

import { COMMAND_DESCRIPTORS } from '../../config'
import { createHelpSections, estimateHelpOverlayHeight } from '../../help-config'

export type HelpOverlayProps = {
  activeView: 'generate' | 'tests'
  maxHeight?: number
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ activeView, maxHeight }) => {
  const sections = useMemo(
    () => createHelpSections({ commandDescriptors: COMMAND_DESCRIPTORS }),
    [],
  )

  const titleColor = activeView === 'generate' ? 'magentaBright' : 'cyanBright'
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

  const contentRows = Math.max(1, height - 4)
  const maxScroll = Math.max(0, contentLines.length - contentRows)
  const [scrollOffset, setScrollOffset] = useState(0)

  useInput((_, key) => {
    if (key.upArrow) {
      setScrollOffset((prev) => Math.max(0, prev - 1))
      return
    }
    if (key.downArrow) {
      setScrollOffset((prev) => Math.min(maxScroll, prev + 1))
      return
    }
    if (key.pageUp) {
      setScrollOffset((prev) => Math.max(0, prev - contentRows))
      return
    }
    if (key.pageDown) {
      setScrollOffset((prev) => Math.min(maxScroll, prev + contentRows))
    }
  })

  const visibleLines = useMemo(
    () => contentLines.slice(scrollOffset, scrollOffset + contentRows),
    [contentLines, contentRows, scrollOffset],
  )

  const showScrollHint = maxScroll > 0
  const scrollLabel = showScrollHint
    ? `↑/↓ scroll (${scrollOffset + 1}-${Math.min(scrollOffset + contentRows, contentLines.length)}/${contentLines.length})`
    : ''

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      paddingY={0}
      height={height}
      overflow="hidden"
    >
      <Box justifyContent="space-between">
        <Text color={titleColor}>Help</Text>
        <Text color="gray">Esc / ? to close</Text>
      </Box>

      <Box flexDirection="column" marginTop={1} height={contentRows} overflow="hidden">
        {visibleLines.map((line, index) => {
          const isSectionTitle = sections.some((section) => section.title === line)
          const color = isSectionTitle ? 'cyanBright' : 'gray'
          return (
            <Text key={`${scrollOffset}-${index}`} color={color}>
              {line}
            </Text>
          )
        })}
      </Box>

      <Box justifyContent="flex-end">
        <Text color="gray">{scrollLabel}</Text>
      </Box>
    </Box>
  )
}
