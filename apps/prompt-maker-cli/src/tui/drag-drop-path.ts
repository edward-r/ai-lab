import { stripTerminalPasteArtifacts } from './components/core/bracketed-paste'

export const parseAbsolutePathFromInput = (input: string): string | null => {
  const sanitizedInput = stripTerminalPasteArtifacts(input)
  const trimmed = sanitizedInput.trim()
  if (!trimmed) {
    return null
  }

  const { unquoted, wasQuoted } = stripMatchingQuotes(trimmed)
  const normalized = unquoted.trim()

  if (!normalized) {
    return null
  }

  if (isWindowsAbsolute(normalized)) {
    if (!wasQuoted && /\s/.test(normalized)) {
      return null
    }
    return normalized
  }

  if (!wasQuoted && containsUnescapedWhitespace(normalized)) {
    return null
  }

  const unescaped = unescapeBackslashes(normalized).trim()
  if (!unescaped) {
    return null
  }

  return isPosixAbsolute(unescaped) ? unescaped : null
}

export const isCommandInput = (
  input: string,
  existsSync: (candidate: string) => boolean,
): boolean => {
  const sanitizedInput = stripTerminalPasteArtifacts(input)
  const trimmedStart = sanitizedInput.trimStart()
  if (!trimmedStart.startsWith('/')) {
    return false
  }

  if (trimmedStart === '/') {
    return true
  }

  const absoluteCandidate = parseAbsolutePathFromInput(trimmedStart)
  if (!absoluteCandidate) {
    return true
  }

  const hasNestedSegment = absoluteCandidate.length > 1 && absoluteCandidate.slice(1).includes('/')

  if (hasNestedSegment) {
    return false
  }

  return !existsSync(absoluteCandidate)
}

const stripMatchingQuotes = (value: string): { unquoted: string; wasQuoted: boolean } => {
  if (value.length < 2) {
    return { unquoted: value, wasQuoted: false }
  }

  const first = value[0]
  const last = value[value.length - 1]
  const isQuote = first === '"' || first === "'"

  if (!isQuote || first !== last) {
    return { unquoted: value, wasQuoted: false }
  }

  return { unquoted: value.slice(1, -1), wasQuoted: true }
}

const containsUnescapedWhitespace = (value: string): boolean => {
  let escaping = false
  for (const ch of value) {
    if (escaping) {
      escaping = false
      continue
    }
    if (ch === '\\') {
      escaping = true
      continue
    }
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      return true
    }
  }
  return false
}

const unescapeBackslashes = (value: string): string => {
  let result = ''
  let escaping = false

  for (const ch of value) {
    if (escaping) {
      result += ch
      escaping = false
      continue
    }

    if (ch === '\\') {
      escaping = true
      continue
    }

    result += ch
  }

  if (escaping) {
    result += '\\'
  }

  return result
}

const isPosixAbsolute = (value: string): boolean => value.startsWith('/')

const isWindowsAbsolute = (value: string): boolean => /^[a-zA-Z]:[\\/]/.test(value)
