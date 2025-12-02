describe('token-counter', () => {
  afterEach(() => {
    jest.resetModules()
  })

  it('counts tokens using the encoder path when available', async () => {
    const module = await import('../token-counter')
    const tokens = module.countTokens('abcd')
    expect(tokens).toBeGreaterThan(0)
  })

  it('falls back to heuristic when encoder fails', async () => {
    jest.doMock('js-tiktoken', () => ({
      getEncoding: () => ({
        encode: () => {
          throw new Error('boom')
        },
      }),
    }))
    const module = await import('../token-counter')
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(module.countTokens('abcd')).toBe(Math.ceil('abcd'.length / 4))
    expect(warn).toHaveBeenCalledWith('Token counting failed, defaulting to character heuristic.')
    warn.mockRestore()
  })

  it('formats token counts with severity tiers', async () => {
    const module = await import('../token-counter')
    expect(module.formatTokenCount(120000)).toBe('⚠️ 120,000 tokens (High)')
    expect(module.formatTokenCount(40000)).toBe('40,000 tokens (Medium)')
    expect(module.formatTokenCount(100)).toBe('100 tokens')
  })
})
