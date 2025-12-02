import { appendToHistory } from '../history-logger'

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn(),
  appendFile: jest.fn(),
}))

const fs = jest.requireMock('node:fs/promises') as { mkdir: jest.Mock; appendFile: jest.Mock }

describe('history-logger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates the history directory and appends a line', async () => {
    fs.mkdir.mockResolvedValue(undefined)
    fs.appendFile.mockResolvedValue(undefined)
    await appendToHistory({ intent: 'demo' })
    expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('.config'), { recursive: true })
    expect(fs.appendFile).toHaveBeenCalledWith(
      expect.stringContaining('history.jsonl'),
      expect.stringContaining('"intent":"demo"'),
      'utf8',
    )
  })

  it('logs a warning when append fails but does not throw', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    fs.mkdir.mockResolvedValue(undefined)
    fs.appendFile.mockRejectedValue(new Error('disk full'))
    await appendToHistory({ intent: 'demo' })
    expect(warn).toHaveBeenCalledWith('Failed to write history entry:', expect.any(Error))
    warn.mockRestore()
  })
})
