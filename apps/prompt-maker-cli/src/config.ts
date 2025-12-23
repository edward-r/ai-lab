import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { ModelDefinition, ModelProvider } from './model-providers'
import type { ThemeMode } from './tui/theme/theme-types'

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

  // TUI theme settings (persisted).
  theme?: string
  themeMode?: ThemeMode
}

let cachedConfig: PromptMakerCliConfig | null | undefined
let cachedConfigPath: string | null | undefined

const getCandidateConfigPaths = (): string[] => {
  const explicit = process.env.PROMPT_MAKER_CLI_CONFIG?.trim()
  const home = os.homedir()
  const defaults = [
    path.join(home, '.config', 'prompt-maker-cli', 'config.json'),
    path.join(home, '.prompt-maker-cli.json'),
  ]

  return [explicit, ...defaults].filter((value): value is string => Boolean(value))
}

const getDefaultConfigPath = (): string => {
  const home = os.homedir()
  return path.join(home, '.config', 'prompt-maker-cli', 'config.json')
}

const resolveConfigPathForWrite = async (): Promise<string> => {
  const explicit = process.env.PROMPT_MAKER_CLI_CONFIG?.trim()
  if (explicit) {
    return explicit
  }

  if (cachedConfigPath) {
    return cachedConfigPath
  }

  for (const candidate of getCandidateConfigPaths()) {
    try {
      await fs.stat(candidate)
      return candidate
    } catch (error) {
      if (isFileMissingError(error)) {
        continue
      }
      const message = error instanceof Error ? error.message : 'Unknown config error.'
      throw new Error(`Failed to access config at ${candidate}: ${message}`)
    }
  }

  return getDefaultConfigPath()
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
      cachedConfigPath = filePath
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
  cachedConfigPath = null
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

export type ThemeSettingsPatch = {
  theme?: string | null
  themeMode?: ThemeMode | null
}

export const updateCliThemeSettings = async (
  patch: ThemeSettingsPatch,
  options?: { configPath?: string },
): Promise<void> => {
  const configPath = options?.configPath ?? (await resolveConfigPathForWrite())
  const directory = path.dirname(configPath)
  await fs.mkdir(directory, { recursive: true })

  let raw: unknown = {}
  try {
    const contents = await fs.readFile(configPath, 'utf8')
    raw = JSON.parse(contents) as unknown
  } catch (error) {
    if (!isFileMissingError(error)) {
      const message = error instanceof Error ? error.message : 'Unknown config error.'
      throw new Error(`Failed to read config at ${configPath}: ${message}`)
    }
  }

  if (!isRecord(raw)) {
    throw new Error(`Failed to update config at ${configPath}: root must be a JSON object.`)
  }

  const next: Record<string, unknown> = { ...raw }

  if ('theme' in patch) {
    if (patch.theme === null || patch.theme === undefined || patch.theme.trim() === '') {
      delete next.theme
    } else {
      next.theme = patch.theme.trim()
    }
  }

  if ('themeMode' in patch) {
    if (patch.themeMode === null || patch.themeMode === undefined) {
      delete next.themeMode
    } else {
      next.themeMode = patch.themeMode
    }
  }

  const contents = JSON.stringify(next, null, 2)
  const tempFile = `${configPath}.${process.pid}.tmp`
  await fs.writeFile(tempFile, `${contents}\n`, 'utf8')

  try {
    await fs.rename(tempFile, configPath)
  } catch {
    await fs.writeFile(configPath, `${contents}\n`, 'utf8')
  }

  cachedConfig = parseConfig(next)
  cachedConfigPath = configPath
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

  if (raw.theme !== undefined) {
    const theme = expectString(raw.theme, 'theme').trim()
    if (theme) {
      config.theme = theme
    }
  }

  if (raw.themeMode !== undefined) {
    config.themeMode = expectThemeMode(raw.themeMode, 'themeMode')
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

const expectThemeMode = (value: unknown, label: string): ThemeMode => {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be one of light, dark, system, or auto.`)
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === 'auto') {
    return 'system'
  }
  if (normalized === 'light' || normalized === 'dark' || normalized === 'system') {
    return normalized as ThemeMode
  }
  throw new Error(`${label} must be one of light, dark, system, or auto.`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasErrnoCode(value: unknown): value is { code: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as { code: unknown }).code === 'string'
  )
}

function isFileMissingError(error: unknown): boolean {
  return hasErrnoCode(error) && error.code === 'ENOENT'
}
