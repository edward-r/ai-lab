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

  it('routes GPT-5 reasoning models to OpenAI Responses API', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: 'responses text' }),
    })

    const result = await callLLM(
      [
        { role: 'system', content: 'rules' },
        { role: 'user', content: 'Hi' },
      ],
      'gpt-5.2-pro',
    )

    expect(result).toBe('responses text')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/responses'),
      expect.objectContaining({ method: 'POST' }),
    )

    const [, options] = fetchMock.mock.calls[0]
    const body = JSON.parse((options as { body: string }).body)
    expect(body).toMatchObject({
      model: 'gpt-5.2-pro',
      input: [
        { role: 'developer', content: 'rules' },
        { role: 'user', content: 'Hi' },
      ],
    })
    expect(body.temperature).toBeUndefined()
  })

  it('retries via Responses API when Chat endpoint rejects model', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          'The model `gpt-5.2-pro-chat` does not support the /v1/chat/completions endpoint. Please use /v1/responses.',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output_text: 'retried text' }),
      })

    const result = await callLLM([{ role: 'user', content: 'Hello' }], 'gpt-5.2-pro-chat')
    expect(result).toBe('retried text')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toEqual(expect.stringContaining('/chat/completions'))
    expect(fetchMock.mock.calls[1][0]).toEqual(expect.stringContaining('/responses'))

    const [, secondOptions] = fetchMock.mock.calls[1]
    const secondBody = JSON.parse((secondOptions as { body: string }).body)
    expect(secondBody).toMatchObject({
      model: 'gpt-5.2-pro-chat',
      input: [{ role: 'user', content: 'Hello' }],
    })
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
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/chat/completions'),
      expect.objectContaining({ method: 'POST' }),
    )
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
