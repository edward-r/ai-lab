import { resolveFileContext, formatContextForPrompt } from '../file-context'
import fg from 'fast-glob'

jest.mock('fast-glob')
const globMock = fg as unknown as jest.MockedFunction<typeof fg>
jest.mock('node:fs/promises', () => ({ readFile: jest.fn() }))

const fs = jest.requireMock('node:fs/promises') as { readFile: jest.Mock }

describe('file-context', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns empty array when patterns list is empty', async () => {
    const result = await resolveFileContext([])
    expect(result).toEqual([])
    expect(fg).not.toHaveBeenCalled()
  })

  it('resolves matching files into FileContext entries', async () => {
    globMock.mockResolvedValue(['a.txt', 'b.txt'])
    fs.readFile.mockResolvedValueOnce('alpha').mockResolvedValueOnce('beta')

    const result = await resolveFileContext(['*.txt'])
    expect(result).toEqual([
      { path: 'a.txt', content: 'alpha' },
      { path: 'b.txt', content: 'beta' },
    ])
  })

  it('warns and returns [] when no files matched', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    globMock.mockResolvedValue([])
    const result = await resolveFileContext(['none.txt'])
    expect(result).toEqual([])
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('No files matched the context patterns'),
    )
    warn.mockRestore()
  })

  it('skips files that fail to read', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    globMock.mockResolvedValue(['ok.txt', 'bad.txt'])
    fs.readFile.mockResolvedValueOnce('good').mockRejectedValueOnce(new Error('boom'))
    const result = await resolveFileContext(['*.txt'])
    expect(result).toEqual([{ path: 'ok.txt', content: 'good' }])
    expect(warn).toHaveBeenCalledWith('Warning: Failed to read context file bad.txt')
    warn.mockRestore()
  })

  it('formats context with XML-like wrappers', () => {
    const text = formatContextForPrompt([
      { path: 'src/a.ts', content: 'const a = 1' },
      { path: 'src/b.ts', content: 'const b = 2' },
    ])
    expect(text).toContain('<file path="src/a.ts">')
    expect(text).toContain('</file>\n\n<file path="src/b.ts">')
  })

  it('returns empty string when no files provided to formatter', () => {
    expect(formatContextForPrompt([])).toBe('')
  })
})
