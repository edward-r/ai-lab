import { planSessionCommand } from '../tui/new-command'

describe('session command planner', () => {
  it('plans /new as reset-only', () => {
    expect(planSessionCommand({ commandId: 'new', lastGeneratedPrompt: 'ignored' })).toEqual({
      type: 'reset-only',
      message: '[new] Session reset.',
    })
  })

  it('plans /reuse with no prompt as reset-only', () => {
    expect(planSessionCommand({ commandId: 'reuse', lastGeneratedPrompt: null })).toEqual({
      type: 'reset-only',
      message: '[reuse] Session reset · no previous prompt to reuse.',
    })

    expect(planSessionCommand({ commandId: 'reuse', lastGeneratedPrompt: '   ' })).toEqual({
      type: 'reset-only',
      message: '[reuse] Session reset · no previous prompt to reuse.',
    })
  })

  it('plans /reuse with prompt as reset-and-load-meta', () => {
    expect(planSessionCommand({ commandId: 'reuse', lastGeneratedPrompt: ' hello ' })).toEqual({
      type: 'reset-and-load-meta',
      message: '[reuse] Session reset · loaded last prompt into meta instructions.',
      metaInstructions: 'hello',
    })
  })
})
