import type { ModelOption } from './types'

const DEFAULT_FILTER_LIMIT = 200

export const resolveModelPopupQuery = (query: string, debouncedQuery: string): string => {
  return query.trim() ? debouncedQuery : ''
}

export const filterModelOptions = (
  query: string,
  options: readonly ModelOption[],
  limit: number = DEFAULT_FILTER_LIMIT,
): ModelOption[] => {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) {
    return [...options]
  }

  const matches: ModelOption[] = []
  for (const option of options) {
    const haystacks = [
      option.id.toLowerCase(),
      option.label.toLowerCase(),
      option.provider,
      option.description.toLowerCase(),
      option.capabilities.join(' ').toLowerCase(),
      option.notes?.toLowerCase() ?? '',
    ]

    if (haystacks.some((value) => value.includes(trimmed))) {
      matches.push(option)
      if (matches.length >= limit) {
        break
      }
    }
  }

  return matches
}
