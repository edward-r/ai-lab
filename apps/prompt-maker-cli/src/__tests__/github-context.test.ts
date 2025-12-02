import { resolveGithubUrl } from '../github-context'

describe('resolveGithubUrl', () => {
  const originalFetch = global.fetch
  const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('fetches blob URLs via raw content', async () => {
    mockFetch.mockResolvedValueOnce(createBufferResponse(Buffer.from('console.log("hi")')))

    const files = await resolveGithubUrl(
      new URL('https://github.com/org/repo/blob/main/src/index.ts'),
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('raw.githubusercontent.com'),
      expect.any(Object),
    )
    expect(files).toEqual([
      {
        path: 'github:org/repo/src/index.ts',
        content: 'console.log("hi")',
      },
    ])
  })

  it('fetches tree URLs and filters ignored files', async () => {
    mockFetch.mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/git/trees/HEAD')) {
        return createJsonResponse({
          tree: [
            { path: 'README.md', type: 'blob', size: 1000 },
            { path: 'node_modules/pkg/index.js', type: 'blob', size: 10 },
            { path: 'src/app.ts', type: 'blob', size: 500 },
          ],
        })
      }
      if (url.includes('/contents/README.md')) {
        return createJsonResponse({
          content: Buffer.from('# Readme').toString('base64'),
          encoding: 'base64',
        })
      }
      if (url.includes('/contents/src/app.ts')) {
        return createJsonResponse({
          content: Buffer.from('export const hi = true').toString('base64'),
          encoding: 'base64',
        })
      }
      throw new Error(`Unexpected fetch ${url}`)
    })

    const files = await resolveGithubUrl(new URL('https://github.com/org/repo'))

    expect(files).toEqual([
      { path: 'github:org/repo/README.md', content: '# Readme' },
      { path: 'github:org/repo/src/app.ts', content: 'export const hi = true' },
    ])
  })
})

const createBufferResponse = (buffer: Buffer, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    arrayBuffer: async () => buffer,
  }) as unknown as Response

const createJsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  }) as unknown as Response
