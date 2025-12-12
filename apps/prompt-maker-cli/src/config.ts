import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { ModelDefinition, ModelProvider } from './model-providers'

export type PromptGeneratorConfig = {
  defaultModel?: string
  defaultGeminiModel?: string
  models?: ModelDefinition[]
}

export type PromptMakerCliConfig = {
  openaiApiKey?: string
  openaiBaseUrl?: string
  geminiApiKey?: string
  geminiBaseUrl?: string
  promptGenerator?: PromptGeneratorConfig
  contextTemplates?: Record<string, string>
}

let cachedConfig: PromptMakerCliConfig | null | undefined

const getCandidateConfigPaths = (): string[] => {
  const explicit = process.env.PROMPT_MAKER_CLI_CONFIG?.trim()
  const home = os.homedir()
  const defaults = [
    path.join(home, '.config', 'prompt-maker-cli', 'config.json'),
    path.join(home, '.prompt-maker-cli.json'),
  ]

  return [explicit, ...defaults].filter((value): value is string => Boolean(value))
}

export const loadCliConfig = async (): Promise<PromptMakerCliConfig | null> => {
  if (cachedConfig !== undefined) {
    return cachedConfig
  }

  for (const filePath of getCandidateConfigPaths()) {
    try {
      const contents = await fs.readFile(filePath, 'utf8')
      const parsed = JSON.parse(contents) as unknown
      const config = parseConfig(parsed)
      cachedConfig = config
      return config
    } catch (error) {
      if (isFileMissingError(error)) {
        continue
      }

      const message = error instanceof Error ? error.message : 'Unknown config error.'
      throw new Error(`Failed to load config at ${filePath}: ${message}`)
    }
  }

  cachedConfig = null
  return null
}

export const resolveOpenAiCredentials = async (): Promise<{
  apiKey: string
  baseUrl?: string
}> => {
  const envKey = process.env.OPENAI_API_KEY?.trim()
  const envBaseUrl = process.env.OPENAI_BASE_URL?.trim()

  if (envKey) {
    const credentials: { apiKey: string; baseUrl?: string } = { apiKey: envKey }
    if (envBaseUrl) {
      credentials.baseUrl = envBaseUrl
    }
    return credentials
  }

  const config = await loadCliConfig()
  const apiKey = config?.openaiApiKey?.trim()

  if (apiKey) {
    const baseUrl = config?.openaiBaseUrl?.trim()
    const credentials: { apiKey: string; baseUrl?: string } = { apiKey }
    if (baseUrl) {
      credentials.baseUrl = baseUrl
    }
    return credentials
  }

  throw new Error(
    'Missing OpenAI credentials. Set OPENAI_API_KEY or add "openaiApiKey" to ~/.config/prompt-maker-cli/config.json.',
  )
}

export const resolveGeminiCredentials = async (): Promise<{
  apiKey: string
  baseUrl?: string
}> => {
  const envKey = process.env.GEMINI_API_KEY?.trim()
  const envBaseUrl = process.env.GEMINI_BASE_URL?.trim()

  if (envKey) {
    const credentials: { apiKey: string; baseUrl?: string } = { apiKey: envKey }
    if (envBaseUrl) {
      credentials.baseUrl = envBaseUrl
    }
    return credentials
  }

  const config = await loadCliConfig()
  const apiKey = config?.geminiApiKey?.trim()

  if (apiKey) {
    const baseUrl = config?.geminiBaseUrl?.trim()
    const credentials: { apiKey: string; baseUrl?: string } = { apiKey }
    if (baseUrl) {
      credentials.baseUrl = baseUrl
    }
    return credentials
  }

  throw new Error(
    'Missing Gemini credentials. Set GEMINI_API_KEY or add "geminiApiKey" to ~/.config/prompt-maker-cli/config.json.',
  )
}

