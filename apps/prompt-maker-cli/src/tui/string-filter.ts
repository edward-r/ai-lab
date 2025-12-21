/*
 * String filtering primitives for the Ink TUI.
 *
 * Why this exists:
 * - We do a lot of “suggestion list” filtering (files, directories, etc.).
 * - Keeping the filtering algorithm in one place makes later refactors safer.
 *
 * Design goals:
 * - Pure: no filesystem/Ink/React dependencies.
 * - Stable ordering: results preserve original ordering within each match group.
 * - Behavior-preserving: matches the existing UX used by `filterFileSuggestions`.
 */

const normalize = (value: string): string => value.trim().toLowerCase()

const isPrefixMatch = (candidate: string, query: string): boolean =>
  query.length > 0 && candidate.startsWith(query)

const isSubstringMatch = (candidate: string, query: string): boolean =>
  query.length > 0 && candidate.includes(query)

export const filterStringsByQuery = (items: readonly string[], query: string): string[] => {
  const normalizedQuery = normalize(query)

  // When the query is blank, return items unchanged.
  // This is important because other code relies on this being stable.
  if (!normalizedQuery) {
    return [...items]
  }

  // UX detail: prefix matches feel “more correct” than substring matches.
  // We keep the original ordering inside each group to avoid jitter.
  const prefixMatches: string[] = []
  const substringMatches: string[] = []

  for (const item of items) {
    const candidate = item.toLowerCase()

    if (isPrefixMatch(candidate, normalizedQuery)) {
      prefixMatches.push(item)
      continue
    }

    if (isSubstringMatch(candidate, normalizedQuery)) {
      substringMatches.push(item)
    }
  }

  return [...prefixMatches, ...substringMatches]
}
