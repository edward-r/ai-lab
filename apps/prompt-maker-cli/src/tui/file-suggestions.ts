/*
 * File/directory suggestion helpers used by the Ink TUI.
 *
 * This module contains two layers:
 * 1) Discovery (IO): scan the workspace using `fast-glob`.
 * 2) Filtering (pure): rank/limit suggestions based on a user query.
 *
 * Keeping filtering logic pure makes it easy to unit test and helps ensure
 * later UI refactors don’t accidentally change suggestion behavior.
 */

import path from 'node:path'

import fg from 'fast-glob'

import { filterStringsByQuery } from './string-filter'

const FILE_SUGGESTION_PATTERNS = ['**/*']

export const FILE_SUGGESTION_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/coverage/**',
  '**/.git/**',
  '**/.nx/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/.cache/**',
  '**/build/**',
  '**/out/**',
  '**/package-lock.json',
  '**/pnpm-lock.yaml',
  '**/yarn.lock',
]

const DEFAULT_FILE_SUGGESTION_LIMIT = 200

const normalizeToPosix = (value: string): string => value.split(path.sep).join('/')

const toDisplayPath = (cwd: string, candidatePath: string): string | null => {
  const absolutePath = path.isAbsolute(candidatePath)
    ? candidatePath
    : path.resolve(cwd, candidatePath)
  const relative = path.relative(cwd, absolutePath)
  if (!relative || relative.startsWith('..')) {
    return null
  }
  return normalizeToPosix(relative)
}

export type DiscoverFileSuggestionsOptions = {
  cwd?: string
  limit?: number
}

export const discoverFileSuggestions = async (
  options: DiscoverFileSuggestionsOptions = {},
): Promise<string[]> => {
  const cwd = options.cwd ?? process.cwd()
  const limit = options.limit ?? DEFAULT_FILE_SUGGESTION_LIMIT

  const matches = await fg(FILE_SUGGESTION_PATTERNS, {
    cwd,
    dot: true,
    absolute: true,
    onlyFiles: true,
    unique: true,
    suppressErrors: true,
    followSymbolicLinks: false,
    ignore: FILE_SUGGESTION_IGNORE_PATTERNS,
  })

  const unique = new Set<string>()
  for (const match of matches) {
    const displayPath = toDisplayPath(cwd, match)
    if (!displayPath) {
      continue
    }
    unique.add(displayPath)
  }

  return [...unique].sort().slice(0, limit)
}

export type DiscoverDirectorySuggestionsOptions = {
  cwd?: string
  limit?: number
}

export const discoverDirectorySuggestions = async (
  options: DiscoverDirectorySuggestionsOptions = {},
): Promise<string[]> => {
  const cwd = options.cwd ?? process.cwd()
  const limit = options.limit ?? DEFAULT_FILE_SUGGESTION_LIMIT

  const matches = await fg(FILE_SUGGESTION_PATTERNS, {
    cwd,
    dot: true,
    absolute: true,
    onlyDirectories: true,
    unique: true,
    suppressErrors: true,
    followSymbolicLinks: false,
    ignore: FILE_SUGGESTION_IGNORE_PATTERNS,
  })

  const unique = new Set<string>()
  for (const match of matches) {
    const displayPath = toDisplayPath(cwd, match)
    if (!displayPath) {
      continue
    }
    unique.add(displayPath)
  }

  return [...unique].sort().slice(0, limit)
}

const INTENT_FILE_SUGGESTION_PATTERNS = ['**/*.{md,markdown,txt}']

export type DiscoverIntentFileSuggestionsOptions = {
  cwd?: string
  limit?: number
}

export const discoverIntentFileSuggestions = async (
  options: DiscoverIntentFileSuggestionsOptions = {},
): Promise<string[]> => {
  const cwd = options.cwd ?? process.cwd()
  const limit = options.limit ?? DEFAULT_FILE_SUGGESTION_LIMIT

  const matches = await fg(INTENT_FILE_SUGGESTION_PATTERNS, {
    cwd,
    dot: true,
    absolute: true,
    onlyFiles: true,
    unique: true,
    suppressErrors: true,
    followSymbolicLinks: false,
    ignore: FILE_SUGGESTION_IGNORE_PATTERNS,
  })

  const unique = new Set<string>()
  for (const match of matches) {
    const displayPath = toDisplayPath(cwd, match)
    if (!displayPath) {
      continue
    }
    unique.add(displayPath)
  }

  return [...unique].sort().slice(0, limit)
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

const scoreIntentToken = (token: string, suggestion: string): number | null => {
  const normalized = token.trim().toLowerCase()
  if (!normalized) {
    return 0
  }

  const candidate = suggestion.toLowerCase()
  const baseName = candidate.split('/').pop() ?? candidate

  if (baseName.startsWith(normalized)) {
    return 100
  }

  if (candidate.startsWith(normalized)) {
    return 95
  }

  if (baseName.includes(normalized)) {
    return 80
  }

  if (candidate.includes(normalized)) {
    return 70
  }

  const baseNameMatch = matchSubsequence(normalized, baseName)
  if (baseNameMatch) {
    return scoreSubsequenceMatch(normalized, baseNameMatch)
  }

  const candidateMatch = matchSubsequence(normalized, candidate)
  if (candidateMatch) {
    return Math.max(20, scoreSubsequenceMatch(normalized, candidateMatch) - 10)
  }

  return null
}

export type FilterIntentFileSuggestionsOptions = {
  suggestions: readonly string[]
  query: string
  exclude?: readonly string[]
  limit?: number
}

export const filterIntentFileSuggestions = ({
  suggestions,
  query,
  exclude = [],
  limit = DEFAULT_FILE_SUGGESTION_LIMIT,
}: FilterIntentFileSuggestionsOptions): string[] => {
  const tokens = normalizeQueryTokens(query)
  const excluded = new Set(exclude)

  if (tokens.length === 0) {
    return suggestions.filter((suggestion) => !excluded.has(suggestion)).slice(0, limit)
  }

  const scored: Array<{ suggestion: string; score: number; index: number }> = []

  suggestions.forEach((suggestion, index) => {
    if (excluded.has(suggestion)) {
      return
    }

    let score = 0
    for (const token of tokens) {
      const tokenScore = scoreIntentToken(token, suggestion)
      if (tokenScore === null) {
        return
      }
      score += tokenScore
    }

    scored.push({ suggestion, score, index })
  })

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      return a.index - b.index
    })
    .map((entry) => entry.suggestion)
    .slice(0, limit)
}

export type FilterFileSuggestionsOptions = {
  suggestions: readonly string[]
  query: string
  exclude?: readonly string[]
  limit?: number
}

export const filterFileSuggestions = ({
  suggestions,
  query,
  exclude = [],
  limit = DEFAULT_FILE_SUGGESTION_LIMIT,
}: FilterFileSuggestionsOptions): string[] => {
  // Filtering itself is pure and shared; this wrapper handles
  // per-call concerns like exclusion and limiting.
  const excluded = new Set(exclude)
  const eligible = suggestions.filter((suggestion) => !excluded.has(suggestion))

  return filterStringsByQuery(eligible, query).slice(0, limit)
}

export type FilterDirectorySuggestionsOptions = FilterFileSuggestionsOptions

export const filterDirectorySuggestions = (options: FilterDirectorySuggestionsOptions): string[] =>
  filterFileSuggestions(options)
