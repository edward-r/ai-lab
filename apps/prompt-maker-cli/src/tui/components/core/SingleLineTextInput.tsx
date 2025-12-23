import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Text, useInput, type Key } from 'ink'

import { clampCursor, type MultilineTextBufferState } from './multiline-text-buffer'
import { resolveSingleLineKeyAction } from './single-line-text-input-keymap'

import { useTheme } from '../../theme/theme-provider'
import { inkColorProps } from '../../theme/theme-types'

export type DebugKeyEvent = {
  input: string
  key: Key
}

export type SingleLineTextInputProps = {
  value: string
  onChange: (next: string) => void
  onSubmit: (value: string) => void
  placeholder?: string | undefined
  focus?: boolean
  isDisabled?: boolean
  onDebugKeyEvent?: ((event: DebugKeyEvent) => void) | undefined
}

type RenderLine = {
  before: string
  cursorCharacter: string
  after: string
  isPlaceholder: boolean
}

const toRenderLine = (
  value: string,
  placeholder: string | undefined,
  cursor: number,
): RenderLine => {
  if (!value) {
    const placeholderText = placeholder ?? ''
    const safeCursor = Math.min(Math.max(cursor, 0), placeholderText.length)
    const before = placeholderText.slice(0, safeCursor)
    const cursorCharacter =
      safeCursor < placeholderText.length ? placeholderText.charAt(safeCursor) : ' '
    const after = safeCursor < placeholderText.length ? placeholderText.slice(safeCursor + 1) : ''
    return { before, cursorCharacter, after, isPlaceholder: true }
  }

  const safeCursor = Math.min(Math.max(cursor, 0), value.length)
  const before = value.slice(0, safeCursor)
  const cursorCharacter = safeCursor < value.length ? value.charAt(safeCursor) : ' '
  const after = safeCursor < value.length ? value.slice(safeCursor + 1) : ''
  return { before, cursorCharacter, after, isPlaceholder: false }
}

export const SingleLineTextInput: React.FC<SingleLineTextInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  focus = false,
  isDisabled = false,
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
      if (!focus || isDisabled) {
        return
      }

      if (onDebugKeyEvent) {
        onDebugKeyEvent({ input, key })
      }

      const action = resolveSingleLineKeyAction({ input, key, state })
      if (action.type === 'none') {
        return
      }

      if (action.type === 'submit') {
        onSubmit(value)
        return
      }

      applyNextState(action.nextState)
    },
    { isActive: focus && !isDisabled },
  )

  const rendered = useMemo(
    () => toRenderLine(value, placeholder, state.cursor),
    [placeholder, state.cursor, value],
  )

  const colorProps = rendered.isPlaceholder ? inkColorProps(theme.mutedText) : {}

  return (
    <Box>
      <Text {...colorProps}>{rendered.before}</Text>
      <Text inverse {...colorProps}>
        {rendered.cursorCharacter}
      </Text>
      <Text {...colorProps}>{rendered.after}</Text>
    </Box>
  )
}
