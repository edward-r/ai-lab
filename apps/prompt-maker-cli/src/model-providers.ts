export type ModelProvider = 'openai' | 'gemini' | 'other'

export type ModelDefinition = {
  id: string
  label?: string
  provider?: ModelProvider
  description?: string
  capabilities?: string[]
  notes?: string
  default?: boolean
}

export const MODEL_PROVIDER_LABELS: Record<ModelProvider, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  other: 'Custom',
}

const GEMINI_MODEL_PREFIXES = ['gemini', 'gemma']
const OPENAI_MODEL_PREFIXES = ['gpt', 'o', 'chatgpt', 'text-davinci']

const normalizeModelId = (modelId: string): string => modelId.trim().toLowerCase()

export const isGeminiModelId = (modelId: string): boolean => {
  const normalized = normalizeModelId(modelId)
  return GEMINI_MODEL_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}

const isOpenAiModelId = (modelId: string): boolean => {
  const normalized = normalizeModelId(modelId)
  return OPENAI_MODEL_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}

export const inferProviderFromModelId = (modelId: string): ModelProvider => {
  if (!modelId.trim()) {
    return 'other'
  }
  if (isGeminiModelId(modelId)) {
    return 'gemini'
  }
  if (isOpenAiModelId(modelId)) {
    return 'openai'
  }
  return 'other'
}
