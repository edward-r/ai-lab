import type { PastedSnippet } from '../../../paste-snippet'

type PasteTokenMap = ReadonlyMap<string, PastedSnippet>

type MutablePasteTokenMap = Map<string, PastedSnippet>

const tokensForValue = (value: string, tokens: PasteTokenMap): Set<string> => {
  return new Set(Array.from(value).filter((token) => tokens.has(token)))
}

export const dropMissingPasteTokens = (
  previous: string,
  next: string,
  tokens: MutablePasteTokenMap,
): void => {
  if (tokens.size === 0) {
    return
  }

  const previousTokens = tokensForValue(previous, tokens)
  if (previousTokens.size === 0) {
    return
  }

  const nextTokens = tokensForValue(next, tokens)
  for (const token of previousTokens) {
    if (!nextTokens.has(token)) {
      tokens.delete(token)
    }
  }
}

export const expandPasteTokens = (value: string, tokens: PasteTokenMap): string => {
  if (tokens.size === 0) {
    return value
  }

  let expanded = ''
  for (const character of value) {
    const snippet = tokens.get(character)
    expanded += snippet ? snippet.text : character
  }
  return expanded
}
