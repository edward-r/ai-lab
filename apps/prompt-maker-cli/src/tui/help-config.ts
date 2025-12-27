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
        'Ctrl+C: Exit (or /exit)',
        'Esc: Dismiss UI (never exits)',
      ],
    },
    {
      title: 'Quick Start',
      lines: [
        'Type natural language requests or start a command with /.',
        'Press Enter to log input; arrow keys scroll history.',
        'Press ? anytime to view keyboard shortcuts.',
        'Series: /series generates standalone atomic prompts (no cross-references); it prefills from typed/last intent (or /intent file).',
        'Tests: /test prompt-tests.yaml runs the prompt test suite.',
        'Tokens: /tokens shows token usage breakdown.',
        'Reasoning: /reasoning (or /why) shows last model reasoning.',
        'JSON: /json on|off toggles prompt payload in history.',
        'Tip: Drag & drop a file path, then press Tab to add it to context.',
        'Tip: Press Tab to open the Series intent popup.',
      ],
    },
    {
      title: 'Generate',
      lines: ['History: ↑/↓ scroll · PgUp/PgDn page', ...formatCommandLines(commandDescriptors)],
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
