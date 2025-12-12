import { resolveUrlContext } from '../url-context'
import { resolveGithubUrl } from '../github-context'

jest.mock('../github-context', () => ({
  resolveGithubUrl: jest.fn().mockResolvedValue([]),
}))

describe('resolveUrlContext', () => {
  const originalFetch = global.fetch
  const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('returns text content for generic HTML pages', async () => {
    const html = '<html><body><h1>Title</h1><p>Paragraph</p></body></html>'
    mockFetch.mockResolvedValueOnce(createBufferResponse(Buffer.from(html)))

    const results = await resolveUrlContext(['https://example.com/page'])

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/page', expect.any(Object))
    expect(results).toHaveLength(1)
    const file = results[0]
    if (!file) {
      throw new Error('Expected resolveUrlContext to return one file')
    }
    expect(file.path).toBe('url:https://example.com/page')
    expect(file.content.toLowerCase()).toContain('title')
    expect(file.content).toContain('Paragraph')
  })

  it('deduplicates URLs and warns on invalid entries', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const html = '<html><body>Doc</body></html>'
    mockFetch.mockResolvedValue(createBufferResponse(Buffer.from(html)))

    const results = await resolveUrlContext([
      '',
      'notaurl',
      'https://example.com',
      'https://example.com',
    ])

    expect(results).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('delegates GitHub URLs to the GitHub resolver', async () => {
    const githubResult = [{ path: 'github:owner/repo/file.ts', content: 'code' }]
    ;(resolveGithubUrl as jest.Mock).mockResolvedValueOnce(githubResult)

    const results = await resolveUrlContext(['https://github.com/owner/repo'])

    expect(resolveGithubUrl).toHaveBeenCalledWith(
      expect.objectContaining({ href: 'https://github.com/owner/repo' }),
      undefined,
    )
    expect(results).toEqual(githubResult)
  })
})

const createBufferResponse = (buffer: Buffer, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-length': buffer.byteLength.toString() }),
    arrayBuffer: async () => buffer,
  }) as unknown as Response
