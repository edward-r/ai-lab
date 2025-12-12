import { COMMAND_DESCRIPTORS } from '../tui/config'
import { createHelpSections } from '../tui/help-config'

describe('createHelpSections', () => {
  it('includes global shortcuts and help toggle', () => {
    const sections = createHelpSections({ commandDescriptors: COMMAND_DESCRIPTORS })
    const global = sections.find((section) => section.title === 'Global')

    expect(global).toBeDefined()
    expect(global?.lines.join(' ')).toContain('Ctrl+G')
    expect(global?.lines.join(' ')).toContain('Ctrl+T')
    expect(global?.lines.join(' ')).toContain('?')
  })

  it('mentions every configured command', () => {
    const sections = createHelpSections({ commandDescriptors: COMMAND_DESCRIPTORS })
    const generate = sections.find((section) => section.title === 'Generate')

    expect(generate).toBeDefined()

    const combined = generate?.lines.join(' ') ?? ''

    for (const descriptor of COMMAND_DESCRIPTORS) {
      expect(combined).toContain(`/${descriptor.id}`)
    }
  })
})
