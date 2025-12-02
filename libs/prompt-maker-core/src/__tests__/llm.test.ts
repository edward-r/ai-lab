/// <reference types="jest" />

import { callLLM, getEmbedding, type Message } from '../lib/llm'

declare const global: typeof globalThis & { fetch: jest.Mock }

describe('prompt-maker-core llm wrapper', () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock
    process.env.OPENAI_API_KEY = 'openai-key'
    process.env.GEMINI_API_KEY = 'gemini-key'
    process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1'
    process.env.GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com'
  })

  it('routes callLLM through OpenAI by default', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'result text' } }] }),
    })
    const result = await callLLM([{ role: 'user', content: 'Hello' }])
    expect(result).toBe('result text')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/chat/completions'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws when OpenAI API key is missing', async () => {
    delete process.env.OPENAI_API_KEY
    await expect(callLLM([{ role: 'user', content: 'Hi' }], 'gpt-4o')).rejects.toThrow(
      'OPENAI_API_KEY env var is not set.',
    )
  })

  it('supports OpenAI array content responses', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: [
                { type: 'text', text: 'first' },
                { type: 'text', text: 'second' },
              ],
            },
          },
        ],
      }),
    })
    const result = await callLLM([{ role: 'user', content: 'Hello' }], 'gpt-4o')
    expect(result).toBe('firstsecond')
  })

  it('routes Gemini models to Gemini endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'gemini result' }] } }] }),
    })
    const result = await callLLM([{ role: 'user', content: 'Hi' }], 'gemini-1.5-pro')
    expect(result).toBe('gemini result')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('gemini-1.5-pro:generateContent'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws when Gemini API key missing', async () => {
    delete process.env.GEMINI_API_KEY
    await expect(callLLM([{ role: 'user', content: 'Hi' }], 'gemini-1.5-pro')).rejects.toThrow(
      'GEMINI_API_KEY env var is not set.',
    )
  })

  it('includes systemInstruction for Gemini payloads', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'gemini result' }] } }] }),
    })
    await callLLM(
      [
        { role: 'system', content: 'rules' },
        { role: 'user', content: 'Do work' },
      ],
      'gemini-1.5-pro',
    )
    const [, options] = fetchMock.mock.calls[0]
    const body = JSON.parse((options as { body: string }).body)
    expect(body.systemInstruction.parts[0]).toEqual({ text: 'rules' })
  })

  it('callLLM rejects OpenAI video inputs', async () => {
    await expect(
      callLLM(
        [
          {
            role: 'user',
            content: [{ type: 'video_uri', mimeType: 'video/mp4', fileUri: 'gs://video' }],
          } as Message,
        ],
        'gpt-4o',
      ),
    ).rejects.toThrow('Video inputs are only supported when using Gemini models.')
  })

  it('getEmbedding uses OpenAI by default', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1, 0.2] }] }),
    })
    const vector = await getEmbedding('text to embed')
    expect(vector).toEqual([0.1, 0.2])
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/embeddings'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('getEmbedding routes to Gemini models when requested', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { value: [0.9, 0.8] } }),
    })
    const vector = await getEmbedding('embed me', 'text-embedding-004')
    expect(vector).toEqual([0.9, 0.8])
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(':embedContent'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('getEmbedding rejects empty input', async () => {
    await expect(getEmbedding('  ')).rejects.toThrow('Text to embed must not be empty.')
  })
})
