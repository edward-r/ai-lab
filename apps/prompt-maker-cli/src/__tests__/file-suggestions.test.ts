import fg from 'fast-glob'

import {
  discoverDirectorySuggestions,
  discoverFileSuggestions,
  discoverIntentFileSuggestions,
  FILE_SUGGESTION_IGNORE_PATTERNS,
  filterDirectorySuggestions,
  filterFileSuggestions,
  filterIntentFileSuggestions,
} from '../tui/file-suggestions'

jest.mock('fast-glob')

const globMock = fg as unknown as jest.MockedFunction<typeof fg>

describe('file-suggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    globMock.mockResolvedValue([])
  })

  it('discovers workspace files, normalizes, sorts, and limits', async () => {
    globMock.mockResolvedValue(['/repo/z.ts', '/repo/a.ts', '/other/outside.md'])

    const results = await discoverFileSuggestions({ cwd: '/repo', limit: 2 })

    expect(globMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        cwd: '/repo',
        ignore: FILE_SUGGESTION_IGNORE_PATTERNS,
        onlyFiles: true,
      }),
    )
    expect(results).toEqual(['a.ts', 'z.ts'])
  })

  it('discovers workspace directories, normalizes, sorts, and limits', async () => {
    globMock.mockResolvedValue(['/repo/z', '/repo/a', '/other/outside'])

    const results = await discoverDirectorySuggestions({ cwd: '/repo', limit: 2 })

    expect(globMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        cwd: '/repo',
        ignore: FILE_SUGGESTION_IGNORE_PATTERNS,
        onlyDirectories: true,
      }),
    )
    expect(results).toEqual(['a', 'z'])
  })

  it('filters directory suggestions by query and exclusion', () => {
    const results = filterDirectorySuggestions({
      suggestions: ['apps/prompt-maker-cli', 'src/app', 'docs'],
      query: 'app',
      exclude: ['docs'],
    })

    expect(results).toEqual(['apps/prompt-maker-cli', 'src/app'])
  })

  it('filters suggestions by substring and excludes existing entries', () => {
    const results = filterFileSuggestions({
      suggestions: ['src/app.ts', 'docs/Guide.md', 'README.md', 'src/utils/helpers.ts'],
      query: 'src',
      exclude: ['README.md'],
    })

    expect(results).toEqual(['src/app.ts', 'src/utils/helpers.ts'])
  })

  it('prefers prefix matches over substring matches', () => {
    const results = filterFileSuggestions({
      suggestions: ['packages/readme.md', 'docs/readme.md', 'src/readme-helper.ts'],
      query: 'src',
    })

    expect(results[0]).toBe('src/readme-helper.ts')
  })

  it('discovers intent file suggestions by scanning markdown/text files', async () => {
    globMock.mockResolvedValue(['/repo/intents/a.md', '/repo/intents/b.txt'])

    const results = await discoverIntentFileSuggestions({ cwd: '/repo', limit: 5 })

    expect(globMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        cwd: '/repo',
        ignore: FILE_SUGGESTION_IGNORE_PATTERNS,
        onlyFiles: true,
      }),
    )

    expect(results).toEqual(['intents/a.md', 'intents/b.txt'])
  })

  it('filters intent files using fuzzy token matching', () => {
    const results = filterIntentFileSuggestions({
      suggestions: [
        'tmp-uat/intent-basic.md',
        'intents/travel-app-notes.md',
        'intents/onboarding-bot.md',
      ],
      query: 'itb',
    })

    expect(results[0]).toBe('tmp-uat/intent-basic.md')
  })

  it('supports multi-token intent fuzzy search', () => {
    const results = filterIntentFileSuggestions({
      suggestions: ['intents/travel-app-notes.md', 'intents/onboarding-bot.md'],
      query: 'trav app',
    })

    expect(results).toEqual(['intents/travel-app-notes.md'])
  })
})
