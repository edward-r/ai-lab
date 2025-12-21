import type { ModelOption } from './types'

const DEFAULT_FILTER_LIMIT = 200

export const resolveModelPopupQuery = (query: string, debouncedQuery: string): string => {
  return query.trim() ? debouncedQuery : ''
}

const normalizeQueryTokens = (query: string): string[] =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0)

type SubsequenceMatch = {
  start: number
  end: number
  gaps: number
}

const matchSubsequence = (needle: string, haystack: string): SubsequenceMatch | null => {
  if (!needle) {
    return { start: 0, end: 0, gaps: 0 }
  }

  let needleIndex = 0
  let start = -1
  let lastMatch = -1
  let gaps = 0

  for (let haystackIndex = 0; haystackIndex < haystack.length; haystackIndex += 1) {
    if (haystack.charAt(haystackIndex) !== needle.charAt(needleIndex)) {
      continue
    }

    if (needleIndex === 0) {
      start = haystackIndex
    } else {
      gaps += Math.max(0, haystackIndex - lastMatch - 1)
    }

    lastMatch = haystackIndex
    needleIndex += 1

    if (needleIndex >= needle.length) {
      return { start, end: haystackIndex, gaps }
    }
  }

  return null
}

const scoreSubsequenceMatch = (needle: string, match: SubsequenceMatch): number => {
  const span = match.end - match.start + 1
  const density = needle.length / Math.max(span, 1)
  const densityBoost = Math.min(30, Math.round(density * 30))
  const startBoost = Math.max(0, 10 - match.start)
  const gapPenalty = Math.min(20, match.gaps)
  return 40 + densityBoost + startBoost - gapPenalty
}

const scoreModelToken = (token: string, option: ModelOption): number | null => {
  const normalized = token.trim().toLowerCase()
  if (!normalized) {
    return 0
  }

  const id = option.id.toLowerCase()
  const label = option.label.toLowerCase()
  const provider = option.provider.toLowerCase()
  const description = option.description.toLowerCase()
  const capabilities = option.capabilities.join(' ').toLowerCase()
  const notes = option.notes?.toLowerCase() ?? ''

  if (id === normalized) {
    return 200
  }

  if (id.startsWith(normalized)) {
    return 165
  }

  if (label.startsWith(normalized)) {
    return 155
  }

  if (provider.startsWith(normalized)) {
    return 145
  }

  if (id.includes(normalized)) {
    return 125
  }

  if (label.includes(normalized)) {
    return 115
  }

  if (description.includes(normalized)) {
    return 85
  }

  if (capabilities.includes(normalized)) {
    return 75
  }

  if (notes.includes(normalized)) {
    return 65
  }

  const idMatch = matchSubsequence(normalized, id)
  if (idMatch) {
    return scoreSubsequenceMatch(normalized, idMatch) + 55
  }

  const labelMatch = matchSubsequence(normalized, label)
  if (labelMatch) {
    return scoreSubsequenceMatch(normalized, labelMatch) + 45
  }

  return null
}

export const filterModelOptions = (
  query: string,
  options: readonly ModelOption[],
  limit: number = DEFAULT_FILTER_LIMIT,
): ModelOption[] => {
  const tokens = normalizeQueryTokens(query)
  if (tokens.length === 0) {
    return [...options]
  }

  const scored: Array<{ option: ModelOption; score: number; index: number }> = []

  options.forEach((option, index) => {
    let score = 0
    for (const token of tokens) {
      const tokenScore = scoreModelToken(token, option)
      if (tokenScore === null) {
        return
      }
      score += tokenScore
    }

    scored.push({ option, score, index })
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }

    return a.index - b.index
  })

  return scored.slice(0, limit).map((entry) => entry.option)
}
