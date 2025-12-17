import type { CommandDescriptor } from './types'

export type HelpSection = {
  title: string
  lines: string[]
}

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  if (size <= 0) {
    return [Array.from(items)]
  }

  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

const formatCommandLines = (commandDescriptors: readonly CommandDescriptor[]): string[] => {
  const commands = commandDescriptors.map((descriptor) => `/${descriptor.id}`)
  const chunks = chunk(commands, 7)

  return chunks.map((group, index) => {
    const prefix = index === 0 ? 'Commands: ' : '         '
    return `${prefix}${group.join(' ')}`
  })
}

export type HelpConfigOptions = {
  commandDescriptors: readonly CommandDescriptor[]
}

export const estimateHelpOverlayHeight = (sections: readonly HelpSection[]): number => {
  const titleRows = 1
  const sectionRows = sections.reduce(
    (accumulator, section) => accumulator + 1 + 1 + section.lines.length,
    0,
  )
  const borderRows = 2

  return titleRows + sectionRows + borderRows
}

export const createHelpSections = ({ commandDescriptors }: HelpConfigOptions): HelpSection[] => {
  return [
    {
      title: 'Global',
      lines: [
        'Ctrl+G: Generate + open command palette',
        'Ctrl+T: Switch to Test Runner',
        '?: Toggle this help overlay',
        '/exit: Exit application',
        'Esc: Close the active overlay (never exits)',
      ],
    },
    {
      title: 'Generate',
      lines: [
        'Type intents freely, or start a command with /.',
        'History: ↑/↓ scroll · PgUp/PgDn page',
        'Tab: Open Series intent popup (when typing)',
        ...formatCommandLines(commandDescriptors),
      ],
    },
    {
      title: 'Test Runner',
      lines: [
        'Tab / Shift+Tab: Move focus',
        'Enter (File): Move to Actions',
        'Enter (Actions): Run tests',
      ],
    },
    {
      title: 'Popups',
      lines: ['Esc: Close · ↑/↓: Navigate · Enter: Confirm', 'Del/Backspace: Remove selected item'],
    },
  ]
}
