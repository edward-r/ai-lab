// eslint-disable unnecessary-semicolon
import clipboard from 'clipboardy'
import open from 'open'

import { callLLM } from '@prompt-maker/core'
import { runGenerateCommand, InteractiveTransport } from '../generate-command'
import { appendToHistory } from '../history-logger'
import { readFromStdin } from '../io'
import { resolveFileContext } from '../file-context'
import { resolveSmartContextFiles } from '../smart-context-service'
import {
  createPromptGeneratorService,
  resolveDefaultGenerateModel,
  isGemini,
} from '../prompt-generator-service'
import { resolveUrlContext } from '../url-context'
import { countTokens } from '../token-counter'

jest.mock('enquirer', () => {
  const prompt = jest.fn()
  return {
    __esModule: true,
    default: { prompt },
    prompt,
  }
})

const promptMock = (jest.requireMock('enquirer') as { prompt: jest.Mock }).prompt

jest.mock('../config', () => ({
  loadCliConfig: jest.fn().mockResolvedValue({
    promptGenerator: { defaultGeminiModel: 'gemini-1.5-pro' },
  }),
}))

const mockLoadCliConfig = (jest.requireMock('../config') as { loadCliConfig: jest.Mock })
  .loadCliConfig

jest.mock('clipboardy', () => ({ write: jest.fn() }))
jest.mock('open', () => jest.fn())
jest.mock('@prompt-maker/core', () => ({ callLLM: jest.fn() }))
jest.mock('../prompt-generator-service', () => {
  const actual = jest.requireActual(
    '../prompt-generator-service',
  ) as typeof import('../prompt-generator-service')

  return {
    createPromptGeneratorService: jest.fn(),
    ensureModelCredentials: jest.fn(),
    isGemini: jest.fn((model: string) => model.startsWith('gemini')),
    resolveDefaultGenerateModel: jest.fn().mockResolvedValue('gpt-4o-mini'),
    sanitizePromptForTargetModelLeakage: actual.sanitizePromptForTargetModelLeakage,
  }
})
jest.mock('../file-context', () => ({
  resolveFileContext: jest.fn().mockResolvedValue([{ path: 'ctx.md', content: '# ctx' }]),
  formatContextForPrompt: jest.requireActual('../file-context').formatContextForPrompt,
}))
jest.mock('../smart-context-service', () => ({
  resolveSmartContextFiles: jest.fn().mockResolvedValue([]),
}))
jest.mock('../url-context', () => ({
  resolveUrlContext: jest.fn().mockResolvedValue([]),
}))
jest.mock('../history-logger', () => ({ appendToHistory: jest.fn().mockResolvedValue(undefined) }))
jest.mock('../io', () => ({ readFromStdin: jest.fn().mockResolvedValue(null) }))
jest.mock('../image-loader', () => ({ resolveImageParts: jest.fn().mockResolvedValue([]) }))
jest.mock('../media-loader', () => ({ resolveVideoParts: jest.fn().mockResolvedValue([]) }))
jest.mock('../token-counter', () => ({
  countTokens: jest.fn().mockReturnValue(10),
  formatTokenCount: jest.fn((count: number) => `${count} tokens`),
}))
jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
  stat: jest.fn(),
  writeFile: jest.fn(),
}))

const fs = jest.requireMock('node:fs/promises') as {
  readFile: jest.Mock
  stat: jest.Mock
  writeFile: jest.Mock
}

const promptService = { generatePrompt: jest.fn() }
const mockCreatePromptService = createPromptGeneratorService as jest.Mock
const mockResolveDefaultModel = resolveDefaultGenerateModel as jest.Mock
const mockResolveFileContext = resolveFileContext as jest.Mock
const mockResolveSmartContext = resolveSmartContextFiles as jest.Mock
const mockResolveUrlContext = resolveUrlContext as jest.Mock
const mockReadFromStdin = readFromStdin as jest.Mock
const mockCountTokens = countTokens as jest.Mock
const mockIsGemini = isGemini as jest.Mock
const mockCallLLM = callLLM as jest.Mock

mockCreatePromptService.mockResolvedValue(promptService)
mockResolveDefaultModel.mockResolvedValue('gpt-4o-mini')

const originalStdinIsTTY = process.stdin.isTTY
const originalStdoutIsTTY = process.stdout.isTTY

