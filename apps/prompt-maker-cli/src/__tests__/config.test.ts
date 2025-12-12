import type { PromptMakerCliConfig } from '../config'

jest.mock('node:os', () => ({ homedir: jest.fn(() => '/home/tester') }))
jest.mock('node:fs/promises', () => ({ readFile: jest.fn() }))

const getFsMock = () =>
  jest.requireMock('node:fs/promises') as {
    readFile: jest.MockedFunction<(file: string, encoding: string) => Promise<string>>
  }

type ConfigModule = typeof import('../config')

const importConfigModule = async (): Promise<ConfigModule> => {
  jest.resetModules()
  return await import('../config')
}

const mockConfigJson = (config: PromptMakerCliConfig): string => JSON.stringify(config)

describe('config module', () => {
  beforeEach(() => {
    delete process.env.PROMPT_MAKER_CLI_CONFIG
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_BASE_URL
    delete process.env.GEMINI_API_KEY
    delete process.env.GEMINI_BASE_URL
  })

  it('loads config from explicit PROMPT_MAKER_CLI_CONFIG path', async () => {
    process.env.PROMPT_MAKER_CLI_CONFIG = '/tmp/custom.json'
    const { loadCliConfig } = await importConfigModule()
    const fs = getFsMock()
    fs.readFile.mockReset()
    fs.readFile.mockResolvedValueOnce(
      mockConfigJson({ promptGenerator: { defaultModel: 'gpt-4o' } }),
    )
    const config = await loadCliConfig()
    expect(fs.readFile).toHaveBeenCalledWith('/tmp/custom.json', 'utf8')
    expect(config?.promptGenerator?.defaultModel).toBe('gpt-4o')
  })

  it('falls back through default locations while skipping missing files', async () => {
    const enoent = Object.assign(new Error('missing'), { code: 'ENOENT' })
    const { loadCliConfig } = await importConfigModule()
    const fs = getFsMock()
    fs.readFile.mockReset()
    fs.readFile
      .mockRejectedValueOnce(enoent)
      .mockResolvedValueOnce(mockConfigJson({ openaiApiKey: 'conf-key' }))
    const config = await loadCliConfig()
    expect(fs.readFile).toHaveBeenCalledTimes(2)
    expect(config?.openaiApiKey).toBe('conf-key')
  })

  it('caches the parsed config after the first load', async () => {
    const { loadCliConfig } = await importConfigModule()
    const fs = getFsMock()
    fs.readFile.mockReset()
    fs.readFile.mockResolvedValueOnce(mockConfigJson({ openaiApiKey: 'cached' }))
    await loadCliConfig()
    await loadCliConfig()
    expect(fs.readFile).toHaveBeenCalledTimes(1)
  })

  it('throws a descriptive error for malformed JSON', async () => {
    const { loadCliConfig } = await importConfigModule()
    const fs = getFsMock()
    fs.readFile.mockReset()
    fs.readFile.mockResolvedValueOnce('not-json')
    await expect(loadCliConfig()).rejects.toThrow(/Failed to load config.*Unexpected token/)
  })

  it('resolveOpenAiCredentials prefers env variables', async () => {
    process.env.OPENAI_API_KEY = 'env-key'
    process.env.OPENAI_BASE_URL = 'https://api.example'
    const { resolveOpenAiCredentials } = await importConfigModule()
    const creds = await resolveOpenAiCredentials()
    expect(creds.apiKey).toBe('env-key')
    expect(creds.baseUrl).toBe('https://api.example')
  })

  it('resolveOpenAiCredentials falls back to config when env absent', async () => {
    const { resolveOpenAiCredentials } = await importConfigModule()
    const fs = getFsMock()
    fs.readFile.mockReset()
    fs.readFile.mockResolvedValueOnce(
      mockConfigJson({ openaiApiKey: 'file-key', openaiBaseUrl: 'https://conf' }),
    )
    const creds = await resolveOpenAiCredentials()
    expect(creds.apiKey).toBe('file-key')
    expect(creds.baseUrl).toBe('https://conf')
  })

  it('resolveOpenAiCredentials throws when no credentials available', async () => {
    const enoent = Object.assign(new Error('missing'), { code: 'ENOENT' })
    const { resolveOpenAiCredentials } = await importConfigModule()
    const fs = getFsMock()
    fs.readFile.mockReset()
    fs.readFile.mockRejectedValue(enoent)
    await expect(resolveOpenAiCredentials()).rejects.toThrow(/Missing OpenAI credentials/)
  })

  it('resolveGeminiCredentials uses env first', async () => {
    process.env.GEMINI_API_KEY = 'env-gem'
    process.env.GEMINI_BASE_URL = 'https://gem'
    const { resolveGeminiCredentials } = await importConfigModule()
    const creds = await resolveGeminiCredentials()
    expect(creds).toEqual({ apiKey: 'env-gem', baseUrl: 'https://gem' })
  })

  it('resolveGeminiCredentials uses config fallback', async () => {
    const { resolveGeminiCredentials } = await importConfigModule()
    const fs = getFsMock()
    fs.readFile.mockReset()
    fs.readFile.mockResolvedValueOnce(
      mockConfigJson({ geminiApiKey: 'file-gem', geminiBaseUrl: 'https://gemini.local' }),
    )
    const creds = await resolveGeminiCredentials()
    expect(creds).toEqual({ apiKey: 'file-gem', baseUrl: 'https://gemini.local' })
  })

  it('resolveGeminiCredentials throws when unresolved', async () => {
    const enoent = Object.assign(new Error('missing'), { code: 'ENOENT' })
    const { resolveGeminiCredentials } = await importConfigModule()
    const fs = getFsMock()
    fs.readFile.mockReset()
    fs.readFile.mockRejectedValue(enoent)
    await expect(resolveGeminiCredentials()).rejects.toThrow(/Missing Gemini credentials/)
  })

  it('parses promptGenerator.models entries when provided', async () => {
    const { loadCliConfig } = await importConfigModule()
    const fs = getFsMock()
    fs.readFile.mockReset()
    fs.readFile.mockResolvedValueOnce(
      JSON.stringify({
        promptGenerator: {
          models: [
            {
              id: 'custom-model',
              label: 'Custom Model',
              provider: 'gemini',
              capabilities: 'multimodal',
              notes: 'Use for long context',
              default: true,
            },
          ],
        },
      }),
    )
    const config = await loadCliConfig()
    expect(config?.promptGenerator?.models).toEqual([
      {
        id: 'custom-model',
        label: 'Custom Model',
        provider: 'gemini',
        capabilities: ['multimodal'],
        notes: 'Use for long context',
        default: true,
      },
    ])
  })

  it('throws when promptGenerator.models is not an array', async () => {
    const { loadCliConfig } = await importConfigModule()
    const fs = getFsMock()
    fs.readFile.mockReset()
    fs.readFile.mockResolvedValueOnce(
      JSON.stringify({ promptGenerator: { models: { id: 'bad' } } }),
    )
    await expect(loadCliConfig()).rejects.toThrow(/"promptGenerator\.models" must be an array/)
  })
})
