import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export type ProviderModelLists = {
  openai: string[]
  gemini: string[]
}

export type ModelCache = {
  timestamp: number
  models: ProviderModelLists
}

export type GetAvailableModelsOptions = {
  cacheFilePath?: string
  now?: number
  fetchImpl?: typeof fetch
  openAiBaseUrl?: string
  geminiBaseUrl?: string
  openAiOrganizationId?: string
  openAiProjectId?: string
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export const DEFAULT_MODEL_CACHE_FILE = path.join(
  os.homedir(),
  '.config',
  'prompt-maker-cli',
  'models-cache.json',
)

// Hardcoded fallbacks in case of network failure / first run offline.
export const FALLBACK_MODELS: ProviderModelLists = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest'],
}

type OpenAiModelListResponse = {
  data: Array<{ id: string }>
}

type GeminiModelListResponse = {
  models: Array<{
    name: string
    supportedGenerationMethods?: string[]
  }>
}

const normalizeModelId = (value: string): string => value.trim()

const normalizeModelList = (models: readonly string[]): string[] => {
  const unique = new Set(models.map(normalizeModelId).filter(Boolean))
  return Array.from(unique).sort((a, b) => a.localeCompare(b))
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isOpenAiModelListResponse = (value: unknown): value is OpenAiModelListResponse => {
  if (!isRecord(value)) {
    return false
  }
  const data = value.data
  if (!Array.isArray(data)) {
    return false
  }
  return data.every((entry) => isRecord(entry) && typeof entry.id === 'string')
}

const isGeminiModelListResponse = (value: unknown): value is GeminiModelListResponse => {
  if (!isRecord(value)) {
    return false
  }
  const models = value.models
  if (!Array.isArray(models)) {
    return false
  }
  return models.every(
    (entry) =>
      isRecord(entry) &&
      typeof entry.name === 'string' &&
      (entry.supportedGenerationMethods === undefined ||
        (Array.isArray(entry.supportedGenerationMethods) &&
          entry.supportedGenerationMethods.every((method) => typeof method === 'string'))),
  )
}

const buildOpenAiModelsUrl = (baseUrl?: string): string => {
  const normalized = baseUrl?.trim().replace(/\/$/, '')
  if (!normalized) {
    return 'https://api.openai.com/v1/models'
  }
  if (normalized.endsWith('/v1')) {
    return `${normalized}/models`
  }
  return `${normalized}/v1/models`
}

const buildGeminiModelsUrl = (baseUrl?: string, apiKey?: string): string => {
  const normalized = baseUrl?.trim().replace(/\/$/, '')
  const root = normalized || 'https://generativelanguage.googleapis.com'
  const key = apiKey?.trim() || ''
  return `${root}/v1beta/models?key=${encodeURIComponent(key)}`
}

const fetchJson = async (
  fetchImpl: typeof fetch,
  url: string,
  init?: RequestInit,
): Promise<unknown> => {
  const response = await fetchImpl(url, init)
  if (!response.ok) {
    throw new Error(`Fetch failed (${response.status}): ${response.statusText}`)
  }
  return (await response.json()) as unknown
}

const fetchOpenAiModels = async (
  apiKey: string | null | undefined,
  options: {
    fetchImpl: typeof fetch
    baseUrl?: string
    organizationId?: string
    projectId?: string
  },
): Promise<string[]> => {
  const trimmedKey = apiKey?.trim()
  if (!trimmedKey) {
    return []
  }

  const url = buildOpenAiModelsUrl(options.baseUrl)
  const headers: Record<string, string> = { Authorization: `Bearer ${trimmedKey}` }
  if (options.organizationId?.trim()) {
    headers['OpenAI-Organization'] = options.organizationId.trim()
  }
  if (options.projectId?.trim()) {
    headers['OpenAI-Project'] = options.projectId.trim()
  }

  const data = await fetchJson(options.fetchImpl, url, {
    headers,
  })

  if (!isOpenAiModelListResponse(data)) {
    throw new Error('OpenAI models response had unexpected shape.')
  }

  return data.data
    .map((entry) => entry.id)
    .filter((id) => {
      const normalized = id.toLowerCase()
      return (
        normalized.startsWith('gpt') ||
        normalized.startsWith('o') ||
        normalized.startsWith('chatgpt')
      )
    })
}

const fetchGeminiModels = async (
  apiKey: string | null | undefined,
  options: {
    fetchImpl: typeof fetch
    baseUrl?: string
  },
): Promise<string[]> => {
  const trimmedKey = apiKey?.trim()
  if (!trimmedKey) {
    return []
  }

  const url = buildGeminiModelsUrl(options.baseUrl, trimmedKey)
  const data = await fetchJson(options.fetchImpl, url)

  if (!isGeminiModelListResponse(data)) {
    throw new Error('Gemini models response had unexpected shape.')
  }

  return data.models
    .filter((entry) => entry.supportedGenerationMethods?.includes('generateContent'))
    .map((entry) => entry.name.replace(/^models\//, ''))
}

const readCacheFile = async (cacheFilePath: string): Promise<ModelCache | null> => {
  try {
    const raw = await fs.readFile(cacheFilePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) {
      return null
    }
    const timestamp = parsed.timestamp
    const models = parsed.models
    if (typeof timestamp !== 'number' || !isRecord(models)) {
      return null
    }
    const openai = models.openai
    const gemini = models.gemini
    if (!Array.isArray(openai) || !Array.isArray(gemini)) {
      return null
    }
    if (
      !openai.every((id) => typeof id === 'string') ||
      !gemini.every((id) => typeof id === 'string')
    ) {
      return null
    }
    return {
      timestamp,
      models: {
        openai: normalizeModelList(openai),
        gemini: normalizeModelList(gemini),
      },
    }
  } catch {
    return null
  }
}

const writeCacheFile = async (
  cacheFilePath: string,
  models: ProviderModelLists,
  now: number,
): Promise<void> => {
  await fs.mkdir(path.dirname(cacheFilePath), { recursive: true })
  const payload: ModelCache = { timestamp: now, models }
  await fs.writeFile(cacheFilePath, JSON.stringify(payload, null, 2), 'utf8')
}

export const getAvailableModels = async (
  openAiKey?: string | null,
  geminiKey?: string | null,
  options: GetAvailableModelsOptions = {},
): Promise<ProviderModelLists> => {
  const cacheFilePath = options.cacheFilePath ?? DEFAULT_MODEL_CACHE_FILE
  const now = options.now ?? Date.now()

  const cached = await readCacheFile(cacheFilePath)
  if (cached) {
    const age = now - cached.timestamp
    if (age >= 0 && age < ONE_DAY_MS) {
      return cached.models
    }

    const canRefresh = Boolean(openAiKey?.trim() || geminiKey?.trim())
    if (!canRefresh) {
      return cached.models
    }
  } else {
    const canRefresh = Boolean(openAiKey?.trim() || geminiKey?.trim())
    if (!canRefresh) {
      return FALLBACK_MODELS
    }
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (!fetchImpl) {
    return cached?.models ?? FALLBACK_MODELS
  }

  let openai: string[] = []
  let gemini: string[] = []

  try {
    const results = await Promise.allSettled([
      fetchOpenAiModels(openAiKey, {
        fetchImpl,
        ...(options.openAiBaseUrl ? { baseUrl: options.openAiBaseUrl } : {}),
        ...(options.openAiOrganizationId ? { organizationId: options.openAiOrganizationId } : {}),
        ...(options.openAiProjectId ? { projectId: options.openAiProjectId } : {}),
      }),
      fetchGeminiModels(geminiKey, {
        fetchImpl,
        ...(options.geminiBaseUrl ? { baseUrl: options.geminiBaseUrl } : {}),
      }),
    ])

    const openAiResult = results[0]
    if (openAiResult.status === 'fulfilled') {
      openai = openAiResult.value
    } else {
      console.error('Failed to fetch OpenAI models', openAiResult.reason)
    }

    const geminiResult = results[1]
    if (geminiResult.status === 'fulfilled') {
      gemini = geminiResult.value
    } else {
      console.error('Failed to fetch Gemini models', geminiResult.reason)
    }
  } catch (error) {
    console.error('Failed to refresh model cache', error)
  }

  const result: ProviderModelLists = {
    openai: normalizeModelList(openai.length > 0 ? openai : FALLBACK_MODELS.openai),
    gemini: normalizeModelList(gemini.length > 0 ? gemini : FALLBACK_MODELS.gemini),
  }

  try {
    await writeCacheFile(cacheFilePath, result, now)
  } catch (error) {
    console.error('Failed to write model cache', error)
  }

  return result
}