const setTtyState = (stdinTty: boolean, stdoutTty: boolean): void => {
  Object.defineProperty(process.stdin, 'isTTY', { value: stdinTty, configurable: true })
  Object.defineProperty(process.stdout, 'isTTY', { value: stdoutTty, configurable: true })
}

afterAll(() => {
  Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinIsTTY })
  Object.defineProperty(process.stdout, 'isTTY', { value: originalStdoutIsTTY })
})

type TestInteractiveCommand = { type: 'refine'; instruction: string } | { type: 'finish' }

type LifecycleEmitter = Parameters<InteractiveTransport['setEventEmitter']>[0]

const setupTransportMock = (commands: TestInteractiveCommand[], events: string[]): (() => void) => {
  const commandQueue = [...commands]
  let lifecycleEmitter: LifecycleEmitter | null = null

  const startSpy = jest
    .spyOn(InteractiveTransport.prototype, 'start')
    .mockImplementation(async () => {
      lifecycleEmitter?.({ event: 'transport.listening', path: '/tmp/pmc.sock' })
      lifecycleEmitter?.({ event: 'transport.client.connected', status: 'connected' })
    })
  const stopSpy = jest
    .spyOn(InteractiveTransport.prototype, 'stop')
    .mockImplementation(async () => {
      lifecycleEmitter?.({ event: 'transport.client.disconnected', status: 'disconnected' })
    })
  const writerSpy = jest
    .spyOn(InteractiveTransport.prototype, 'getEventWriter')
    .mockReturnValue((chunk: string) => {
      events.push(chunk.trim())
    })
  const setEmitterSpy = jest
    .spyOn(InteractiveTransport.prototype, 'setEventEmitter')
    .mockImplementation(function (this: InteractiveTransport, emitter: LifecycleEmitter) {
      lifecycleEmitter = emitter
    })
  const nextCommandSpy = jest
    .spyOn(InteractiveTransport.prototype, 'nextCommand')
    .mockImplementation(async () => commandQueue.shift() ?? null)

  return () => {
    startSpy.mockRestore()
    stopSpy.mockRestore()
    writerSpy.mockRestore()
    setEmitterSpy.mockRestore()
    nextCommandSpy.mockRestore()
  }
}

