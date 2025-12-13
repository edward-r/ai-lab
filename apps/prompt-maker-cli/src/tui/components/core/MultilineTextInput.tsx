import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Text, useInput, type Key } from 'ink'

import {
  backspace,
  clampCursor,
  deleteForward,
  getCursorCoordinates,
  insertText,
  moveCursorLeft,
  moveCursorRight,
  type MultilineTextBufferState,
} from './multiline-text-buffer'

export type DebugKeyEvent = {
  input: string
  key: Key
}

export type MultilineTextInputProps = {
  value: string
  onChange: (next: string) => void
  onSubmit: (value: string) => void
  placeholder?: string | undefined
  focus?: boolean
  isDisabled?: boolean
  isPasteActive?: boolean
  onDebugKeyEvent?: ((event: DebugKeyEvent) => void) | undefined
}

const PROMPT = '› '
const PROMPT_SPACER = '  '

type RenderLine = {
  id: string
  content: string
  color?: 'gray'
}

const toRenderLines = (value: string, placeholder: string | undefined): RenderLine[] => {
  if (!value) {
    return [{ id: 'placeholder', content: placeholder ?? '', color: 'gray' }]
  }

  return value.split('\n').map((line, index) => ({ id: `line-${index}`, content: line }))
}

export const MultilineTextInput: React.FC<MultilineTextInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  focus = false,
  isDisabled = false,
  isPasteActive = false,
  onDebugKeyEvent,
}) => {
  const [cursor, setCursor] = useState<number>(value.length)
  const internalUpdateRef = useRef(false)

  const state: MultilineTextBufferState = useMemo(
    () => ({ value, cursor: clampCursor(cursor, value) }),
    [cursor, value],
  )

  const applyNextState = (nextState: MultilineTextBufferState): void => {
    internalUpdateRef.current = true
    setCursor(nextState.cursor)
    onChange(nextState.value)
  }

  useEffect(() => {
    if (internalUpdateRef.current) {
      internalUpdateRef.current = false
      return
    }

    setCursor(value.length)
  }, [value])

  useInput(
    (input, key) => {
      if (!focus || isDisabled || isPasteActive) {
        return
      }

      if (onDebugKeyEvent) {
        onDebugKeyEvent({ input, key })
      }

      const isCtrlJ = key.ctrl && input.toLowerCase() === 'j'
      const isAltEnter =
        key.meta && (key.return || input === '\r' || input === '\n' || input === '')
      const isEscapedAltEnter = input === '\u001b\r' || input === '\u001b\n'

      if (isCtrlJ || isAltEnter || isEscapedAltEnter) {
        applyNextState(insertText(state, '\n'))
        return
      }

      if (key.return) {
        onSubmit(value)
        return
      }

      const kittyCsiUMatch = /^\u001b\[([0-9]+)(?:;[0-9]+)*u$/.exec(input)
      const kittyCsiUCode = kittyCsiUMatch ? Number(kittyCsiUMatch[1]) : null
      const isKittyBackspaceSequence =
        (kittyCsiUCode !== null && [8, 51, 127].includes(kittyCsiUCode)) ||
        input === '\u001b[127~' ||
        input === '\u001b[8~' ||
        input === '\u001b[51~'

      const hasDel = input.includes('\u007f')
      const hasBackspace = input.includes('\b')

      const isBackspace =
        key.backspace ||
        hasDel ||
        hasBackspace ||
        (key.ctrl && input.toLowerCase() === 'h') ||
        (key.ctrl && input === '?') ||
        isKittyBackspaceSequence ||
        (key.delete && input === '')

      if (isBackspace) {
        applyNextState(backspace(state))
        return
      }

      if (key.delete) {
        applyNextState(deleteForward(state))
        return
      }

      if (key.leftArrow) {
        setCursor(moveCursorLeft(state).cursor)
        return
      }

      if (key.rightArrow) {
        setCursor(moveCursorRight(state).cursor)
        return
      }

      if (!input) {
        return
      }

      if (key.ctrl || key.meta) {
        return
      }

      applyNextState(insertText(state, input))
    },
    { isActive: focus && !isDisabled },
  )

  const lines = useMemo(() => toRenderLines(value, placeholder), [placeholder, value])
  const { row: cursorRow, column: cursorColumn } = useMemo(
    () => getCursorCoordinates(value, cursor),
    [cursor, value],
  )

  return (
    <Box flexDirection="column" height={lines.length}>
      {lines.map((line, lineIndex) => {
        const isCursorLine = lineIndex === cursorRow
        const safeColumn = isCursorLine ? Math.min(cursorColumn, line.content.length) : 0
        const before = isCursorLine ? line.content.slice(0, safeColumn) : line.content
        const cursorCharacter = isCursorLine
          ? safeColumn < line.content.length
            ? line.content.charAt(safeColumn)
            : ' '
          : ''
        const after =
          isCursorLine && safeColumn < line.content.length ? line.content.slice(safeColumn + 1) : ''

        const prefix = lineIndex === 0 ? PROMPT : PROMPT_SPACER
        const colorProps = line.color ? { color: line.color } : {}

        return (
          <Box key={line.id}>
            <Text color="cyan">{prefix}</Text>
            {isCursorLine ? (
              <>
                <Text {...colorProps}>{before}</Text>
                <Text inverse {...colorProps}>
                  {cursorCharacter}
                </Text>
                <Text {...colorProps}>{after}</Text>
              </>
            ) : (
              <Text {...colorProps}>{before}</Text>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
