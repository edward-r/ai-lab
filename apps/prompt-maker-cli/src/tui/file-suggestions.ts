import path from 'node:path'

import fg from 'fast-glob'

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
  const trimmedQuery = query.trim().toLowerCase()
  const excluded = new Set(exclude)

  const prefixMatches: string[] = []
  const substringMatches: string[] = []

  for (const suggestion of suggestions) {
    if (excluded.has(suggestion)) {
      continue
    }
    if (!trimmedQuery) {
      prefixMatches.push(suggestion)
      continue
    }
    const candidate = suggestion.toLowerCase()
    if (candidate.startsWith(trimmedQuery)) {
      prefixMatches.push(suggestion)
      continue
    }
    if (candidate.includes(trimmedQuery)) {
      substringMatches.push(suggestion)
    }
  }

  return [...prefixMatches, ...substringMatches].slice(0, limit)
}

export type FilterDirectorySuggestionsOptions = FilterFileSuggestionsOptions

export const filterDirectorySuggestions = (options: FilterDirectorySuggestionsOptions): string[] =>
  filterFileSuggestions(options)
