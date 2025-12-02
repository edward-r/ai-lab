import path from 'node:path'

import fg from 'fast-glob'

import { resolveSmartContextFiles } from '../smart-context-service'

jest.mock('fast-glob')
jest.mock('node:fs/promises', () => ({
  stat: jest.fn(),
  readFile: jest.fn(),
}))
jest.mock('../rag/vector-store', () => ({
  indexFiles: jest.fn(),
  search: jest.fn(),
}))

const globMock = fg as unknown as jest.MockedFunction<typeof fg>
const fs = jest.requireMock('node:fs/promises') as { stat: jest.Mock; readFile: jest.Mock }
const vectorStore = jest.requireMock('../rag/vector-store') as {
  indexFiles: jest.Mock
  search: jest.Mock
}

describe('smart-context-service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    globMock.mockResolvedValue([])
    fs.stat.mockResolvedValue({ size: 1000 })
    fs.readFile.mockResolvedValue('contents')
    vectorStore.search.mockResolvedValue([])
  })

  it('returns empty array when no files match glob patterns', async () => {
    const onProgress = jest.fn()
    const result = await resolveSmartContextFiles('intent', [], onProgress)
    expect(result).toEqual([])
    expect(onProgress).toHaveBeenCalledWith('No smart context files found')
  })

  it('filters by size, indexes, searches, and returns new files', async () => {
    globMock.mockResolvedValue(['/repo/a.md', '/repo/b.md'])
    vectorStore.search.mockResolvedValue(['/repo/a.md', '/repo/b.md'])
    const result = await resolveSmartContextFiles(
      'intent',
      [{ path: '/repo/a.md', content: '' }],
      undefined,
    )
    expect(vectorStore.indexFiles).toHaveBeenCalledWith(['/repo/a.md', '/repo/b.md'])
    expect(result).toEqual([{ path: '/repo/b.md', content: 'contents' }])
  })

  it('scans the provided smart context root when supplied', async () => {
    globMock.mockResolvedValue([])
    await resolveSmartContextFiles('intent', [], undefined, './packages')
    expect(globMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ cwd: path.resolve('./packages') }),
    )
  })

  it('logs warning and returns [] when indexing fails', async () => {
    globMock.mockResolvedValue(['/repo/a.md'])
    vectorStore.indexFiles.mockRejectedValue(new Error('fail'))
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const result = await resolveSmartContextFiles('intent', [], undefined)
    expect(result).toEqual([])
    expect(warn).toHaveBeenCalledWith('Smart context indexing failed: fail')
    warn.mockRestore()
  })

  it('skips files that fail to read while still returning others', async () => {
    globMock.mockResolvedValue(['/repo/a.md', '/repo/b.md'])
    vectorStore.indexFiles.mockResolvedValue(undefined)
    vectorStore.search.mockResolvedValue(['/repo/a.md', '/repo/b.md'])
    fs.readFile.mockResolvedValueOnce('content-a').mockRejectedValueOnce(new Error('nope'))
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const result = await resolveSmartContextFiles('intent', [], undefined)
    expect(result).toEqual([{ path: '/repo/a.md', content: 'content-a' }])
    expect(warn).toHaveBeenCalledWith('Warning: Failed to read smart context file /repo/b.md: nope')
    warn.mockRestore()
  })
})
