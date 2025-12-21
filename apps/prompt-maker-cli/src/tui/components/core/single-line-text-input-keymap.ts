import type { Key } from 'ink'

import {
  backspace,
  deleteForward,
  insertText,
  moveCursorLeft,
  moveCursorRight,
  type MultilineTextBufferState,
} from './multiline-text-buffer'
import { isBackspaceKey } from './text-input-keys'

export type SingleLineKeyAction =
  | { type: 'none' }
  | { type: 'submit' }
  | { type: 'change'; nextState: MultilineTextBufferState }

export type ResolveSingleLineKeyActionOptions = {
  input: string
  key: Key
  state: MultilineTextBufferState
}

export const resolveSingleLineKeyAction = ({
  input,
  key,
  state,
}: ResolveSingleLineKeyActionOptions): SingleLineKeyAction => {
  if (key.return) {
    return { type: 'submit' }
  }

  if (isBackspaceKey(input, key)) {
    return { type: 'change', nextState: backspace(state) }
  }

  if (key.delete) {
    return { type: 'change', nextState: deleteForward(state) }
  }

  if (key.leftArrow) {
    return { type: 'change', nextState: moveCursorLeft(state) }
  }

  if (key.rightArrow) {
    return { type: 'change', nextState: moveCursorRight(state) }
  }

  if (!input) {
    return { type: 'none' }
  }

  if (key.ctrl || key.meta) {
    return { type: 'none' }
  }

  const sanitized = input.replace(/[\r\n]/g, '')
  if (!sanitized) {
    return { type: 'none' }
  }

  return { type: 'change', nextState: insertText(state, sanitized) }
}
