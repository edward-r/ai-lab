import { loadCliConfig, resolveGeminiCredentials, resolveOpenAiCredentials } from '../config'
import type { ModelDefinition } from '../model-providers'
import { inferProviderFromModelId } from '../model-providers'
import { getAvailableModels } from '../utils/model-manager'
import type { ModelOption } from './types'

const DEFAULT_MODEL_FALLBACK = 'gpt-4o-mini'

const BUILT_IN_MODEL_DEFINITIONS: ModelDefinition[] = [
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast, general-purpose GPT-4o variant.',
    capabilities: ['fast', 'economical', 'general-purpose'],
    notes: 'Great default for day-to-day prompts.',
    default: true,
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    description: 'Flagship GPT-4 omni model.',
    capabilities: ['multimodal', 'high-quality'],
    notes: 'Use when quality matters more than speed.',
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    provider: 'openai',
    description: 'Reasoning-optimized GPT-4 family model.',
    capabilities: ['reasoning', 'multimodal'],
    notes: 'Best for planning and structured tasks.',
  },
  {
    id: 'gpt-5.2',
    label: 'GPT-5.2',
    provider: 'openai',
    description: 'Next-gen GPT model with advanced reasoning.',
    capabilities: ['reasoning', 'multimodal', 'long-context'],
    notes: 'Use when you need top-tier quality and depth.',
  },
  {
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    provider: 'gemini',
    description: 'Google Gemini multimodal model with long context.',
    capabilities: ['multimodal', 'long-context'],
    notes: 'Required for video uploads or giant contexts.',
  },
  {
    id: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    provider: 'gemini',
    description: 'Lower-latency Gemini model.',
    capabilities: ['fast', 'multimodal'],
    notes: 'Use for chatty flows that still need multimodal.',
  },
  {
    id: 'gemini-3-pro-preview',
    label: 'Gemini 3 Pro (Preview)',
    provider: 'gemini',
    description: 'Latest Gemini 3 preview model.',
    capabilities: ['multimodal', 'reasoning', 'preview'],
    notes: 'Preview tier—expect rapid changes.',
  },
]

const cloneOption = (option: ModelOption): ModelOption => ({
  ...option,
  capabilities: [...option.capabilities],
})

const normalizeModelDefinition = (
  definition: ModelDefinition,
  source: ModelOption['source'],
): ModelOption => {
  const provider = definition.provider ?? inferProviderFromModelId(definition.id)
  const label = definition.label?.trim() || definition.id
  const description = definition.description?.trim() || `${label} (${provider})`
  const capabilities = definition.capabilities?.map((cap) => cap.trim()).filter(Boolean) ?? []
  const normalized: ModelOption = {
    id: definition.id,
    label,
    provider,
    description,
    capabilities,
    source,
  }
  if (definition.default) {
    normalized.default = true
  }
  if (definition.notes?.trim()) {
    normalized.notes = definition.notes.trim()
  }
  return normalized
}

const BUILT_IN_MODEL_OPTIONS = BUILT_IN_MODEL_DEFINITIONS.map((definition) =>
  normalizeModelDefinition(definition, 'builtin'),
)

let cachedModelOptions: ModelOption[] | null = null
let cachedWarning: string | null = null

let cachedModelOptionsNoDiscovery: ModelOption[] | null = null
let cachedWarningNoDiscovery: string | null = null

const mergeModelOptions = (base: ModelOption[], overrides: ModelOption[]): ModelOption[] => {
  const merged = new Map<string, ModelOption>()
  base.forEach((option) => merged.set(option.id, option))
  overrides.forEach((option) => merged.set(option.id, option))
  return Array.from(merged.values())
}

export const getBuiltInModelOptions = (): ModelOption[] => BUILT_IN_MODEL_OPTIONS.map(cloneOption)

export type LoadModelOptionsResult = {
  options: ModelOption[]
  warning?: string
}

