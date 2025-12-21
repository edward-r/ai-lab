import { filterStringsByQuery } from '../tui/string-filter'

describe('filterStringsByQuery', () => {
  it('returns all items unchanged for an empty query', () => {
    expect(filterStringsByQuery(['b', 'a', 'c'], '   ')).toEqual(['b', 'a', 'c'])
  })

  it('matches case-insensitively and preserves input order', () => {
    expect(filterStringsByQuery(['Readme.md', 'src/app.ts', 'docs/guide.md'], 'MD')).toEqual([
      'Readme.md',
      'docs/guide.md',
    ])
  })

  it('prefers prefix matches over substring matches', () => {
    expect(
      filterStringsByQuery(['packages/readme.md', 'docs/readme.md', 'src/readme.ts'], 'src'),
    ).toEqual(['src/readme.ts'])
  })

  it('returns prefix matches first, then substring matches', () => {
    expect(filterStringsByQuery(['abc', 'xabc', 'ab', 'zab'], 'ab')).toEqual([
      'abc',
      'ab',
      'xabc',
      'zab',
    ])
  })
})
