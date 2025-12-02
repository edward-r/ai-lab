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
}))
jest.mock('node:readline/promises', () => ({
  createInterface: jest.fn(),
}))

const fs = jest.requireMock('node:fs/promises') as { readFile: jest.Mock; stat: jest.Mock }
const readline = jest.requireMock('node:readline/promises') as { createInterface: jest.Mock }

const promptService = { generatePrompt: jest.fn() }
;(createPromptGeneratorService as jest.Mock).mockResolvedValue(promptService)
;(resolveDefaultGenerateModel as jest.Mock).mockResolvedValue('gpt-4o-mini')

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
    ;(createPromptGeneratorService as jest.Mock).mockResolvedValue(promptService)
    ;(resolveDefaultGenerateModel as jest.Mock).mockResolvedValue('gpt-4o-mini')
    promptService.generatePrompt.mockResolvedValue('prompt v1')
    setTtyState(false, false)
    fs.readFile.mockReset()
    fs.stat.mockReset()
    readline.createInterface.mockReset()
    ;(resolveFileContext as jest.Mock).mockResolvedValue([{ path: 'ctx.md', content: '# ctx' }])
    ;(resolveSmartContextFiles as jest.Mock).mockResolvedValue([])
    ;(resolveUrlContext as jest.Mock).mockResolvedValue([])
    ;(readFromStdin as jest.Mock).mockResolvedValue(null)
    ;(countTokens as jest.Mock).mockReturnValue(10)
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
    expect(log).toHaveBeenCalledWith(expect.stringContaining('AI Prompt Generator'))
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
    ;(readFromStdin as jest.Mock).mockResolvedValue('stdin intent')
    await runGenerateCommand([])
    expect(promptService.generatePrompt).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'stdin intent' }),
    )
  })

  it('appends smart context files when enabled', async () => {
    ;(resolveSmartContextFiles as jest.Mock).mockResolvedValue([
      { path: 'smart.md', content: 'smart content' },
    ])
    await runGenerateCommand(['intent', '--smart-context', '--context', 'ctx/**/*.md'])
    const call = promptService.generatePrompt.mock.calls[0][0]
    expect(resolveSmartContextFiles).toHaveBeenCalled()
    expect(call.fileContext).toEqual([
      { path: 'ctx.md', content: '# ctx' },
      { path: 'smart.md', content: 'smart content' },
    ])
  })

  it('merges URL context before smart context resolution', async () => {
    ;(resolveUrlContext as jest.Mock).mockResolvedValue([
      { path: 'url:https://example.com', content: 'Example Domain' },
    ])
    ;(resolveSmartContextFiles as jest.Mock).mockResolvedValue([
      { path: 'smart.md', content: 'smart content' },
    ])

    await runGenerateCommand(['intent text', '--url', 'https://example.com', '--smart-context'])

    const smartCallArgs = (resolveSmartContextFiles as jest.Mock).mock.calls[0]
    expect(smartCallArgs[1]).toEqual([
      { path: 'ctx.md', content: '# ctx' },
      { path: 'url:https://example.com', content: 'Example Domain' },
    ])

    const call = promptService.generatePrompt.mock.calls[0][0]
    expect(call.fileContext).toEqual([
      { path: 'ctx.md', content: '# ctx' },
      { path: 'url:https://example.com', content: 'Example Domain' },
      { path: 'smart.md', content: 'smart content' },
    ])
  })

  it('switches to gemini model when video assets provided', async () => {
    ;(isGemini as jest.Mock).mockImplementation((model: string) => model.startsWith('gemini'))
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    await runGenerateCommand(['intent text', '--video', 'clip.mp4'])
    const call = promptService.generatePrompt.mock.calls[0][0]
    expect(call.model).toBe('gemini-1.5-pro')
    expect(warn).toHaveBeenCalledWith('Switching to Gemini 1.5 Pro to support video input.')
    warn.mockRestore()
  })

  it('runs interactive refinements when tty is present', async () => {
    setTtyState(true, true)
    const rl = {
      question: jest.fn(),
      close: jest.fn(),
    }
    readline.createInterface.mockReturnValue(rl)
    promptService.generatePrompt
      .mockResolvedValueOnce('first prompt')
      .mockResolvedValueOnce('second prompt')
    rl.question
      .mockResolvedValueOnce('y')
      .mockResolvedValueOnce('Refine tone')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('n')

    await runGenerateCommand(['intent text', '--interactive'])

    expect(promptService.generatePrompt).toHaveBeenCalledTimes(2)
    expect(promptService.generatePrompt).toHaveBeenLastCalledWith(
      expect.objectContaining({
        refinementInstruction: 'Refine tone',
        previousPrompt: 'first prompt',
      }),
    )
    expect(rl.close).toHaveBeenCalled()
  })

  it('polishes prompt and copies/open as requested', async () => {
    ;(callLLM as jest.Mock).mockResolvedValue('polished prompt')
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

  it('throws when --json and --interactive are combined', async () => {
    await expect(runGenerateCommand(['intent text', '--json', '--interactive'])).rejects.toThrow(
      '--json cannot be combined with --interactive.',
    )
  })
})
