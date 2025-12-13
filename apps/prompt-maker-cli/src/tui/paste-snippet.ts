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

const MIN_PASTE_DELTA_CHARS = 80
const LARGE_SINGLE_LINE_CHARS = 400
const PREVIEW_LINE_LIMIT = 3

export type PastedSnippet = {
  readonly text: string
  readonly lineCount: number
  readonly charCount: number
  readonly label: string
  readonly previewLines: readonly string[]
}

const normalizeLineEndings = (value: string): string =>
  value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

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
  const normalized = normalizeLineEndings(raw).replace(/\u0000/g, '')
  const text = normalized.trimEnd()
  const lineCount = countLines(text)
  const charCount = text.length

  if (lineCount < 2 && charCount < LARGE_SINGLE_LINE_CHARS) {
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

export const detectPastedSnippetFromInputChange = (
  previousValue: string,
  nextValue: string,
): PastedSnippet | null => {
  const hasNewline = /[\n\r]/.test(nextValue)
  if (hasNewline) {
    return createPastedSnippet(nextValue)
  }

  const previousNormalized = normalizeLineEndings(previousValue)
  const nextNormalized = normalizeLineEndings(nextValue)
  const delta = nextNormalized.length - previousNormalized.length

  if (delta < MIN_PASTE_DELTA_CHARS) {
    return null
  }

  if (nextNormalized.length < LARGE_SINGLE_LINE_CHARS) {
    return null
  }

  return createPastedSnippet(nextNormalized)
}
