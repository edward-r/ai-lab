import { COMMAND_DESCRIPTORS } from '../tui/config'

describe('tui command descriptors', () => {
  const getDescriptor = (id: (typeof COMMAND_DESCRIPTORS)[number]['id']) =>
    COMMAND_DESCRIPTORS.find((entry) => entry.id === id)

  it('surfaces series intent prefill guidance', () => {
    const descriptor = getDescriptor('series')
    expect(descriptor).toBeDefined()
    expect(descriptor?.description).toMatch(/prefill/i)
    expect(descriptor?.description).toMatch(/intent file/i)
  })

  it('includes concrete examples for /test and /json', () => {
    const testDescriptor = getDescriptor('test')
    expect(testDescriptor).toBeDefined()
    expect(testDescriptor?.description).toContain('/test prompt-tests.yaml')

    const jsonDescriptor = getDescriptor('json')
    expect(jsonDescriptor).toBeDefined()
    expect(jsonDescriptor?.description).toContain('/json on|off')
  })
})
