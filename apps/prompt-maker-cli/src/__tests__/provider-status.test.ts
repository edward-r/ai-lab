const mockResolveOpenAiCredentials = jest.fn()
const mockResolveGeminiCredentials = jest.fn()

jest.mock('../config', () => ({
  resolveOpenAiCredentials: mockResolveOpenAiCredentials,
  resolveGeminiCredentials: mockResolveGeminiCredentials,
}))

describe('provider-status utility', () => {
  beforeEach(() => {
    jest.resetModules()
    mockResolveOpenAiCredentials.mockReset()
    mockResolveGeminiCredentials.mockReset()
  })

  it('returns ok status when credentials resolve', async () => {
    mockResolveOpenAiCredentials.mockResolvedValue({ apiKey: 'ok' })
    const { checkProviderStatus, invalidateProviderStatus } = await import('../tui/provider-status')
    invalidateProviderStatus()
    const status = await checkProviderStatus('openai')
    expect(status).toEqual({ provider: 'openai', status: 'ok', message: 'Credentials available' })
  })

  it('returns missing status when credentials are absent', async () => {
    mockResolveGeminiCredentials.mockRejectedValue(new Error('Missing GEMINI_API_KEY'))
    const { checkProviderStatus, invalidateProviderStatus } = await import('../tui/provider-status')
    invalidateProviderStatus('gemini')
    const status = await checkProviderStatus('gemini')
    expect(status.status).toBe('missing')
    expect(status.message).toContain('Missing GEMINI_API_KEY')
  })

  it('caches provider lookups', async () => {
    mockResolveOpenAiCredentials.mockResolvedValue({ apiKey: 'cached' })
    const { checkProviderStatus, invalidateProviderStatus } = await import('../tui/provider-status')
    invalidateProviderStatus('openai')
    await checkProviderStatus('openai')
    await checkProviderStatus('openai')
    expect(mockResolveOpenAiCredentials).toHaveBeenCalledTimes(1)
  })
})
