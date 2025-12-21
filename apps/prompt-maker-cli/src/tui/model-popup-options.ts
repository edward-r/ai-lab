import type { ModelProvider } from '../model-providers'

import { filterModelOptions } from './model-filter'
import type { ModelOption } from './types'

export type ModelPopupOptionsResult = {
  options: ModelOption[]
  recentCount: number
}

type BuildModelPopupOptionsParams = {
  query: string
  modelOptions: readonly ModelOption[]
  recentModelIds?: readonly string[]
}

const PROVIDER_ORDER: readonly ModelProvider[] = ['openai', 'gemini', 'other']

const resolveRecentOptions = (
  modelOptions: readonly ModelOption[],
  recentModelIds: readonly string[],
): ModelOption[] => {
  if (recentModelIds.length === 0) {
    return []
  }

  const byId = new Map(modelOptions.map((option) => [option.id, option]))
  const resolved: ModelOption[] = []

  for (const modelId of recentModelIds) {
    const option = byId.get(modelId)
    if (option) {
      resolved.push(option)
    }
  }

  return resolved
}

const groupByProvider = (options: readonly ModelOption[]): ModelOption[] => {
  const grouped: ModelOption[] = []

  for (const provider of PROVIDER_ORDER) {
    for (const option of options) {
      if (option.provider === provider) {
        grouped.push(option)
      }
    }
  }

  const groupedIds = new Set(grouped.map((option) => option.id))
  for (const option of options) {
    if (!groupedIds.has(option.id)) {
      grouped.push(option)
    }
  }

  return grouped
}

export const buildModelPopupOptions = ({
  query,
  modelOptions,
  recentModelIds = [],
}: BuildModelPopupOptionsParams): ModelPopupOptionsResult => {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    const recentOptions = resolveRecentOptions(modelOptions, recentModelIds)
    const recentIds = new Set(recentOptions.map((option) => option.id))
    const remaining = modelOptions.filter((option) => !recentIds.has(option.id))

    const groupedRemaining = groupByProvider(remaining)
    return { options: [...recentOptions, ...groupedRemaining], recentCount: recentOptions.length }
  }

  const filtered = filterModelOptions(trimmedQuery, modelOptions)
  return { options: groupByProvider(filtered), recentCount: 0 }
}
