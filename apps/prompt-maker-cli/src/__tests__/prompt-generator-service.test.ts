import { callLLM } from '@prompt-maker/core'

import {
  PromptGeneratorService,
  resolveDefaultGenerateModel,
  ensureModelCredentials,
  isGemini,
} from '../prompt-generator-service'

jest.mock('@prompt-maker/core', () => ({ callLLM: jest.fn() }))
jest.mock('../config', () => ({
  loadCliConfig: jest.fn().mockResolvedValue({
    promptGenerator: { defaultModel: 'gpt-4o-mini', defaultGeminiModel: 'gemini-1.5-pro' },
  }),
  resolveOpenAiCredentials: jest
    .fn()
    .mockResolvedValue({ apiKey: 'OPENAI', baseUrl: 'https://openai' }),
  resolveGeminiCredentials: jest
    .fn()
    .mockResolvedValue({ apiKey: 'GEM', baseUrl: 'https://gemini' }),
}))
jest.mock('../image-loader', () => ({
  resolveImageParts: jest
    .fn()
    .mockResolvedValue([{ type: 'image', mimeType: 'image/png', data: 'aaa' }]),
}))
jest.mock('../media-loader', () => ({
  uploadFileForGemini: jest.fn().mockResolvedValue('gs://video'),
  inferVideoMimeType: jest.fn().mockReturnValue('video/mp4'),
}))

const { resolveImageParts } = jest.requireMock('../image-loader') as {
  resolveImageParts: jest.Mock
}
const mediaLoader = jest.requireMock('../media-loader') as {
  uploadFileForGemini: jest.Mock
  inferVideoMimeType: jest.Mock
}
const configModule = jest.requireMock('../config') as {
  loadCliConfig: jest.Mock
  resolveOpenAiCredentials: jest.Mock
  resolveGeminiCredentials: jest.Mock
}

const callLLMMock = callLLM as jest.MockedFunction<typeof callLLM>

describe('prompt-generator-service helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    configModule.loadCliConfig.mockResolvedValue({
      promptGenerator: { defaultModel: 'gpt-4o-mini', defaultGeminiModel: 'gemini-1.5-pro' },
    })
    configModule.resolveOpenAiCredentials.mockResolvedValue({
      apiKey: 'OPENAI',
      baseUrl: 'https://openai',
    })
    configModule.resolveGeminiCredentials.mockResolvedValue({
      apiKey: 'GEM',
      baseUrl: 'https://gemini',
    })
    resolveImageParts.mockResolvedValue([{ type: 'image', mimeType: 'image/png', data: 'aaa' }])
  })

  it('detects gemini models via isGemini', () => {
    expect(isGemini('gemini-1.5-pro')).toBe(true)
    expect(isGemini('gemma-2b')).toBe(true)
    expect(isGemini('gpt-4o-mini')).toBe(false)
  })

  it('resolveDefaultGenerateModel prefers config before env', async () => {
    process.env.PROMPT_MAKER_GENERATE_MODEL = 'env-model'
    const model = await resolveDefaultGenerateModel()
    expect(model).toBe('gpt-4o-mini')
  })

  it('ensureModelCredentials sets OpenAI env vars when missing', async () => {
    delete process.env.OPENAI_API_KEY
    await ensureModelCredentials('gpt-4o-mini')
    expect(process.env.OPENAI_API_KEY).toBe('OPENAI')
    expect(process.env.OPENAI_BASE_URL).toBe('https://openai')
  })

  it('ensureModelCredentials sets Gemini env vars when needed', async () => {
    delete process.env.GEMINI_API_KEY
    await ensureModelCredentials('gemini-1.5-pro')
    expect(process.env.GEMINI_API_KEY).toBe('GEM')
    expect(process.env.GEMINI_BASE_URL).toBe('https://gemini')
  })
})

