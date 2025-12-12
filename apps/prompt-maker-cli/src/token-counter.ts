import { getEncoding, type Tiktoken } from 'js-tiktoken'

let encoder: Tiktoken | null = null

const getEncoder = (): Tiktoken => {
  if (!encoder) {
    encoder = getEncoding('cl100k_base')
  }
  return encoder
}

export const countTokens = (text: string): number => {
  if (!text) return 0
  try {
    return getEncoder().encode(text).length
  } catch {
    console.warn('Token counting failed, defaulting to character heuristic.')
    return Math.ceil(text.length / 4)
  }
}

export const formatTokenCount = (count: number): string => {
  const formatted = new Intl.NumberFormat().format(count)

  if (count > 100000) return `⚠️ ${formatted} tokens (High)`
  if (count > 30000) return `${formatted} tokens (Medium)`
  return `${formatted} tokens`
}
