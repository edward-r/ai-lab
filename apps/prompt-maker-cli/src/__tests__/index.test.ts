jest.mock('../generate-command', () => ({ runGenerateCommand: jest.fn() }))
jest.mock('../test-command', () => ({ runTestCommand: jest.fn() }))
jest.mock('../tui/launch', () => ({
  prepareTuiLaunch: jest.fn((args: string[]) => ({ sanitizedArgs: args, shouldLaunch: false })),
}))

const getGenerateMock = () =>
  (jest.requireMock('../generate-command') as { runGenerateCommand: jest.Mock }).runGenerateCommand
const getTestMock = () =>
  (jest.requireMock('../test-command') as { runTestCommand: jest.Mock }).runTestCommand

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

  it('invokes generate by default', async () => {
    const runGenerateCommand = getGenerateMock()
    runGenerateCommand.mockClear()
    process.argv = ['node', 'cli']
    await importCli()
    expect(runGenerateCommand).toHaveBeenCalledWith([])
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

  it('falls back to generate when first arg is a flag', async () => {
    const runGenerateCommand = getGenerateMock()
    runGenerateCommand.mockClear()
    process.argv = ['node', 'cli', '--json']
    await importCli()
    expect(runGenerateCommand).toHaveBeenCalledWith(['--json'])
  })
})
