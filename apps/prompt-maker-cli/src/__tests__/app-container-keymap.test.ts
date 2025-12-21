import type { Key } from 'ink'

import { resolveAppContainerKeyAction } from '../tui/app-container-keymap'

const createKey = (overrides: Partial<Key> = {}): Key => overrides as Key

describe('resolveAppContainerKeyAction', () => {
  it('toggles help open on ?', () => {
    const action = resolveAppContainerKeyAction({
      input: '?',
      key: createKey({}),
      view: 'generate',
      isPopupOpen: false,
      isHelpOpen: false,
    })

    expect(action).toEqual({ type: 'toggle-help', nextIsHelpOpen: true })
  })

  it('closes help on Esc', () => {
    const action = resolveAppContainerKeyAction({
      input: '',
      key: createKey({ escape: true }),
      view: 'generate',
      isPopupOpen: false,
      isHelpOpen: true,
    })

    expect(action).toEqual({ type: 'toggle-help', nextIsHelpOpen: false })
  })

  it('swallows navigation keys while help is open', () => {
    const action = resolveAppContainerKeyAction({
      input: 'g',
      key: createKey({ ctrl: true }),
      view: 'tests',
      isPopupOpen: false,
      isHelpOpen: true,
    })

    expect(action).toEqual({ type: 'none' })
  })

  it('does not exit on Esc (generate view, no popup)', () => {
    const action = resolveAppContainerKeyAction({
      input: '',
      key: createKey({ escape: true }),
      view: 'generate',
      isPopupOpen: false,
      isHelpOpen: false,
    })

    expect(action).toEqual({ type: 'none' })
  })

  it('does not exit on Esc (generate view, popup open)', () => {
    const action = resolveAppContainerKeyAction({
      input: '',
      key: createKey({ escape: true }),
      view: 'generate',
      isPopupOpen: true,
      isHelpOpen: false,
    })

    expect(action).toEqual({ type: 'none' })
  })

  it('does not exit on Esc (tests view)', () => {
    const action = resolveAppContainerKeyAction({
      input: '',
      key: createKey({ escape: true }),
      view: 'tests',
      isPopupOpen: false,
      isHelpOpen: false,
    })

    expect(action).toEqual({ type: 'none' })
  })

  it('swallows Ctrl+G when a generate popup is open', () => {
    const action = resolveAppContainerKeyAction({
      input: 'g',
      key: createKey({ ctrl: true }),
      view: 'generate',
      isPopupOpen: true,
      isHelpOpen: false,
    })

    expect(action).toEqual({ type: 'none' })
  })

  it('swallows Ctrl+T when a generate popup is open', () => {
    const action = resolveAppContainerKeyAction({
      input: 't',
      key: createKey({ ctrl: true }),
      view: 'generate',
      isPopupOpen: true,
      isHelpOpen: false,
    })

    expect(action).toEqual({ type: 'none' })
  })

  it('switches to generate and opens palette on Ctrl+G from tests', () => {
    const action = resolveAppContainerKeyAction({
      input: 'g',
      key: createKey({ ctrl: true }),
      view: 'tests',
      isPopupOpen: false,
      isHelpOpen: false,
    })

    expect(action).toEqual({ type: 'switch-to-generate-and-open-command-palette' })
  })
})
