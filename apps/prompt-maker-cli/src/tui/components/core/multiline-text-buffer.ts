import { stripBracketedPasteControlSequences } from './bracketed-paste'

export type MultilineTextBufferState = {
  value: string
  cursor: number
}

export type CursorCoordinates = {
  row: number
  column: number
}

export const clampCursor = (cursor: number, value: string): number =>
  Math.max(0, Math.min(cursor, value.length))

export const getLineCount = (value: string): number => {
  if (!value) {
    return 1
  }
  return value.split('\n').length
}

export const getCursorCoordinates = (value: string, cursor: number): CursorCoordinates => {
  const clampedCursor = clampCursor(cursor, value)
  let row = 0
  let column = 0

  for (let index = 0; index < clampedCursor; index += 1) {
    const character = value.charAt(index)
    if (character === '\n') {
      row += 1
      column = 0
    } else {
      column += 1
    }
  }

  return { row, column }
}

export const insertText = (
  state: MultilineTextBufferState,
  text: string,
): MultilineTextBufferState => {
  const sanitized = stripBracketedPasteControlSequences(text)
  if (!sanitized) {
    return state
  }

  const cursor = clampCursor(state.cursor, state.value)
  const nextValue = state.value.slice(0, cursor) + sanitized + state.value.slice(cursor)
  return {
    value: nextValue,
    cursor: cursor + sanitized.length,
  }
}

export const backspace = (state: MultilineTextBufferState): MultilineTextBufferState => {
  const cursor = clampCursor(state.cursor, state.value)
  if (cursor === 0) {
    return { value: state.value, cursor }
  }

  const nextValue = state.value.slice(0, cursor - 1) + state.value.slice(cursor)
  return {
    value: nextValue,
    cursor: cursor - 1,
  }
}

export const deleteForward = (state: MultilineTextBufferState): MultilineTextBufferState => {
  const cursor = clampCursor(state.cursor, state.value)
  if (cursor >= state.value.length) {
    return { value: state.value, cursor }
  }

  const nextValue = state.value.slice(0, cursor) + state.value.slice(cursor + 1)
  return {
    value: nextValue,
    cursor,
  }
}

export const moveCursorLeft = (state: MultilineTextBufferState): MultilineTextBufferState => ({
  value: state.value,
  cursor: Math.max(0, clampCursor(state.cursor, state.value) - 1),
})

export const moveCursorRight = (state: MultilineTextBufferState): MultilineTextBufferState => ({
  value: state.value,
  cursor: Math.min(state.value.length, clampCursor(state.cursor, state.value) + 1),
})
