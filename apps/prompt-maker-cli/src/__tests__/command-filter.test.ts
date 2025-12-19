import { filterCommandDescriptors, resolveCommandMenuSearchState } from '../tui/command-filter'
import { COMMAND_DESCRIPTORS } from '../tui/config'

describe('command filtering', () => {
  it('returns all commands for an empty query', () => {
    const result = filterCommandDescriptors({ query: '   ', commands: COMMAND_DESCRIPTORS })
    expect(result.map((command) => command.id)).toEqual(COMMAND_DESCRIPTORS.map((c) => c.id))
  })

  it('matches aliases case-insensitively', () => {
    const result = filterCommandDescriptors({ query: 'MeTa', commands: COMMAND_DESCRIPTORS })
    expect(result.map((command) => command.id)).toEqual(['instructions'])
  })

  it('matches by description tokens when not a command prefix', () => {
    const state = resolveCommandMenuSearchState({
      commandQuery: 'prompt tests',
      commands: COMMAND_DESCRIPTORS,
    })

    expect(state.treatRemainderAsArgs).toBe(false)

    const result = filterCommandDescriptors({
      query: state.filterQuery,
      commands: COMMAND_DESCRIPTORS,
    })
    expect(result.map((command) => command.id)).toContain('test')
  })

  it('treats the remainder as args when there is a prefix match', () => {
    const state = resolveCommandMenuSearchState({
      commandQuery: 'test prompt-tests.yaml',
      commands: COMMAND_DESCRIPTORS,
    })

    expect(state).toEqual({ filterQuery: 'test', treatRemainderAsArgs: true })

    const result = filterCommandDescriptors({
      query: state.filterQuery,
      commands: COMMAND_DESCRIPTORS,
    })
    expect(result.map((command) => command.id)).toContain('test')
  })

  it('prefers id/alias/label prefix matches', () => {
    const result = filterCommandDescriptors({ query: 'why', commands: COMMAND_DESCRIPTORS })
    expect(result.map((command) => command.id)[0]).toBe('reasoning')
  })

  it('matches substrings in label and description', () => {
    const result = filterCommandDescriptors({ query: 'switch', commands: COMMAND_DESCRIPTORS })
    expect(result.map((command) => command.id)).toContain('model')
  })
})
