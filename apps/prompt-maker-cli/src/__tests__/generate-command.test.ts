// eslint-disable unnecessary-semicolon
import clipboard from 'clipboardy'
import open from 'open'

import { callLLM } from '@prompt-maker/core'
import { runGenerateCommand } from '../generate-command'
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

jest.mock('clipboardy', () => ({ write: jest.fn() }))
jest.mock('open', () => jest.fn())
jest.mock('@prompt-maker/core', () => ({ callLLM: jest.fn() }))
jest.mock('../prompt-generator-service', () => ({
  createPromptGeneratorService: jest.fn(),
  ensureModelCredentials: jest.fn(),
  isGemini: jest.fn((model: string) => model.startsWith('gemini')),
  resolveDefaultGenerateModel: jest.fn().mockResolvedValue('gpt-4o-mini'),
}))
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

describe('runGenerateCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreatePromptService.mockResolvedValue(promptService)
    mockResolveDefaultModel.mockResolvedValue('gpt-4o-mini')
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
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--video', 'clip.mp4'])
    const call = promptService.generatePrompt.mock.calls[0][0]
    expect(call.model).toBe('gemini-1.5-pro')
    expect(warn).toHaveBeenCalledWith('Switching to Gemini 1.5 Pro to support video input.')
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

  it('emits json payload when --json is provided', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'))
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--json'])
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"intent": "intent text"'))
    expect(appendToHistory).toHaveBeenCalledTimes(1)
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
      .map((chunk) => JSON.parse(chunk) as { event: string })
    const eventTypes = events.map((event) => event.event)

    expect(eventTypes).toContain('context.telemetry')
    expect(eventTypes).toContain('generation.iteration.start')
    expect(eventTypes).toContain('generation.iteration.complete')
    expect(eventTypes).toContain('generation.final')
  })

  it('throws when --json and --interactive are combined', async () => {
    await expect(runGenerateCommand(['intent text', '--json', '--interactive'])).rejects.toThrow(
      '--json cannot be combined with --interactive.',
    )
  })
})
