jest.mock('../generate-command', () => ({ runGenerateCommand: jest.fn() }))
jest.mock('../test-command', () => ({ runTestCommand: jest.fn() }))
jest.mock('../tui', () => ({ runTuiCommand: jest.fn() }))

const getGenerateMock = () =>
  (jest.requireMock('../generate-command') as { runGenerateCommand: jest.Mock }).runGenerateCommand
const getTestMock = () =>
  (jest.requireMock('../test-command') as { runTestCommand: jest.Mock }).runTestCommand
const getTuiMock = () => (jest.requireMock('../tui') as { runTuiCommand: jest.Mock }).runTuiCommand

describe('CLI entrypoint command routing', () => {
  const originalArgv = [...process.argv]

  afterAll(() => {
    process.argv = originalArgv
  })

  const importCli = async (): Promise<void> => {
    await jest.isolateModulesAsync(async () => {
      await import('../index')
    })
  }

  it('invokes ui when no args are provided', async () => {
    const runTuiCommand = getTuiMock()
    const runGenerateCommand = getGenerateMock()
    runTuiCommand.mockClear()
    runGenerateCommand.mockClear()
    process.argv = ['node', 'cli']
    await importCli()
    expect(runTuiCommand).toHaveBeenCalledWith([])
    expect(runGenerateCommand).not.toHaveBeenCalled()
  })

  it('routes to explicit ui subcommand', async () => {
    const runTuiCommand = getTuiMock()
    runTuiCommand.mockClear()
    process.argv = ['node', 'cli', 'ui', '--verbose']
    await importCli()
    expect(runTuiCommand).toHaveBeenCalledWith(['--verbose'])
  })

  it('routes to test subcommand', async () => {
    const runTestCommand = getTestMock()
    runTestCommand.mockClear()
    process.argv = ['node', 'cli', 'test', '--watch']
    await importCli()
    expect(runTestCommand).toHaveBeenCalledWith(['--watch'])
  })

  it('treats generate alias as generate command', async () => {
    const runGenerateCommand = getGenerateMock()
    runGenerateCommand.mockClear()
    process.argv = ['node', 'cli', 'generate', 'foo']
    await importCli()
    expect(runGenerateCommand).toHaveBeenCalledWith(['foo'])
  })

  it('treats expand alias as generate command', async () => {
    const runGenerateCommand = getGenerateMock()
    runGenerateCommand.mockClear()
    process.argv = ['node', 'cli', 'expand', 'bar']
    await importCli()
    expect(runGenerateCommand).toHaveBeenCalledWith(['bar'])
  })

  it('falls back to generate when first arg is a flag', async () => {
    const runGenerateCommand = getGenerateMock()
    const runTuiCommand = getTuiMock()
    runGenerateCommand.mockClear()
    runTuiCommand.mockClear()
    process.argv = ['node', 'cli', '--json']
    await importCli()
    expect(runGenerateCommand).toHaveBeenCalledWith(['--json'])
    expect(runTuiCommand).not.toHaveBeenCalled()
  })
})
