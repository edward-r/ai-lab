import {
  commandScreenReducer,
  createInitialCommandScreenState,
} from '../tui/screens/command/command-screen-reducer'

describe('commandScreenReducer', () => {
  it('sets terminal size and avoids needless changes', () => {
    const initial = createInitialCommandScreenState({ terminalRows: 24, terminalColumns: 80 })

    const same = commandScreenReducer(initial, {
      type: 'set-terminal-size',
      rows: 24,
      columns: 80,
    })
    expect(same).toBe(initial)

    const next = commandScreenReducer(initial, {
      type: 'set-terminal-size',
      rows: 40,
      columns: 120,
    })

    expect(next).toEqual({ ...initial, terminalRows: 40, terminalColumns: 120 })
  })

  it('supports functional input updates', () => {
    const initial = createInitialCommandScreenState({ terminalRows: 24, terminalColumns: 80 })

    const next = commandScreenReducer(initial, {
      type: 'set-input',
      next: (prev) => `${prev}hello`,
    })

    expect(next.inputValue).toBe('hello')
  })

  it('supports functional command selection updates', () => {
    const initial = createInitialCommandScreenState({ terminalRows: 24, terminalColumns: 80 })

    const next = commandScreenReducer(initial, {
      type: 'set-command-selection',
      next: (prev) => prev + 2,
    })

    expect(next.commandSelectionIndex).toBe(2)
  })
})
