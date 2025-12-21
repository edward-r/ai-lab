import {
  backspace,
  deleteForward,
  getCursorCoordinates,
  getLineCount,
  insertText,
  moveCursorLeft,
  moveCursorRight,
  type MultilineTextBufferState,
} from '../tui/components/core/multiline-text-buffer'

describe('multiline-text-buffer', () => {
  it('counts lines based on newlines', () => {
    expect(getLineCount('')).toBe(1)
    expect(getLineCount('hello')).toBe(1)
    expect(getLineCount('a\nb')).toBe(2)
    expect(getLineCount('a\nb\n')).toBe(3)
  })

  it('inserts text at cursor and advances cursor', () => {
    const initial: MultilineTextBufferState = { value: 'ace', cursor: 1 }
    expect(insertText(initial, 'b')).toEqual({ value: 'abce', cursor: 2 })
  })

  it('supports inserting newlines', () => {
    const initial: MultilineTextBufferState = { value: 'hello', cursor: 5 }
    expect(insertText(initial, '\nworld')).toEqual({ value: 'hello\nworld', cursor: 11 })
  })

  it('strips bracketed paste markers during insert', () => {
    const initial: MultilineTextBufferState = { value: '', cursor: 0 }
    expect(insertText(initial, '\u001b[200~hello\u001b[201~')).toEqual({
      value: 'hello',
      cursor: 5,
    })
    expect(insertText(initial, '[200~hello[201~')).toEqual({ value: 'hello', cursor: 5 })
  })

  it('backspace removes the previous character', () => {
    const initial: MultilineTextBufferState = { value: 'abc', cursor: 2 }
    expect(backspace(initial)).toEqual({ value: 'ac', cursor: 1 })
  })

  it('deleteForward removes the next character', () => {
    const initial: MultilineTextBufferState = { value: 'abc', cursor: 1 }
    expect(deleteForward(initial)).toEqual({ value: 'ac', cursor: 1 })
  })

  it('moves cursor left and right with clamping', () => {
    const start: MultilineTextBufferState = { value: 'abc', cursor: 0 }
    expect(moveCursorLeft(start).cursor).toBe(0)
    expect(moveCursorRight(start).cursor).toBe(1)
    expect(moveCursorRight({ value: 'abc', cursor: 3 }).cursor).toBe(3)
  })

  it('reports cursor coordinates across lines', () => {
    expect(getCursorCoordinates('a\nbc\n', 0)).toEqual({ row: 0, column: 0 })
    expect(getCursorCoordinates('a\nbc\n', 1)).toEqual({ row: 0, column: 1 })
    expect(getCursorCoordinates('a\nbc\n', 2)).toEqual({ row: 1, column: 0 })
    expect(getCursorCoordinates('a\nbc\n', 4)).toEqual({ row: 1, column: 2 })
    expect(getCursorCoordinates('a\nbc\n', 5)).toEqual({ row: 2, column: 0 })
  })
})
