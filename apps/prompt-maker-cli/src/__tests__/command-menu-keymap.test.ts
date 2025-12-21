import type { Key } from 'ink'

import { resolveCommandMenuKeyAction } from '../tui/components/core/command-menu-keymap'

const createKey = (overrides: Partial<Key> = {}): Key => overrides as Key

describe('resolveCommandMenuKeyAction', () => {
  it('clamps selection when navigating', () => {
    expect(
      resolveCommandMenuKeyAction({
        key: createKey({ upArrow: true }),
        selectedIndex: 0,
        itemCount: 3,
      }),
    ).toEqual({ type: 'change-selection', nextIndex: 0 })

    expect(
      resolveCommandMenuKeyAction({
        key: createKey({ downArrow: true }),
        selectedIndex: 2,
        itemCount: 3,
      }),
    ).toEqual({ type: 'change-selection', nextIndex: 2 })
  })

  it('moves selection by one without wrapping', () => {
    expect(
      resolveCommandMenuKeyAction({
        key: createKey({ downArrow: true }),
        selectedIndex: 0,
        itemCount: 3,
      }),
    ).toEqual({ type: 'change-selection', nextIndex: 1 })

    expect(
      resolveCommandMenuKeyAction({
        key: createKey({ upArrow: true }),
        selectedIndex: 2,
        itemCount: 3,
      }),
    ).toEqual({ type: 'change-selection', nextIndex: 1 })
  })

  it('closes the palette on Esc', () => {
    expect(
      resolveCommandMenuKeyAction({
        key: createKey({ escape: true }),
        selectedIndex: 1,
        itemCount: 3,
      }),
    ).toEqual({ type: 'close' })
  })

  it('ignores keys when there are no items', () => {
    expect(
      resolveCommandMenuKeyAction({
        key: createKey({ downArrow: true }),
        selectedIndex: 0,
        itemCount: 0,
      }),
    ).toEqual({ type: 'none' })
  })
})
