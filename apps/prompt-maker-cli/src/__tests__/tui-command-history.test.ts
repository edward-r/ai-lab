import fs from 'node:fs/promises'

import {
  readCommandHistory,
  updateCommandHistory,
  writeCommandHistory,
  type CommandHistoryRecord,
} from '../tui/command-history'

jest.mock('node:os', () => ({ homedir: jest.fn(() => '/home/tester') }))

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
  mkdir: jest.fn(),
  rename: jest.fn(),
  writeFile: jest.fn(),
}))

const fsMock = fs as unknown as {
  readFile: jest.Mock
  mkdir: jest.Mock
  rename: jest.Mock
  writeFile: jest.Mock
}

describe('tui command history', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('adds new entries to the front and dedupes consecutive repeats', () => {
    const start: CommandHistoryRecord[] = []
    const first = updateCommandHistory({ previous: start, nextValue: ' hello ', maxEntries: 3 })
    expect(first[0]?.value).toBe('hello')

    const repeated = updateCommandHistory({ previous: first, nextValue: 'hello', maxEntries: 3 })
    expect(repeated).toBe(first)

    const second = updateCommandHistory({ previous: first, nextValue: 'world', maxEntries: 3 })
    expect(second.map((entry) => entry.value)).toEqual(['world', 'hello'])
  })

  it('limits stored entries to maxEntries', () => {
    const first = updateCommandHistory({ previous: [], nextValue: 'one', maxEntries: 2 })
    const second = updateCommandHistory({ previous: first, nextValue: 'two', maxEntries: 2 })
    const third = updateCommandHistory({ previous: second, nextValue: 'three', maxEntries: 2 })

    expect(third.map((entry) => entry.value)).toEqual(['three', 'two'])
  })

  it('returns an empty list when the history file is missing', async () => {
    const enoent = Object.assign(new Error('missing'), { code: 'ENOENT' })
    fsMock.readFile.mockRejectedValueOnce(enoent)

    await expect(readCommandHistory()).resolves.toEqual([])
  })

  it('returns an empty list when the history file is empty', async () => {
    fsMock.readFile.mockResolvedValueOnce('   \n')

    await expect(readCommandHistory()).resolves.toEqual([])
  })

  it('repairs corrupt JSON history files', async () => {
    fsMock.readFile.mockResolvedValueOnce('[')
    fsMock.mkdir.mockResolvedValueOnce(undefined)
    fsMock.rename.mockResolvedValueOnce(undefined)
    fsMock.writeFile.mockResolvedValueOnce(undefined)

    await expect(readCommandHistory()).resolves.toEqual([])

    expect(fsMock.rename).toHaveBeenCalledWith(
      '/home/tester/.config/prompt-maker-cli/tui-history.json',
      expect.stringContaining('/home/tester/.config/prompt-maker-cli/tui-history.corrupt-'),
    )
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      '/home/tester/.config/prompt-maker-cli/tui-history.json',
      '[]\n',
      'utf8',
    )
  })

  it('writes history entries to the config directory', async () => {
    fsMock.mkdir.mockResolvedValueOnce(undefined)
    fsMock.writeFile.mockResolvedValueOnce(undefined)
    fsMock.rename.mockResolvedValueOnce(undefined)

    await writeCommandHistory([{ value: 'cmd', timestamp: 'now' }])

    expect(fsMock.mkdir).toHaveBeenCalledWith('/home/tester/.config/prompt-maker-cli', {
      recursive: true,
    })

    const tempFile = `/home/tester/.config/prompt-maker-cli/tui-history.json.${process.pid}.tmp`
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      tempFile,
      expect.stringContaining('"value": "cmd"'),
      'utf8',
    )
    expect(fsMock.rename).toHaveBeenCalledWith(
      tempFile,
      '/home/tester/.config/prompt-maker-cli/tui-history.json',
    )
  })
})
