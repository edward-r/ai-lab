const mockLoadCliConfig = jest.fn()

jest.mock('../config', () => ({
  loadCliConfig: mockLoadCliConfig,
}))

describe('model-options helper', () => {
  beforeEach(() => {
    jest.resetModules()
    mockLoadCliConfig.mockReset()
  })

  it('merges config-defined models with built-ins', async () => {
    mockLoadCliConfig.mockResolvedValue({
      promptGenerator: {
        models: [
          { id: 'custom-model', label: 'Custom', provider: 'openai', capabilities: ['fast'] },
          { id: 'gpt-4o-mini', notes: 'override builtin description' },
        ],
      },
    })
    const module = await import('../tui/model-options')
    const result = await module.loadModelOptions()
    const custom = result.options.find((option) => option.id === 'custom-model')
    expect(custom).toBeDefined()
    expect(custom?.source).toBe('config')
    expect(custom?.capabilities).toContain('fast')
    const overridden = result.options.find((option) => option.id === 'gpt-4o-mini')
    expect(overridden?.notes).toBe('override builtin description')
  })

  it('falls back to built-ins when config load fails', async () => {
    mockLoadCliConfig.mockRejectedValue(new Error('bad config'))
    const module = await import('../tui/model-options')
    const result = await module.loadModelOptions()
    expect(result.warning).toMatch(/Failed to load CLI model entries/)
    expect(result.options.length).toBeGreaterThan(0)
  })

  it('selects preferred model id with fallback logic', async () => {
    mockLoadCliConfig.mockResolvedValue({ promptGenerator: { models: [] } })
    const module = await import('../tui/model-options')
    const builtIns = module.getBuiltInModelOptions()
    const requested = module.getPreferredModelId(builtIns, 'does-not-exist')
    expect(builtIns.map((option) => option.id)).toContain(requested)
  })
})
