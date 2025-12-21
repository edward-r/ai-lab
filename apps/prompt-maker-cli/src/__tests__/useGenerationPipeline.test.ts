import { act, renderHook } from '@testing-library/react'
import { JSDOM } from 'jsdom'

import { useGenerationPipeline } from '../tui/hooks/useGenerationPipeline'

jest.mock('wrap-ansi', () => jest.fn((text: string) => text))

jest.mock('../tui/provider-status', () => ({
  checkModelProviderStatus: jest.fn(),
}))

jest.mock('../generate-command', () => ({
  runGeneratePipeline: jest.fn().mockResolvedValue({
    finalPrompt: 'Prompt',
    model: 'gpt-4o-mini',
    iterations: 1,
    telemetry: null,
    payload: {},
  }),
  maybeCopyToClipboard: jest.fn(),
  maybeOpenChatGpt: jest.fn(),
}))

jest.mock('../prompt-generator-service', () => ({
  generatePromptSeries: jest.fn().mockResolvedValue({
    reasoning: 'r',
    overviewPrompt: '# Overview',
    atomicPrompts: [{ title: 'Step', content: 'Do a thing\n\nValidation: check' }],
  }),
  isGemini: jest.fn((model: string) => model.startsWith('gemini')),
}))

jest.mock('../file-context', () => ({ resolveFileContext: jest.fn().mockResolvedValue([]) }))
jest.mock('../url-context', () => ({ resolveUrlContext: jest.fn().mockResolvedValue([]) }))
jest.mock('../smart-context-service', () => ({
  resolveSmartContextFiles: jest.fn().mockResolvedValue([]),
}))
jest.mock('node:fs/promises', () => ({ mkdir: jest.fn(), writeFile: jest.fn() }))

const providerStatusModule = jest.requireMock('../tui/provider-status') as {
  checkModelProviderStatus: jest.Mock
}
const generateCommandModule = jest.requireMock('../generate-command') as {
  runGeneratePipeline: jest.Mock
}
const promptGeneratorModule = jest.requireMock('../prompt-generator-service') as {
  generatePromptSeries: jest.Mock
}

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const globalEnv = globalThis as typeof globalThis & {
  window: Window & typeof globalThis
  document: Document
  navigator: Navigator
}
globalEnv.window = dom.window as typeof globalEnv.window
globalEnv.document = dom.window.document as Document
globalEnv.navigator = dom.window.navigator

