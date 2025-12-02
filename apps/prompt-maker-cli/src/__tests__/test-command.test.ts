import { runTestCommand } from '../test-command'

jest.mock('node:fs/promises', () => ({ readFile: jest.fn() }))
jest.mock('js-yaml', () => ({ load: jest.fn() }))
jest.mock('../testing/test-schema', () => ({ parsePromptTestSuite: jest.fn() }))
jest.mock('../testing/evaluator', () => ({ evaluatePrompt: jest.fn() }))
jest.mock('../prompt-generator-service', () => ({
  createPromptGeneratorService: jest.fn(),
  resolveDefaultGenerateModel: jest.fn().mockResolvedValue('gpt-4o-mini'),
}))
jest.mock('../file-context', () => ({ resolveFileContext: jest.fn().mockResolvedValue([]) }))
jest.mock('../smart-context-service', () => ({
  resolveSmartContextFiles: jest.fn().mockResolvedValue([]),
}))

const fs = jest.requireMock('node:fs/promises') as { readFile: jest.Mock }
const yaml = jest.requireMock('js-yaml') as { load: jest.Mock }
const schema = jest.requireMock('../testing/test-schema') as { parsePromptTestSuite: jest.Mock }
const evaluator = jest.requireMock('../testing/evaluator') as { evaluatePrompt: jest.Mock }
const { createPromptGeneratorService, resolveDefaultGenerateModel } = jest.requireMock(
  '../prompt-generator-service',
) as {
  createPromptGeneratorService: jest.Mock
  resolveDefaultGenerateModel: jest.Mock
}
const smartContext = jest.requireMock('../smart-context-service') as {
  resolveSmartContextFiles: jest.Mock
}

const service = {
  generatePrompt: jest.fn(),
}
createPromptGeneratorService.mockResolvedValue(service)

describe('runTestCommand', () => {
  const originalStdoutTty = process.stdout.isTTY
  const originalExitCode = process.exitCode

  beforeEach(() => {
    jest.clearAllMocks()
    createPromptGeneratorService.mockResolvedValue(service)
    resolveDefaultGenerateModel.mockResolvedValue('gpt-4o-mini')
    service.generatePrompt.mockResolvedValue('generated prompt')
    evaluator.evaluatePrompt.mockResolvedValue({ pass: true, reason: 'ok' })
    process.exitCode = undefined
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true })
  })

  afterAll(() => {
    Object.defineProperty(process.stdout, 'isTTY', { value: originalStdoutTty })
    process.exitCode = originalExitCode
  })

  it('loads default prompt-tests.yaml when no file provided', async () => {
    fs.readFile.mockResolvedValue('suite')
    yaml.load.mockReturnValue({ tests: [] })
    schema.parsePromptTestSuite.mockReturnValue({ tests: [] })
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runTestCommand([])
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('prompt-tests.yaml'), 'utf8')
    log.mockRestore()
  })

  it('executes tests and evaluates prompts', async () => {
    fs.readFile.mockResolvedValue('suite')
    const tests = [{ name: 'Case 1', intent: 'intent', expect: { contains: 'result' } }]
    yaml.load.mockReturnValue({ tests })
    schema.parsePromptTestSuite.mockReturnValue({ tests })
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runTestCommand(['custom.yaml'])
    expect(service.generatePrompt).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'intent', model: 'gpt-4o-mini' }),
    )
    expect(evaluator.evaluatePrompt).toHaveBeenCalledWith('generated prompt', {
      contains: 'result',
    })
    log.mockRestore()
  })

  it('invokes smart context resolution when enabled for a test', async () => {
    fs.readFile.mockResolvedValue('suite')
    const tests = [{ name: 'Smart', intent: 'intent', expect: {}, smartContext: true }]
    yaml.load.mockReturnValue({ tests })
    schema.parsePromptTestSuite.mockReturnValue({ tests })
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    smartContext.resolveSmartContextFiles.mockResolvedValue([
      { path: 'smart.md', content: 'smart' },
    ])
    await runTestCommand([])
    expect(smartContext.resolveSmartContextFiles).toHaveBeenCalledWith(
      'intent',
      [],
      expect.any(Function),
      undefined,
    )
    log.mockRestore()
  })

  it('passes smartContextRoot from test definitions when provided', async () => {
    fs.readFile.mockResolvedValue('suite')
    const tests = [
      {
        name: 'Smart Root',
        intent: 'intent',
        expect: {},
        smartContext: true,
        smartContextRoot: './src',
      },
    ]
    yaml.load.mockReturnValue({ tests })
    schema.parsePromptTestSuite.mockReturnValue({ tests })
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    smartContext.resolveSmartContextFiles.mockResolvedValue([])
    await runTestCommand([])
    expect(smartContext.resolveSmartContextFiles).toHaveBeenCalledWith(
      'intent',
      [],
      expect.any(Function),
      './src',
    )
    log.mockRestore()
  })

  it('sets process.exitCode when failures occur', async () => {
    fs.readFile.mockResolvedValue('suite')
    const tests = [{ name: 'Case', intent: 'intent', expect: {} }]
    yaml.load.mockReturnValue({ tests })
    schema.parsePromptTestSuite.mockReturnValue({ tests })
    evaluator.evaluatePrompt.mockResolvedValue({ pass: false, reason: 'bad' })
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    await runTestCommand([])
    expect(process.exitCode).toBe(1)
    log.mockRestore()
  })
})
