import { isCommandInput, parseAbsolutePathFromInput } from '../tui/drag-drop-path'

describe('drag-drop-path', () => {
  describe('parseAbsolutePathFromInput', () => {
    it('parses a plain posix absolute path', () => {
      expect(parseAbsolutePathFromInput('/Users/alice/file.txt')).toBe('/Users/alice/file.txt')
    })

    it('parses a quoted absolute path with spaces', () => {
      expect(parseAbsolutePathFromInput('"/Users/alice/My File.md"')).toBe(
        '/Users/alice/My File.md',
      )
    })

    it('parses a backslash-escaped absolute path with spaces', () => {
      expect(parseAbsolutePathFromInput('/Users/alice/My\\ File.md')).toBe(
        '/Users/alice/My File.md',
      )
    })

    it('returns null when additional tokens exist', () => {
      expect(parseAbsolutePathFromInput('/file arg')).toBeNull()
    })

    it('returns null for relative paths', () => {
      expect(parseAbsolutePathFromInput('src/index.ts')).toBeNull()
    })

    it('preserves Windows-style absolute paths', () => {
      expect(parseAbsolutePathFromInput('C:\\Users\\alice\\file.txt')).toBe(
        'C:\\Users\\alice\\file.txt',
      )
    })

    it('parses pasted paths with bracketed paste markers', () => {
      expect(parseAbsolutePathFromInput("[200~'/Users/alice/My File.md'[201~")).toBe(
        '/Users/alice/My File.md',
      )
    })

    it('parses pasted paths with stray sgr fragments', () => {
      expect(parseAbsolutePathFromInput("[200~'/Users/alice/My File.md'[7m")).toBe(
        '/Users/alice/My File.md',
      )
    })
  })

  describe('isCommandInput', () => {
    const existsSync = (candidate: string): boolean => candidate === '/Users'

    it('treats / (slash alone) as a command opener', () => {
      expect(isCommandInput('/', existsSync)).toBe(true)
    })

    it('treats command keywords as command input', () => {
      expect(isCommandInput('/files', existsSync)).toBe(true)
    })

    it('treats nested absolute paths as non-command input', () => {
      expect(isCommandInput('/tmp/foo', existsSync)).toBe(false)
    })

    it('treats existing root-level paths as non-command input', () => {
      expect(isCommandInput('/Users', existsSync)).toBe(false)
    })

    it('treats /keyword with args as command input', () => {
      expect(isCommandInput('/file src/index.ts', existsSync)).toBe(true)
    })
  })
})