describe('PromptGeneratorService.generatePrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    configModule.loadCliConfig.mockResolvedValue({
      promptGenerator: { defaultModel: 'gpt-4o-mini', defaultGeminiModel: 'gemini-1.5-pro' },
    })
    callLLMMock.mockResolvedValue('{"prompt":"Result","reasoning":"ok"}')
    resolveImageParts.mockResolvedValue([{ type: 'image', mimeType: 'image/png', data: 'aaa' }])
    mediaLoader.uploadFileForGemini.mockResolvedValue('gs://video')
    mediaLoader.inferVideoMimeType.mockReturnValue('video/mp4')
  })

  const buildService = async () => new PromptGeneratorService()

  it('constructs initial generation request with context and media', async () => {
    const service = await buildService()
    const prompt = await service.generatePrompt({
      intent: 'Do a thing',
      model: 'gpt-4o-mini',
      targetModel: 'gpt-4o-mini',
      fileContext: [{ path: 'ctx.md', content: 'context' }],
      images: ['image.png'],
      videos: ['clip.mp4'],
    })
    expect(resolveImageParts).toHaveBeenCalledWith(['image.png'], undefined)
    expect(mediaLoader.uploadFileForGemini).toHaveBeenCalledWith('clip.mp4')
    expect(callLLM).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'user' }),
      ]),
      'gpt-4o-mini',
    )
    expect(prompt).toContain('Result')
  })

  it('includes meta instructions and keeps target guidance internal', async () => {
    const service = await buildService()
    await service.generatePrompt({
      intent: 'Do a thing',
      model: 'gpt-4o-mini',
      targetModel: 'gpt-4o-mini',
      fileContext: [],
      images: [],
      videos: [],
      metaInstructions: 'Be concise',
    })

    const messagePayload = callLLMMock.mock.calls[0]?.[0] as Array<{
      role: string
      content: unknown
    }>
    const systemMessages = messagePayload.filter((msg) => msg.role === 'system')
    const userMessage = messagePayload.find((msg) => msg.role === 'user')

    const userPayloadText = JSON.stringify(userMessage?.content)
    expect(userPayloadText).toContain('Meta-Instructions:\\nBe concise')
    expect(userPayloadText).not.toMatch(/target runtime model/i)
    expect(userPayloadText).not.toContain('gpt-4o-mini')

    const systemPayloadText = JSON.stringify(systemMessages.map((msg) => msg.content))
    expect(systemPayloadText).toContain('targetRuntimeModel: gpt-4o-mini')
    expect(systemPayloadText).toMatch(/do not include phrases like/i)
    expect(systemPayloadText).toMatch(/only include the target model/i)
  })

  it('sanitizes target model leakage from model output', async () => {
    callLLMMock.mockResolvedValueOnce(
      JSON.stringify({
        reasoning: 'x',
        prompt: 'Line 1\nTarget runtime model for executing: **GPT-5.2**\nUse gpt-5.2.',
      }),
    )

    const service = await buildService()
    const prompt = await service.generatePrompt({
      intent: 'Write a prompt about keyboard shortcuts',
      model: 'gpt-4o-mini',
      targetModel: 'gpt-5.2',
      fileContext: [],
      images: [],
      videos: [],
    })

    expect(prompt.toLowerCase()).not.toContain('target runtime model')
    expect(prompt.toLowerCase()).not.toContain('gpt-5.2')
  })

  it('keeps target model mentions when user intent includes it', async () => {
    callLLMMock.mockResolvedValueOnce(
      JSON.stringify({
        reasoning: 'x',
        prompt: 'This prompt must mention gpt-5.2 explicitly.',
      }),
    )

    const service = await buildService()
    const prompt = await service.generatePrompt({
      intent: 'Write a prompt and explicitly mention gpt-5.2.',
      model: 'gpt-4o-mini',
      targetModel: 'gpt-5.2',
      fileContext: [],
      images: [],
      videos: [],
    })

    expect(prompt).toContain('gpt-5.2')
  })

  it('handles refinement flows with previous prompt', async () => {
    const service = await buildService()
    await service.generatePrompt({
      intent: 'Original',
      model: 'gpt-4o-mini',
      targetModel: 'gpt-4o-mini',
      fileContext: [],
      images: [],
      videos: [],
      previousPrompt: 'draft',
      refinementInstruction: 'shorter',
    })
    const call = callLLMMock.mock.calls[0]?.[0]
    const userMessage = call?.find((msg: { role: string }) => msg.role === 'user')
    expect(userMessage?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('Current Prompt Draft'),
        }),
      ]),
    )
  })

  it('returns raw response when LLM output is not JSON', async () => {
    callLLMMock.mockResolvedValue('plain text response')
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const service = await buildService()
    const prompt = await service.generatePrompt({
      intent: 'Intent',
      model: 'gpt-4o-mini',
      targetModel: 'gpt-4o-mini',
      fileContext: [],
      images: [],
      videos: [],
    })
    expect(prompt).toBe('plain text response')
    expect(warn).toHaveBeenCalledWith(
      'Failed to parse LLM JSON response. Falling back to raw text.',
    )
    warn.mockRestore()
  })

  it('logs reasoning when DEBUG env var is set', async () => {
    process.env.DEBUG = '1'
    const err = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const service = await buildService()
    await service.generatePrompt({
      intent: 'Intent',
      model: 'gpt-4o-mini',
      targetModel: 'gpt-4o-mini',
      fileContext: [],
      images: [],
      videos: [],
    })
    expect(err).toHaveBeenCalledWith(expect.stringContaining('--- AI Reasoning ---'))
    err.mockRestore()
    delete process.env.DEBUG
  })
})

