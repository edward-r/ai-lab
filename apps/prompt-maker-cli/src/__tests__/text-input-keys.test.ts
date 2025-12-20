import type { Key } from 'ink'

import { resolveSingleLineKeyAction } from '../tui/components/core/single-line-text-input-keymap'
import { isBackspaceKey } from '../tui/components/core/text-input-keys'

const createKey = (overrides: Partial<Key> = {}): Key => overrides as Key

describe('isBackspaceKey', () => {
  it('recognizes ink backspace flag', () => {
    expect(isBackspaceKey('', createKey({ backspace: true }))).toBe(true)
  })

  it('recognizes DEL and BS characters', () => {
    expect(isBackspaceKey('\u007f', createKey())).toBe(true)
    expect(isBackspaceKey('\b', createKey())).toBe(true)
  })

  it('recognizes Ctrl+H and Ctrl+?', () => {
    expect(isBackspaceKey('h', createKey({ ctrl: true }))).toBe(true)
    expect(isBackspaceKey('?', createKey({ ctrl: true }))).toBe(true)
  })

  it('recognizes Kitty CSI-u style sequences', () => {
    expect(isBackspaceKey('\u001b[127u', createKey())).toBe(true)
    expect(isBackspaceKey('\u001b[8u', createKey())).toBe(true)
    expect(isBackspaceKey('\u001b[51u', createKey())).toBe(true)
  })

  it('recognizes Kitty tilde backspace sequences', () => {
    expect(isBackspaceKey('\u001b[127~', createKey())).toBe(true)
    expect(isBackspaceKey('\u001b[8~', createKey())).toBe(true)
    expect(isBackspaceKey('\u001b[51~', createKey())).toBe(true)
  })

  it('treats delete-with-empty-input as backspace', () => {
    expect(isBackspaceKey('', createKey({ delete: true }))).toBe(true)
  })

  it('does not match regular input', () => {
    expect(isBackspaceKey('a', createKey())).toBe(false)
  })
})

describe('resolveSingleLineKeyAction', () => {
  it('applies Kitty CSI-u backspace to the buffer', () => {
    const action = resolveSingleLineKeyAction({
      input: '\u001b[127u',
      key: createKey({}),
      state: { value: 'abc', cursor: 3 },
    })

    expect(action).toEqual({ type: 'change', nextState: { value: 'ab', cursor: 2 } })
  })

  it('treats delete-with-empty-input as a backspace edit', () => {
    const action = resolveSingleLineKeyAction({
      input: '',
      key: createKey({ delete: true }),
      state: { value: 'abc', cursor: 3 },
    })

    expect(action).toEqual({ type: 'change', nextState: { value: 'ab', cursor: 2 } })
  })
})
