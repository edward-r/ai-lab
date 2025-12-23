import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Text, useInput, type Key } from 'ink'

import {
  backspace,
  clampCursor,
  deleteForward,
  insertText,
  moveCursorLeft,
  moveCursorRight,
  type MultilineTextBufferState,
} from './multiline-text-buffer'
import { isBackspaceKey } from './text-input-keys'
import {
  expandTokenizedLines,
  getTokenizedCursorCoordinates,
  type TokenLabelLookup,
} from './tokenized-text'

import { useTheme } from '../../theme/theme-provider'
import { inkColorProps } from '../../theme/theme-types'

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
  tokenLabel?: TokenLabelLookup | undefined
  onDebugKeyEvent?: ((event: DebugKeyEvent) => void) | undefined
}

const PROMPT = '› '
const PROMPT_SPACER = '  '

type RenderLine = {
  id: string
  content: string
  isPlaceholder: boolean
}

const toRenderLines = (
  value: string,
  placeholder: string | undefined,
  tokenLabel: TokenLabelLookup,
): RenderLine[] => {
  if (!value) {
    return [{ id: 'placeholder', content: placeholder ?? '', isPlaceholder: true }]
  }

  const lines = expandTokenizedLines(value, tokenLabel)
  return lines.map((line, index) => ({ id: `line-${index}`, content: line, isPlaceholder: false }))
}

export const MultilineTextInput: React.FC<MultilineTextInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  focus = false,
  isDisabled = false,
  isPasteActive = false,
  tokenLabel,
  onDebugKeyEvent,
}) => {
  const { theme } = useTheme()
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

      if (isBackspaceKey(input, key)) {
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

  const resolvedTokenLabel = useMemo<TokenLabelLookup>(
    () => tokenLabel ?? (() => null),
    [tokenLabel],
  )

  const lines = useMemo(
    () => toRenderLines(value, placeholder, resolvedTokenLabel),
    [placeholder, resolvedTokenLabel, value],
  )
  const { row: cursorRow, column: cursorColumn } = useMemo(
    () => getTokenizedCursorCoordinates(value, cursor, resolvedTokenLabel),
    [cursor, resolvedTokenLabel, value],
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
        const lineColorProps = line.isPlaceholder ? inkColorProps(theme.mutedText) : {}

        return (
          <Box key={line.id}>
            <Text {...inkColorProps(theme.accent)}>{prefix}</Text>
            {isCursorLine ? (
              <>
                <Text {...lineColorProps}>{before}</Text>
                <Text inverse {...lineColorProps}>
                  {cursorCharacter}
                </Text>
                <Text {...lineColorProps}>{after}</Text>
              </>
            ) : (
              <Text {...lineColorProps}>{before}</Text>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