export type LoadModelOptionsOptions = {
  includeDiscovered?: boolean
}

export const loadModelOptions = async (
  options: LoadModelOptionsOptions = {},
): Promise<LoadModelOptionsResult> => {
  const includeDiscovered = options.includeDiscovered !== false
  const cached = includeDiscovered ? cachedModelOptions : cachedModelOptionsNoDiscovery
  const warning = includeDiscovered ? cachedWarning : cachedWarningNoDiscovery

  if (cached) {
    const warningResult = warning
      ? { options: cached.map(cloneOption), warning }
      : { options: cached.map(cloneOption) }
    return warningResult
  }

  try {
    const config = await loadCliConfig()
    const extraDefinitions = config?.promptGenerator?.models ?? []
    const normalizedExtras = extraDefinitions.map((definition) =>
      normalizeModelDefinition(definition, 'config'),
    )

    const reservedIds = new Set(
      [...BUILT_IN_MODEL_OPTIONS, ...normalizedExtras].map((option) => option.id),
    )

    let discoveredOptions: ModelOption[] = []
    if (includeDiscovered) {
      try {
        const [openAiCredentials, geminiCredentials] = await Promise.all([
          resolveOpenAiCredentials().catch(() => null),
          resolveGeminiCredentials().catch(() => null),
        ])

        const discovered = await getAvailableModels(
          openAiCredentials?.apiKey,
          geminiCredentials?.apiKey,
          {
            ...(openAiCredentials?.baseUrl ? { openAiBaseUrl: openAiCredentials.baseUrl } : {}),
            ...(geminiCredentials?.baseUrl ? { geminiBaseUrl: geminiCredentials.baseUrl } : {}),
            ...(process.env.OPENAI_ORG_ID?.trim()
              ? { openAiOrganizationId: process.env.OPENAI_ORG_ID.trim() }
              : {}),
            ...(process.env.OPENAI_PROJECT_ID?.trim()
              ? { openAiProjectId: process.env.OPENAI_PROJECT_ID.trim() }
              : {}),
          },
        )

        const discoveredIds = [...discovered.openai, ...discovered.gemini].filter(
          (modelId) => !reservedIds.has(modelId),
        )

        discoveredOptions = discoveredIds.map((modelId) =>
          normalizeModelDefinition({ id: modelId }, 'discovered'),
        )
      } catch {
        // Best-effort; dynamic discovery should never block model selection.
      }
    }

    const merged = mergeModelOptions(BUILT_IN_MODEL_OPTIONS, [
      ...normalizedExtras,
      ...discoveredOptions,
    ])

    if (includeDiscovered) {
      cachedModelOptions = merged
      cachedWarning = null
    } else {
      cachedModelOptionsNoDiscovery = merged
      cachedWarningNoDiscovery = null
    }

    return { options: merged.map(cloneOption) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown CLI config error.'
    const fallbackOptions = BUILT_IN_MODEL_OPTIONS
    const fallbackWarning = `Failed to load CLI model entries: ${message}`

    if (includeDiscovered) {
      cachedModelOptions = fallbackOptions
      cachedWarning = fallbackWarning
    } else {
      cachedModelOptionsNoDiscovery = fallbackOptions
      cachedWarningNoDiscovery = fallbackWarning
    }

    return { options: fallbackOptions.map(cloneOption), warning: fallbackWarning }
  }
}

export const getPreferredModelId = (
  options: ModelOption[],
  requestedId?: string | null,
): string => {
  if (requestedId) {
    const requested = options.find((option) => option.id === requestedId)
    if (requested) {
      return requested.id
    }
  }
  const defaultOption = options.find((option) => option.default)
  if (defaultOption) {
    return defaultOption.id
  }
  return options[0]?.id ?? DEFAULT_MODEL_FALLBACK
}

export const DEFAULT_MODEL_ID = DEFAULT_MODEL_FALLBACK