describe('runGenerateCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreatePromptService.mockResolvedValue(promptService)
    mockResolveDefaultModel.mockResolvedValue('gpt-4o-mini')
    mockLoadCliConfig.mockResolvedValue({
      promptGenerator: { defaultGeminiModel: 'gemini-1.5-pro' },
    })
    promptService.generatePrompt.mockResolvedValue('prompt v1')
    setTtyState(false, false)
    fs.readFile.mockReset()
    fs.stat.mockReset()
    fs.writeFile.mockReset()
    promptMock.mockReset()
    mockResolveFileContext.mockResolvedValue([{ path: 'ctx.md', content: '# ctx' }])
    mockResolveSmartContext.mockResolvedValue([])
    mockResolveUrlContext.mockResolvedValue([])
    mockReadFromStdin.mockResolvedValue(null)
    mockCountTokens.mockReturnValue(10)
  })

  it('generates a prompt with inline intent and logs output', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runGenerateCommand(['Write something'])
    expect(promptService.generatePrompt).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'Write something' }),
    )
    expect(appendToHistory).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'Write something', prompt: 'prompt v1' }),
    )
    const sawPrompt = log.mock.calls.some(
      (args) => typeof args[0] === 'string' && args[0].includes('prompt v1'),
    )
    expect(sawPrompt).toBe(true)
    log.mockRestore()
  })

  it('reads intent from file when --intent-file is provided', async () => {
    fs.stat.mockResolvedValue({ size: 128 })
    fs.readFile.mockResolvedValue(Buffer.from(' file intent '))
    await runGenerateCommand(['--intent-file', 'intent.txt'])
    expect(fs.stat).toHaveBeenCalledWith('intent.txt')
    expect(promptService.generatePrompt).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'file intent' }),
    )
  })

  it('treats inline intent after -i as a file path when it exists', async () => {
    fs.stat.mockResolvedValue({ size: 256 })
    fs.readFile.mockResolvedValue(Buffer.from('interactive file intent'))
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)

    await runGenerateCommand(['-i', 'intent.md'])

    expect(promptService.generatePrompt).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'interactive file intent' }),
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('--intent-file'))

    warn.mockRestore()
  })

  it('falls back to stdin when no inline intent is provided', async () => {
    mockReadFromStdin.mockResolvedValue('stdin intent')
    await runGenerateCommand([])
    expect(promptService.generatePrompt).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'stdin intent' }),
    )
  })

  it('appends smart context files when enabled', async () => {
    mockResolveSmartContext.mockResolvedValue([{ path: 'smart.md', content: 'smart content' }])
    await runGenerateCommand(['intent', '--smart-context', '--context', 'ctx/**/*.md'])
    const call = promptService.generatePrompt.mock.calls[0][0]
    expect(mockResolveSmartContext).toHaveBeenCalled()
    expect(call.fileContext).toEqual([
      { path: 'ctx.md', content: '# ctx' },
      { path: 'smart.md', content: 'smart content' },
    ])
  })

  it('merges URL context before smart context resolution', async () => {
    mockResolveUrlContext.mockResolvedValue([
      { path: 'url:https://example.com', content: 'Example Domain' },
    ])
    mockResolveSmartContext.mockResolvedValue([{ path: 'smart.md', content: 'smart content' }])

    await runGenerateCommand(['intent text', '--url', 'https://example.com', '--smart-context'])

    const smartCallArgs = mockResolveSmartContext.mock.calls[0]
    expect(smartCallArgs[1]).toEqual([
      { path: 'ctx.md', content: '# ctx' },
      { path: 'url:https://example.com', content: 'Example Domain' },
    ])
    expect(smartCallArgs[3]).toBeUndefined()

    const call = promptService.generatePrompt.mock.calls[0][0]
    expect(call.fileContext).toEqual([
      { path: 'ctx.md', content: '# ctx' },
      { path: 'url:https://example.com', content: 'Example Domain' },
      { path: 'smart.md', content: 'smart content' },
    ])
  })

  it('switches to gemini model when video assets provided', async () => {
    mockIsGemini.mockImplementation((model: string) => model.startsWith('gemini'))
    mockLoadCliConfig.mockResolvedValueOnce(null)
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--video', 'clip.mp4'])
    const call = promptService.generatePrompt.mock.calls[0][0]
    expect(call.model).toBe('gemini-3-pro-preview')
    expect(warn).toHaveBeenCalledWith('Switching to Gemini 3 Pro (Preview) to support video input.')
    warn.mockRestore()
  })

  it('passes smart context root through when provided', async () => {
    mockResolveSmartContext.mockResolvedValue([{ path: 'smart.md', content: 'content' }])
    await runGenerateCommand(['intent text', '--smart-context', '--smart-context-root', 'apps'])
    const smartCallArgs = mockResolveSmartContext.mock.calls[0]
    expect(smartCallArgs[3]).toBe('apps')
  })

  it('prints context files when --show-context is provided', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--show-context'])
    const sawContextDump = log.mock.calls.some(
      (args) => typeof args[0] === 'string' && args[0]?.includes('<file path="ctx.md">'),
    )
    expect(sawContextDump).toBe(true)
    log.mockRestore()
  })

  it('prints json context when --show-context and --context-format json are provided', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--show-context', '--context-format', 'json'])
    const jsonCall = log.mock.calls.find(
      (args) => typeof args[0] === 'string' && args[0].trim().startsWith('['),
    )
    expect(jsonCall).toBeDefined()
    log.mockRestore()
  })

  it('writes resolved context to a file when --context-file is provided', async () => {
    fs.writeFile.mockResolvedValue(undefined)
    await runGenerateCommand(['intent text', '--context-file', 'ctx.out'])
    expect(fs.writeFile).toHaveBeenCalledWith(
      'ctx.out',
      expect.stringContaining('<file path="ctx.md">'),
      'utf8',
    )
  })

  it('writes json context when --context-file and --context-format json are used', async () => {
    fs.writeFile.mockResolvedValue(undefined)
    await runGenerateCommand([
      'intent text',
      '--context-file',
      'ctx.json',
      '--context-format',
      'json',
    ])
    const [, payload] = fs.writeFile.mock.calls[0]
    expect(typeof payload).toBe('string')
    expect(payload.trim().startsWith('[')).toBe(true)
  })

  it('runs interactive refinements when tty is present', async () => {
    setTtyState(true, true)
    promptService.generatePrompt
      .mockResolvedValueOnce('first prompt')
      .mockResolvedValueOnce('second prompt')

    promptMock
      .mockResolvedValueOnce({ refine: true })
      .mockResolvedValueOnce({ refinement: 'Refine tone' })
      .mockResolvedValueOnce({ refine: false })

    await runGenerateCommand(['intent text', '--interactive'])

    expect(promptService.generatePrompt).toHaveBeenCalledTimes(2)
    expect(promptService.generatePrompt).toHaveBeenLastCalledWith(
      expect.objectContaining({
        refinementInstruction: 'Refine tone',
        previousPrompt: 'first prompt',
      }),
    )
  })

  it('polishes prompt and copies/open as requested', async () => {
    mockCallLLM.mockResolvedValue('polished prompt')
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--polish', '--copy', '--open-chatgpt'])
    expect(callLLM).toHaveBeenCalledWith(expect.any(Array), 'gpt-4o-mini')
    expect(clipboard.write).toHaveBeenCalledWith('polished prompt')
    expect(open).toHaveBeenCalledWith(expect.stringContaining('https://chatgpt.com'))
    log.mockRestore()
  })

  it('sanitizes polished output to avoid leaking --target', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    mockCallLLM.mockResolvedValue(
      'Target runtime model: gpt-4o-mini\nPolished output for gpt-4o-mini.',
    )

    await runGenerateCommand(['intent text', '--polish', '--json', '--target', 'gpt-4o-mini'])

    const firstCall = log.mock.calls[0]
    if (!firstCall) {
      throw new Error('Expected JSON output')
    }

    const payload = JSON.parse(firstCall[0] as string) as {
      polishedPrompt?: string
      targetModel: string
    }
    expect(payload.targetModel).toBe('gpt-4o-mini')
    expect(payload.polishedPrompt).toBeDefined()
    expect(payload.polishedPrompt?.toLowerCase()).not.toContain('target runtime model')
    expect(payload.polishedPrompt?.toLowerCase()).not.toContain('gpt-4o-mini')

    log.mockRestore()
  })

  it('emits json payload when --json is provided', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'))
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--json'])
    expect(log).toHaveBeenCalled()
    const firstCall = log.mock.calls[0]
    if (!firstCall) {
      throw new Error('Expected console.log to be called with JSON output')
    }
    const payload = JSON.parse(firstCall[0] as string) as {
      intent: string
      targetModel: string
      contextPaths: Array<{ path: string; source: string }>
    }
    expect(payload.intent).toBe('intent text')
    expect(payload.targetModel).toBe('gpt-4o-mini')
    expect(payload.contextPaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'intent', path: 'inline-intent' }),
        expect.objectContaining({ source: 'file', path: 'ctx.md' }),
      ]),
    )
    expect(payload).not.toHaveProperty('outputPath')
    expect(appendToHistory).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
    log.mockRestore()
  })

  it('uses explicit --target and defaults separately from --model', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'))
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)

    await runGenerateCommand([
      'intent text',
      '--model',
      'gpt-4o',
      '--target',
      'gpt-4o-mini',
      '--json',
    ])

    const firstCall = log.mock.calls[0]
    if (!firstCall) {
      throw new Error('Expected JSON output')
    }

    const payload = JSON.parse(firstCall[0] as string) as { model: string; targetModel: string }
    expect(payload.model).toBe('gpt-4o')
    expect(payload.targetModel).toBe('gpt-4o-mini')

    const generationCall = promptService.generatePrompt.mock.calls[0]?.[0]
    expect(generationCall).toEqual(
      expect.objectContaining({ model: 'gpt-4o', targetModel: 'gpt-4o-mini' }),
    )

    jest.useRealTimers()
    log.mockRestore()
  })

  it('streams jsonl events when enabled', async () => {
    const chunks: string[] = []
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(((
      chunk: string | Uint8Array,
      encoding?: BufferEncoding,
      cb?: (err?: Error) => void,
    ) => {
      if (typeof chunk === 'string') {
        chunks.push(chunk)
      }
      if (typeof cb === 'function') {
        cb()
      }
      return true
    }) as unknown as typeof process.stdout.write)

    await runGenerateCommand(['intent text', '--stream', 'jsonl', '--progress=false'])

    writeSpy.mockRestore()

    const events = chunks
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.startsWith('{') && chunk.endsWith('}'))
      .map((chunk) => JSON.parse(chunk) as { event: string } & Record<string, unknown>)

    const eventTypes = events.map((event) => event.event)

    expect(eventTypes).toContain('context.telemetry')
    expect(eventTypes).toContain('generation.iteration.start')
    expect(eventTypes).toContain('generation.iteration.complete')
    expect(eventTypes).toContain('generation.final')

    const generateStart = events.find((event) => {
      if (event.event !== 'progress.update') {
        return false
      }
      return (event as { label?: string }).label === 'Generating prompt'
    }) as { state?: string; scope?: string } | undefined
    expect(generateStart?.state).toBe('start')
    expect(generateStart?.scope).toBe('generate')

    const iterationStart = events.find((event) => event.event === 'generation.iteration.start') as
      | { inputTokens?: number }
      | undefined
    expect(iterationStart?.inputTokens).toBeGreaterThan(0)

    const finalEvent = events.find((event) => event.event === 'generation.final') as
      | { result?: { contextPaths?: Array<{ source: string }> } }
      | undefined
    expect(finalEvent?.result?.contextPaths).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: 'intent' })]),
    )
  })

  it('emits only jsonl lines when quiet streaming is requested', async () => {
    const chunks: string[] = []
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(((
      chunk: string | Uint8Array,
      encoding?: BufferEncoding,
      cb?: (err?: Error) => void,
    ) => {
      if (typeof chunk === 'string') {
        chunks.push(chunk)
      }
      if (typeof cb === 'function') {
        cb()
      }
      return true
    }) as unknown as typeof process.stdout.write)
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)

    await runGenerateCommand(['intent text', '--quiet', '--stream', 'jsonl', '--progress=false'])

    writeSpy.mockRestore()
    expect(logSpy).not.toHaveBeenCalled()
    logSpy.mockRestore()

    const jsonLines = chunks.map((chunk) => chunk.trim()).filter(Boolean)
    expect(jsonLines.length).toBeGreaterThan(0)
    jsonLines.forEach((line) => {
      expect(() => JSON.parse(line)).not.toThrow()
    })
  })

  it('suppresses UI banners when --quiet is provided', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--quiet'])
    expect(log).not.toHaveBeenCalled()
    log.mockRestore()
  })

  it('still prints JSON payload when --quiet and --json are combined', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'))
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--quiet', '--json'])
    expect(log).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"intent": "intent text"'))
    jest.useRealTimers()
    log.mockRestore()
  })

  it('includes url and smart context metadata in json output', async () => {
    mockResolveUrlContext.mockResolvedValueOnce([
      { path: 'url:https://example.com', content: '# url' },
    ])
    mockResolveSmartContext.mockResolvedValueOnce([{ path: 'smart.md', content: '# smart' }])
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runGenerateCommand([
      'intent text',
      '--json',
      '--url',
      'https://example.com',
      '--smart-context',
    ])
    const firstCall = log.mock.calls[0]
    if (!firstCall) {
      throw new Error('Expected JSON output to be logged')
    }
    const payload = JSON.parse(firstCall[0] as string) as {
      contextPaths: Array<{ path: string; source: string }>
    }
    expect(payload.contextPaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'url', path: 'url:https://example.com' }),
        expect.objectContaining({ source: 'smart', path: 'smart.md' }),
      ]),
    )
    log.mockRestore()
  })

  it('records outputPath when writing context file in json mode', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--json', '--context-file', '/tmp/out.json'])
    const firstCall = log.mock.calls[0]
    if (!firstCall) {
      throw new Error('Expected JSON output to be logged')
    }
    const payload = JSON.parse(firstCall[0] as string) as { outputPath?: string }
    expect(payload.outputPath).toBe('/tmp/out.json')
    log.mockRestore()
  })

  it('copies to clipboard without emitting cosmetic logs when quiet', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--quiet', '--copy'])
    expect(clipboard.write).toHaveBeenCalledWith('prompt v1')
    const copiedMessages = log.mock.calls
      .map((args) => args[0])
      .filter((arg) => typeof arg === 'string' && arg.includes('Copied prompt'))
    expect(copiedMessages).toHaveLength(0)
    log.mockRestore()
  })

  it('opens ChatGPT silently when quiet mode suppresses success ticks', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--quiet', '--open-chatgpt'])
    expect(open).toHaveBeenCalled()
    const openMessages = log.mock.calls
      .map((args) => args[0])
      .filter((arg) => typeof arg === 'string' && arg.includes('Opened ChatGPT'))
    expect(openMessages).toHaveLength(0)
    log.mockRestore()
  })

  it('drives interactive refinements via transport commands without TTY', async () => {
    promptService.generatePrompt
      .mockResolvedValueOnce('first prompt')
      .mockResolvedValueOnce('second prompt')
    const transportEvents: string[] = []
    const restoreTransport = setupTransportMock(
      [{ type: 'refine', instruction: 'Tighten tone' }, { type: 'finish' }],
      transportEvents,
    )

    try {
      await runGenerateCommand(['intent text', '--interactive-transport', '/tmp/pmc.sock'])
    } finally {
      restoreTransport()
    }

    const parsedEvents = transportEvents
      .map((event) => event.trim())
      .filter((event) => event.startsWith('{') && event.endsWith('}'))
      .map((event) => JSON.parse(event) as { event: string })

    expect(promptMock).not.toHaveBeenCalled()
    expect(promptService.generatePrompt).toHaveBeenCalledTimes(2)
    expect(parsedEvents.some((event) => event.event === 'transport.listening')).toBe(true)
    expect(parsedEvents.some((event) => event.event === 'interactive.awaiting')).toBe(true)
    expect(parsedEvents.some((event) => event.event === 'interactive.state')).toBe(true)
  })

  it('ends interactive transport sessions when finish command arrives first', async () => {
    const transportEvents: string[] = []
    const restoreTransport = setupTransportMock([{ type: 'finish' }], transportEvents)

    try {
      await runGenerateCommand(['intent text', '--interactive-transport', '/tmp/pmc.sock'])
    } finally {
      restoreTransport()
    }

    const parsedEvents = transportEvents
      .map((event) => event.trim())
      .filter((event) => event.startsWith('{') && event.endsWith('}'))
      .map((event) => JSON.parse(event) as { event: string })

    expect(promptService.generatePrompt).toHaveBeenCalledTimes(1)
    expect(promptMock).not.toHaveBeenCalled()
    expect(parsedEvents.some((event) => event.event === 'transport.listening')).toBe(true)
  })

  it('throws when an unknown context template is provided', async () => {
    await expect(
      runGenerateCommand(['intent text', '--context-template', 'missing']),
    ).rejects.toThrow('Unknown context template')
  })

  it('applies the built-in nvim context template and surfaces metadata', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--json', '--context-template', 'nvim'])
    expect(log).toHaveBeenCalled()
    const firstCall = log.mock.calls[0]
    if (!firstCall) {
      throw new Error('console.log was not called')
    }
    const [jsonOutput] = firstCall as [string]
    const payload = JSON.parse(jsonOutput) as {
      contextTemplate?: string
      renderedPrompt?: string
    }
    expect(payload.contextTemplate).toBe('nvim')
    expect(payload.renderedPrompt).toContain('NeoVim Prompt Buffer')
    expect(payload.renderedPrompt).toContain('prompt v1')
    log.mockRestore()
  })

  it('uses user-defined templates from config and appends prompt when placeholder is missing', async () => {
    mockLoadCliConfig.mockResolvedValue({
      promptGenerator: { defaultGeminiModel: 'gemini-1.5-pro' },
      contextTemplates: { scratch: 'Paste into scratch buffer for review' },
    })
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--json', '--context-template', 'scratch'])
    expect(log).toHaveBeenCalled()
    const firstCall = log.mock.calls[0]
    if (!firstCall) {
      throw new Error('console.log was not called')
    }
    const [jsonOutput] = firstCall as [string]
    const payload = JSON.parse(jsonOutput) as { renderedPrompt?: string }
    expect(payload.renderedPrompt).toContain('Paste into scratch buffer for review')
    expect(payload.renderedPrompt?.trim().endsWith('prompt v1')).toBe(true)
    log.mockRestore()
  })

  it('throws when --json and --interactive are combined', async () => {
    await expect(runGenerateCommand(['intent text', '--json', '--interactive'])).rejects.toThrow(
      '--json cannot be combined with --interactive.',
    )
  })
})
