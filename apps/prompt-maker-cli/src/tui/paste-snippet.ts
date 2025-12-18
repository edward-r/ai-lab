import { stripBracketedPasteControlSequences } from './components/core/bracketed-paste'

export const BRACKETED_PASTE_START = '[200~'
export const BRACKETED_PASTE_END = '[201~'

export type BracketedPasteState = {
  readonly isActive: boolean
  readonly buffer: string
}

export type ConsumeBracketedPasteResult = {
  readonly state: BracketedPasteState
  readonly completed: readonly string[]
  readonly didSeeBracketedPaste: boolean
}

export const createBracketedPasteState = (): BracketedPasteState => ({
  isActive: false,
  buffer: '',
})

export const consumeBracketedPasteChunk = (
  state: BracketedPasteState,
  chunk: string,
): ConsumeBracketedPasteResult => {
  let remaining = chunk
  let isActive = state.isActive
  let buffer = state.buffer
  let didSeeBracketedPaste = state.isActive
  const completed: string[] = []

  while (remaining.length > 0) {
    if (!isActive) {
      const startIndex = remaining.indexOf(BRACKETED_PASTE_START)
      if (startIndex === -1) {
        break
      }

      didSeeBracketedPaste = true
      isActive = true
      buffer = ''
      remaining = remaining.slice(startIndex + BRACKETED_PASTE_START.length)
      continue
    }

    const endIndex = remaining.indexOf(BRACKETED_PASTE_END)
    if (endIndex === -1) {
      buffer += remaining
      remaining = ''
      break
    }

    didSeeBracketedPaste = true
    buffer += remaining.slice(0, endIndex)
    completed.push(buffer)

    buffer = ''
    isActive = false
    remaining = remaining.slice(endIndex + BRACKETED_PASTE_END.length)
  }

  return {
    state: {
      isActive,
      buffer,
    },
    completed,
    didSeeBracketedPaste,
  }
}

export const MIN_PASTE_CHARS = 80
const PREVIEW_LINE_LIMIT = 3

export type PastedSnippet = {
  readonly text: string
  readonly lineCount: number
  readonly charCount: number
  readonly label: string
  readonly previewLines: readonly string[]
}

const normalizeLineEndings = (value: string): string => {
  const normalized = value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u0000/g, '')
  return stripBracketedPasteControlSequences(normalized)
}

const countLines = (value: string): number => {
  const trimmed = value.trimEnd()
  if (!trimmed) {
    return 0
  }
  return trimmed.split('\n').length
}

export const formatPastedSnippetLabel = (lineCount: number): string =>
  `[Pasted ~${lineCount} ${lineCount === 1 ? 'line' : 'lines'}]`

export const createPastedSnippet = (raw: string): PastedSnippet | null => {
  const normalized = normalizeLineEndings(raw)
  const text = normalized.trimEnd()
  const lineCount = countLines(text)
  const charCount = text.length

  if (charCount < MIN_PASTE_CHARS) {
    return null
  }

  const previewLines = text
    .split('\n')
    .slice(0, PREVIEW_LINE_LIMIT)
    .map((line) => line.trimEnd())

  return {
    text,
    lineCount,
    charCount,
    label: formatPastedSnippetLabel(lineCount),
    previewLines,
  }
}

export type PastedSnippetDetection = {
  readonly snippet: PastedSnippet
  readonly range: {
    readonly start: number
    readonly end: number
  }
  readonly normalizedNextValue: string
}

const findInsertedRange = (
  previousValue: string,
  nextValue: string,
): { start: number; end: number } => {
  const maxPrefix = Math.min(previousValue.length, nextValue.length)
  let start = 0
  while (start < maxPrefix && previousValue[start] === nextValue[start]) {
    start += 1
  }

  let previousEnd = previousValue.length
  let nextEnd = nextValue.length
  while (
    previousEnd > start &&
    nextEnd > start &&
    previousValue[previousEnd - 1] === nextValue[nextEnd - 1]
  ) {
    previousEnd -= 1
    nextEnd -= 1
  }

  return { start, end: nextEnd }
}

export const detectPastedSnippetFromInputChange = (
  previousValue: string,
  nextValue: string,
): PastedSnippetDetection | null => {
  const previousNormalized = normalizeLineEndings(previousValue)
  const nextNormalized = normalizeLineEndings(nextValue)

  const range = findInsertedRange(previousNormalized, nextNormalized)
  const inserted = nextNormalized.slice(range.start, range.end)
  const snippet = createPastedSnippet(inserted)
  if (!snippet) {
    return null
  }

  return { snippet, range, normalizedNextValue: nextNormalized }
}