describe('useGenerationPipeline', () => {
  const baseOptions = {
    files: [] as string[],
    urls: [] as string[],
    images: [] as string[],
    videos: [] as string[],
    smartContextEnabled: false,
    smartContextRoot: null,
    metaInstructions: '',
    interactiveTransportPath: undefined as string | undefined,
    terminalColumns: 80,
    polishEnabled: false,
    jsonOutputEnabled: false,
    copyEnabled: false,
    chatGptEnabled: false,
    isTestCommandRunning: false,
    notify: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    generateCommandModule.runGeneratePipeline.mockResolvedValue({
      finalPrompt: 'Prompt',
      model: 'gpt-4o-mini',
      iterations: 1,
      telemetry: null,
      payload: {},
    })
  })

  it('aborts runGeneration when provider credentials are missing', async () => {
    providerStatusModule.checkModelProviderStatus.mockResolvedValue({
      provider: 'openai',
      status: 'missing',
      message: 'OPENAI_API_KEY missing',
    })
    const pushHistory = jest.fn()
    const onProviderStatusUpdate = jest.fn()
    const { result } = renderHook(() =>
      useGenerationPipeline({
        ...baseOptions,
        pushHistory,
        currentModel: 'gpt-4o-mini',
        onProviderStatusUpdate,
      }),
    )

    await act(async () => {
      await result.current.runGeneration({ intent: 'Do a thing' })
    })

    expect(pushHistory).toHaveBeenCalledWith(
      'Generation aborted: OpenAI unavailable (OPENAI_API_KEY missing).',
      'system',
    )
    expect(generateCommandModule.runGeneratePipeline).not.toHaveBeenCalled()
    expect(onProviderStatusUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'openai', status: 'missing' }),
    )
  })

  it('runs generation when provider check passes', async () => {
    providerStatusModule.checkModelProviderStatus.mockResolvedValue({
      provider: 'openai',
      status: 'ok',
      message: 'ready',
    })
    const pushHistory = jest.fn()
    const onLastGeneratedPromptUpdate = jest.fn()
    const { result } = renderHook(() =>
      useGenerationPipeline({
        ...baseOptions,
        pushHistory,
        currentModel: 'gpt-4o-mini',
        onLastGeneratedPromptUpdate,
      }),
    )

    await act(async () => {
      await result.current.runGeneration({ intent: 'Ship it' })
    })

    expect(generateCommandModule.runGeneratePipeline).toHaveBeenCalled()
    expect(pushHistory).toHaveBeenCalledWith('Prompt', 'system')
    expect(onLastGeneratedPromptUpdate).toHaveBeenCalledWith('Prompt')
  })

  it('updates status chips with token telemetry', async () => {
    providerStatusModule.checkModelProviderStatus.mockResolvedValue({
      provider: 'openai',
      status: 'ok',
      message: 'ready',
    })
    const pushHistory = jest.fn()
    const { result } = renderHook(() =>
      useGenerationPipeline({
        ...baseOptions,
        pushHistory,
        currentModel: 'gpt-4o-mini',
      }),
    )

    await act(async () => {
      await result.current.runGeneration({ intent: 'Ship it' })
    })

    const optionsArg = generateCommandModule.runGeneratePipeline.mock.calls[0]?.[1] as unknown
    const onStreamEvent =
      typeof optionsArg === 'object' &&
      optionsArg !== null &&
      'onStreamEvent' in optionsArg &&
      typeof (optionsArg as { onStreamEvent?: unknown }).onStreamEvent === 'function'
        ? ((optionsArg as { onStreamEvent?: unknown }).onStreamEvent as (event: unknown) => void)
        : null

    expect(onStreamEvent).not.toBeNull()

    await act(async () => {
      onStreamEvent?.({
        event: 'context.telemetry',
        telemetry: {
          files: [],
          intentTokens: 200,
          fileTokens: 300,
          systemTokens: 700,
          totalTokens: 1200,
        },
      })
    })

    expect(result.current.statusChips).toEqual(expect.arrayContaining(['[tokens:1.2k]']))
  })

  it('animates the status chip while tests run', () => {
    jest.useFakeTimers()

    const pushHistory = jest.fn()
    const { result, rerender } = renderHook(
      ({ isTestCommandRunning }: { isTestCommandRunning: boolean }) =>
        useGenerationPipeline({
          ...baseOptions,
          pushHistory,
          currentModel: 'gpt-4o-mini',
          isTestCommandRunning,
        }),
      { initialProps: { isTestCommandRunning: false } },
    )

    expect(result.current.statusChips[0]).toBe('[status:Idle]')

    rerender({ isTestCommandRunning: true })

    const firstFrame = result.current.statusChips[0]
    expect(firstFrame).toContain('Running tests')

    act(() => {
      jest.advanceTimersByTime(120)
    })

    const secondFrame = result.current.statusChips[0]
    expect(secondFrame).toContain('Running tests')
    expect(secondFrame).not.toEqual(firstFrame)

    rerender({ isTestCommandRunning: false })

    expect(result.current.statusChips[0]).toBe('[status:Idle]')

    jest.useRealTimers()
  })

  it('passes meta instructions to the generation pipeline', async () => {
    providerStatusModule.checkModelProviderStatus.mockResolvedValue({
      provider: 'openai',
      status: 'ok',
      message: 'ready',
    })
    const pushHistory = jest.fn()
    const { result } = renderHook(() =>
      useGenerationPipeline({
        ...baseOptions,
        pushHistory,
        currentModel: 'gpt-4o-mini',
        metaInstructions: 'Be concise',
      }),
    )

    await act(async () => {
      await result.current.runGeneration({ intent: 'Add feature' })
    })

    expect(generateCommandModule.runGeneratePipeline).toHaveBeenCalledWith(
      expect.objectContaining({ metaInstructions: 'Be concise' }),
      expect.any(Object),
    )
  })

  it('aborts series generation when provider is unavailable', async () => {
    providerStatusModule.checkModelProviderStatus.mockResolvedValue({
      provider: 'gemini',
      status: 'missing',
      message: 'GEMINI_API_KEY missing',
    })
    const pushHistory = jest.fn()
    const { result } = renderHook(() =>
      useGenerationPipeline({
        ...baseOptions,
        pushHistory,
        currentModel: 'gpt-4o-mini',
        videos: ['clip.mp4'],
      }),
    )

    await act(async () => {
      await result.current.runSeriesGeneration('Plan work')
    })

    expect(promptGeneratorModule.generatePromptSeries).not.toHaveBeenCalled()
    expect(pushHistory).toHaveBeenCalledWith(
      'Generation aborted: Gemini unavailable (GEMINI_API_KEY missing).',
      'system',
    )
  })
})