const parseConfig = (raw: unknown): PromptMakerCliConfig => {
  if (!isRecord(raw)) {
    throw new Error('CLI config must be a JSON object.')
  }

  const config: PromptMakerCliConfig = {}

  if (raw.openaiApiKey !== undefined) {
    config.openaiApiKey = expectString(raw.openaiApiKey, 'openaiApiKey')
  }

  if (raw.openaiBaseUrl !== undefined) {
    config.openaiBaseUrl = expectString(raw.openaiBaseUrl, 'openaiBaseUrl')
  }

  if (raw.geminiApiKey !== undefined) {
    config.geminiApiKey = expectString(raw.geminiApiKey, 'geminiApiKey')
  }

  if (raw.geminiBaseUrl !== undefined) {
    config.geminiBaseUrl = expectString(raw.geminiBaseUrl, 'geminiBaseUrl')
  }

  if (raw.promptGenerator !== undefined) {
    if (!isRecord(raw.promptGenerator)) {
      throw new Error('"promptGenerator" must be an object if provided.')
    }

    const promptGenerator: PromptGeneratorConfig = {}
    if (raw.promptGenerator.defaultModel !== undefined) {
      promptGenerator.defaultModel = expectString(
        raw.promptGenerator.defaultModel,
        'promptGenerator.defaultModel',
      )
    }
    if (raw.promptGenerator.defaultGeminiModel !== undefined) {
      promptGenerator.defaultGeminiModel = expectString(
        raw.promptGenerator.defaultGeminiModel,
        'promptGenerator.defaultGeminiModel',
      )
    }
    if (raw.promptGenerator.models !== undefined) {
      promptGenerator.models = parsePromptGeneratorModels(raw.promptGenerator.models)
    }
    config.promptGenerator = promptGenerator
  }

  if (raw.contextTemplates !== undefined) {
    if (!isRecord(raw.contextTemplates)) {
      throw new Error('"contextTemplates" must be an object if provided.')
    }
    const templates: Record<string, string> = {}
    for (const [key, value] of Object.entries(raw.contextTemplates)) {
      templates[key] = expectString(value, `contextTemplates.${key}`)
    }
    config.contextTemplates = templates
  }

  return config
}

const parsePromptGeneratorModels = (value: unknown): ModelDefinition[] => {
  if (!Array.isArray(value)) {
    throw new Error('"promptGenerator.models" must be an array when provided.')
  }
  return value.map((entry, index) => parsePromptGeneratorModel(entry, index))
}

const parsePromptGeneratorModel = (value: unknown, index: number): ModelDefinition => {
  if (!isRecord(value)) {
    throw new Error(`promptGenerator.models[${index}] must be an object.`)
  }
  const id = expectString(value.id, `promptGenerator.models[${index}].id`).trim()
  if (!id) {
    throw new Error(`promptGenerator.models[${index}].id must not be empty.`)
  }
  const model: ModelDefinition = { id }
  if (value.label !== undefined) {
    const label = expectString(value.label, `promptGenerator.models[${index}].label`).trim()
    if (label) {
      model.label = label
    }
  }
  if (value.provider !== undefined) {
    model.provider = expectProvider(value.provider, `promptGenerator.models[${index}].provider`)
  }
  if (value.description !== undefined) {
    const description = expectString(
      value.description,
      `promptGenerator.models[${index}].description`,
    ).trim()
    if (description) {
      model.description = description
    }
  }
  if (value.notes !== undefined) {
    const notes = expectString(value.notes, `promptGenerator.models[${index}].notes`).trim()
    if (notes) {
      model.notes = notes
    }
  }
  if (value.capabilities !== undefined) {
    const capabilities = parseCapabilitiesField(
      value.capabilities,
      `promptGenerator.models[${index}].capabilities`,
    )
    if (capabilities.length > 0) {
      model.capabilities = capabilities
    }
  }
  if (value.default !== undefined) {
    model.default = expectBoolean(value.default, `promptGenerator.models[${index}].default`)
  }
  return model
}

const parseCapabilitiesField = (value: unknown, label: string): string[] => {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized ? [normalized] : []
  }
  if (Array.isArray(value)) {
    return value
      .map((entry, idx) => expectString(entry, `${label}[${idx}]`).trim())
      .filter((entry) => entry.length > 0)
  }
  throw new Error(`${label} must be a string or array of strings.`)
}

const expectBoolean = (value: unknown, label: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean.`)
  }
  return value
}

const expectProvider = (value: unknown, label: string): ModelProvider => {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be one of openai, gemini, or other.`)
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === 'openai' || normalized === 'gemini' || normalized === 'other') {
    return normalized as ModelProvider
  }
  throw new Error(`${label} must be one of openai, gemini, or other.`)
}

const expectString = (value: unknown, label: string): string => {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string.`)
  }
  return value
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasErrnoCode = (value: unknown): value is { code: string } =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  typeof (value as { code: unknown }).code === 'string'

const isFileMissingError = (error: unknown): boolean =>
  hasErrnoCode(error) && error.code === 'ENOENT'