describe('PromptGeneratorService.generatePromptSeries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    configModule.loadCliConfig.mockResolvedValue({
      promptGenerator: { defaultModel: 'gpt-4o-mini', defaultGeminiModel: 'gemini-1.5-pro' },
    })
    resolveImageParts.mockResolvedValue([{ type: 'image', mimeType: 'image/png', data: 'aaa' }])
    mediaLoader.uploadFileForGemini.mockResolvedValue('gs://video')
    mediaLoader.inferVideoMimeType.mockReturnValue('video/mp4')
  })

  const buildService = async () => new PromptGeneratorService()

  const validAtomicPromptContent = `# Title
Do a thing

Role
You are a coding agent.

Context
This is standalone.

Goals & Tasks
- Make one small change

Inputs
- None

Constraints
- Keep it small

Execution Plan
1. Do the thing

Output Format
- Updated file(s)

Validation
- Run: npx jest apps/prompt-maker-cli/src/__tests__/prompt-generator-service.test.ts --runInBand
`

  const seriesPayload = {
    reasoning: 'analysis',
    overviewPrompt: '# Overview',
    atomicPrompts: [{ title: 'Step', content: validAtomicPromptContent }],
  }

  it('parses valid JSON into a SeriesResponse and uploads media', async () => {
    callLLMMock.mockResolvedValue(JSON.stringify(seriesPayload))
    const service = await buildService()
    const result = await service.generatePromptSeries({
      intent: 'Plan something',
      model: 'gpt-4o-mini',
      targetModel: 'gpt-4o-mini',
      fileContext: [{ path: 'ctx.md', content: 'context' }],
      images: ['diagram.png'],
      videos: ['clip.mp4'],
    })
    expect(resolveImageParts).toHaveBeenCalledWith(['diagram.png'], undefined)
    expect(mediaLoader.uploadFileForGemini).toHaveBeenCalledWith('clip.mp4')
    expect(result).toEqual(seriesPayload)
  })

  it('throws when the LLM response is not valid JSON', async () => {
    callLLMMock.mockResolvedValue('not json')
    const service = await buildService()
    await expect(
      service.generatePromptSeries({
        intent: 'Plan',
        model: 'gpt-4o-mini',
        targetModel: 'gpt-4o-mini',
        fileContext: [],
        images: [],
        videos: [],
      }),
    ).rejects.toThrow('LLM did not return valid SeriesResponse JSON.')
  })

  it('throws when the JSON is missing atomic prompts', async () => {
    callLLMMock.mockResolvedValue(
      JSON.stringify({ reasoning: 'r', overviewPrompt: '# Overview', atomicPrompts: [] }),
    )
    const service = await buildService()
    await expect(
      service.generatePromptSeries({
        intent: 'Plan',
        model: 'gpt-4o-mini',
        targetModel: 'gpt-4o-mini',
        fileContext: [],
        images: [],
        videos: [],
      }),
    ).rejects.toThrow('Series atomicPrompts must include at least one entry.')
  })

  it('repairs atomic prompts that are missing required sections', async () => {
    callLLMMock
      .mockResolvedValueOnce(
        JSON.stringify({
          reasoning: 'r',
          overviewPrompt: '# Overview',
          atomicPrompts: [
            { title: 'Step', content: '# Title\nMissing most sections\n\nValidation\n- ok' },
          ],
        }),
      )
      .mockResolvedValueOnce(JSON.stringify(seriesPayload))

    const onSeriesRepairAttempt = jest.fn()
    const service = await buildService()
    const result = await service.generatePromptSeries({
      intent: 'Plan',
      model: 'gpt-4o-mini',
      targetModel: 'gpt-4o-mini',
      fileContext: [],
      images: [],
      videos: [],
      onSeriesRepairAttempt,
    })

    expect(callLLMMock).toHaveBeenCalledTimes(2)
    expect(onSeriesRepairAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt: 1,
        maxAttempts: 2,
        validationError: expect.stringContaining('missing required section(s)'),
      }),
    )
    expect(result).toEqual(seriesPayload)
  })

  it('repairs atomic prompts that contain cross-references', async () => {
    callLLMMock
      .mockResolvedValueOnce(
        JSON.stringify({
          reasoning: 'r',
          overviewPrompt: '# Overview',
          atomicPrompts: [
            {
              title: 'Step',
              content: `# Title
Do a thing

Role
You are a coding agent.

Context
Continue from step 2.

Goals & Tasks
- Make one small change

Inputs
- None

Constraints
- Keep it small

Execution Plan
1. Do the thing

Output Format
- Updated file(s)

Validation
- Run: npx jest --runInBand
`,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(JSON.stringify(seriesPayload))

    const onSeriesRepairAttempt = jest.fn()
    const service = await buildService()
    const result = await service.generatePromptSeries({
      intent: 'Plan',
      model: 'gpt-4o-mini',
      targetModel: 'gpt-4o-mini',
      fileContext: [],
      images: [],
      videos: [],
      onSeriesRepairAttempt,
    })

    expect(callLLMMock).toHaveBeenCalledTimes(2)
    expect(onSeriesRepairAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt: 1,
        maxAttempts: 2,
        validationError: expect.stringContaining('contains forbidden cross-reference phrase'),
      }),
    )
    expect(result).toEqual(seriesPayload)
  })

  it('logs reasoning when DEBUG env var is set', async () => {
    process.env.DEBUG = '1'
    callLLMMock.mockResolvedValue(JSON.stringify(seriesPayload))
    const err = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const service = await buildService()
    await service.generatePromptSeries({
      intent: 'Plan something',
      model: 'gpt-4o-mini',
      targetModel: 'gpt-4o-mini',
      fileContext: [],
      images: [],
      videos: [],
    })
    expect(err).toHaveBeenCalledWith(expect.stringContaining('--- Series Reasoning ---'))
    err.mockRestore()
    delete process.env.DEBUG
  })
})
