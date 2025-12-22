/*
 * Command palette filtering.
 *
 * The CommandScreen has a command palette ("/command") with fuzzy-ish matching.
 * This file is intentionally pure so we can unit test and refactor the UI safely.
 *
 * Key UX rules (preserved by tests):
 * - Empty query returns all commands in their configured order.
 * - Matches are case-insensitive.
 * - Prefix matches (id/alias/label) are ranked above substring matches.
 * - When scores tie, original order is preserved (stable ordering).
 */

import type { CommandDescriptor } from './types'

type ScoredCommand = {
  command: CommandDescriptor
  score: number
  index: number
}

const normalizeQueryTokens = (query: string): string[] =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0)

const getCommandAliases = (command: CommandDescriptor): readonly string[] => {
  if (!('aliases' in command)) {
    return []
  }

  const aliases = command.aliases
  return Array.isArray(aliases) ? aliases : []
}

const scoreCommandToken = (token: string, command: CommandDescriptor): number | null => {
  const id = command.id.toLowerCase()
  const label = command.label.toLowerCase()
  const description = command.description.toLowerCase()
  const aliases = getCommandAliases(command).map((alias) => alias.toLowerCase())

  const combinedHaystack = `${id} ${label} ${aliases.join(' ')} ${description}`
  if (!combinedHaystack.includes(token)) {
    return null
  }

  if (id.startsWith(token)) {
    return 100
  }

  if (aliases.some((alias) => alias.startsWith(token))) {
    return 95
  }

  if (label.startsWith(token)) {
    return 90
  }

  if (id.includes(token)) {
    return 80
  }

  if (aliases.some((alias) => alias.includes(token))) {
    return 75
  }

  if (label.includes(token)) {
    return 70
  }

  return 60
}

const scoreCommand = (tokens: readonly string[], command: CommandDescriptor): number | null => {
  if (tokens.length === 0) {
    return 0
  }

  let score = 0
  for (const token of tokens) {
    const tokenScore = scoreCommandToken(token, command)
    if (tokenScore === null) {
      return null
    }
    score += tokenScore
  }

  return score
}

export type FilterCommandDescriptorsOptions = {
  query: string
  commands: readonly CommandDescriptor[]
}

export const filterCommandDescriptors = ({
  query,
  commands,
}: FilterCommandDescriptorsOptions): CommandDescriptor[] => {
  const tokens = normalizeQueryTokens(query)
  if (tokens.length === 0) {
    return [...commands]
  }

  const scored: ScoredCommand[] = []
  commands.forEach((command, index) => {
    const score = scoreCommand(tokens, command)
    if (score === null) {
      return
    }
    scored.push({ command, score, index })
  })

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      return a.index - b.index
    })
    .map((entry) => entry.command)
}

const matchesCommandPrefixToken = (token: string, command: CommandDescriptor): boolean => {
  if (!token) {
    return false
  }

  const normalized = token.toLowerCase()
  if (command.id.toLowerCase().startsWith(normalized)) {
    return true
  }

  if (command.label.toLowerCase().startsWith(normalized)) {
    return true
  }

  return getCommandAliases(command).some((alias) => alias.toLowerCase().startsWith(normalized))
}

export type HasCommandDescriptorPrefixMatchOptions = {
  token: string
  commands: readonly CommandDescriptor[]
}

export const hasCommandDescriptorPrefixMatch = ({
  token,
  commands,
}: HasCommandDescriptorPrefixMatchOptions): boolean => {
  const normalized = token.trim().toLowerCase()
  if (!normalized) {
    return false
  }

  return commands.some((command) => matchesCommandPrefixToken(normalized, command))
}

export type CommandMenuSearchState = {
  filterQuery: string
  treatRemainderAsArgs: boolean
}

export type ResolveCommandMenuSearchStateOptions = {
  commandQuery: string
  commands: readonly CommandDescriptor[]
}

export const resolveCommandMenuSearchState = ({
  commandQuery,
  commands,
}: ResolveCommandMenuSearchStateOptions): CommandMenuSearchState => {
  const normalized = commandQuery.trim().toLowerCase()
  if (!normalized) {
    return { filterQuery: '', treatRemainderAsArgs: false }
  }

  const parts = normalized.split(/\s+/).filter((part) => part.length > 0)
  const firstToken = parts[0] ?? ''

  const treatRemainderAsArgs = hasCommandDescriptorPrefixMatch({ token: firstToken, commands })

  return {
    filterQuery: treatRemainderAsArgs ? firstToken : normalized,
    treatRemainderAsArgs,
  }
}
