import { useCallback, useEffect, useRef } from 'react'
import { useInput, type Key } from 'ink'

import { useStableCallback } from '../../../hooks/useStableCallback'

import { stripBracketedPasteControlSequences } from '../../../components/core/bracketed-paste'
import {
  consumeBracketedPasteChunk,
  createBracketedPasteState,
  createPastedSnippet,
  detectPastedSnippetFromInputChange,
  type BracketedPasteState,
  type PastedSnippet,
} from '../../../paste-snippet'
import type { PopupState } from '../../../types'

import { dropMissingPasteTokens, expandPasteTokens } from '../utils/paste-tokens'

type SetInputValue = (value: string | ((prev: string) => string)) => void

type SuppressNextInput = () => void

type ConsumeSuppressedInputChange = () => boolean

type UpdateLastTypedIntent = (next: string) => void

type TokenLabel = (token: string) => string | null

type SetPasteActive = (active: boolean) => void

export type UsePasteManagerOptions = {
  inputValue: string
  popupState: PopupState
  helpOpen: boolean
  setInputValue: SetInputValue
  setPasteActive: SetPasteActive
  consumeSuppressedTextInputChange: ConsumeSuppressedInputChange
  suppressNextInput: SuppressNextInput
  updateLastTypedIntent: UpdateLastTypedIntent
}

export type UsePasteManagerResult = {
  tokenLabel: TokenLabel
  handleInputChange: (next: string) => void
  expandInputForSubmit: (value: string) => string
}

const PASTE_TOKEN_START = 0xe000
const PASTE_TOKEN_END = 0xf8ff

export const usePasteManager = ({
  inputValue,
  popupState,
  helpOpen,
  setInputValue,
  setPasteActive,
  consumeSuppressedTextInputChange,
  suppressNextInput,
  updateLastTypedIntent,
}: UsePasteManagerOptions): UsePasteManagerResult => {
  const inputValueRef = useRef('')
  inputValueRef.current = inputValue

  const pastedSnippetTokensRef = useRef<Map<string, PastedSnippet>>(new Map())
  const nextPasteTokenRef = useRef(PASTE_TOKEN_START)

  const suppressTextInputDuringPasteRef = useRef(false)
  const bracketedPasteStateRef = useRef<BracketedPasteState>(createBracketedPasteState())

  const resetPasteTokens = useCallback((): void => {
    pastedSnippetTokensRef.current.clear()
    nextPasteTokenRef.current = PASTE_TOKEN_START
  }, [])

  useEffect(() => {
    if (inputValue.length > 0) {
      return
    }
    resetPasteTokens()
  }, [inputValue.length, resetPasteTokens])

  const tokenLabel = useCallback<TokenLabel>((token: string) => {
    return pastedSnippetTokensRef.current.get(token)?.label ?? null
  }, [])

  const allocatePasteToken = useCallback((): string => {
    const map = pastedSnippetTokensRef.current
    let nextCodePoint = nextPasteTokenRef.current

    while (nextCodePoint <= PASTE_TOKEN_END) {
      const token = String.fromCharCode(nextCodePoint)
      nextCodePoint += 1
      if (!map.has(token)) {
        nextPasteTokenRef.current = nextCodePoint
        return token
      }
    }

    resetPasteTokens()
    const fallback = String.fromCharCode(PASTE_TOKEN_START)
    nextPasteTokenRef.current = PASTE_TOKEN_START + 1
    return fallback
  }, [resetPasteTokens])

  const appendInlinePaste = useCallback(
    (raw: string): void => {
      const normalized = stripBracketedPasteControlSequences(
        raw
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/\u0000/g, ''),
      )
      const snippet = createPastedSnippet(normalized)

      suppressNextInput()

      if (snippet) {
        const token = allocatePasteToken()
        pastedSnippetTokensRef.current.set(token, snippet)
        setInputValue((prev) => {
          const next = prev + token
          updateLastTypedIntent(next)
          return next
        })
        return
      }

      setInputValue((prev) => {
        const next = prev + normalized
        updateLastTypedIntent(next)
        return next
      })
    },
    [allocatePasteToken, setInputValue, suppressNextInput, updateLastTypedIntent],
  )

  const handlePasteInput = useStableCallback((input: string, _key: Key) => {
    if (popupState || helpOpen) {
      return
    }

    const result = consumeBracketedPasteChunk(bracketedPasteStateRef.current, input)
    bracketedPasteStateRef.current = result.state

    const nextPasteActive = result.state.isActive
    const prevPasteActive = suppressTextInputDuringPasteRef.current
    suppressTextInputDuringPasteRef.current = nextPasteActive
    if (prevPasteActive !== nextPasteActive) {
      setPasteActive(nextPasteActive)
    }

    if (result.completed.length === 0) {
      return
    }

    const latestPaste = result.completed[result.completed.length - 1] ?? ''
    appendInlinePaste(latestPaste)
  })

  useInput(handlePasteInput, { isActive: !helpOpen })

  const handleInputChange = useCallback(
    (next: string) => {
      if (consumeSuppressedTextInputChange()) {
        return
      }
      if (popupState) {
        return
      }
      if (suppressTextInputDuringPasteRef.current) {
        return
      }

      const previous = inputValueRef.current
      const normalizedNext = stripBracketedPasteControlSequences(
        next
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/\u0000/g, ''),
      )
      const detection = detectPastedSnippetFromInputChange(previous, normalizedNext)

      if (detection) {
        const token = allocatePasteToken()
        pastedSnippetTokensRef.current.set(token, detection.snippet)

        const replaced =
          detection.normalizedNextValue.slice(0, detection.range.start) +
          token +
          detection.normalizedNextValue.slice(detection.range.end)

        dropMissingPasteTokens(previous, replaced, pastedSnippetTokensRef.current)
        setInputValue(replaced)
        updateLastTypedIntent(replaced)
        return
      }

      dropMissingPasteTokens(previous, normalizedNext, pastedSnippetTokensRef.current)
      setInputValue(normalizedNext)
      updateLastTypedIntent(normalizedNext)
    },
    [
      allocatePasteToken,
      consumeSuppressedTextInputChange,
      popupState,
      setInputValue,
      updateLastTypedIntent,
    ],
  )

  const expandInputForSubmit = useCallback((value: string) => {
    return expandPasteTokens(value, pastedSnippetTokensRef.current)
  }, [])

  return {
    tokenLabel,
    handleInputChange,
    expandInputForSubmit,
  }
}
