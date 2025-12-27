import {
  buildSeriesOutputDirName,
  sanitizeForPathSegment,
  sanitizeForPathSegmentWithHash,
} from '../utils/series-path'

describe('series-path', () => {
  test('sanitizeForPathSegment slugifies and truncates', () => {
    expect(sanitizeForPathSegment('Hello, World!', 'fallback')).toBe('hello-world')
    expect(sanitizeForPathSegment('---', 'fallback')).toBe('fallback')
    expect(sanitizeForPathSegment('Hello, World!', 'fallback', 5)).toBe('hello')
  })

  test('sanitizeForPathSegmentWithHash keeps within maxLength', () => {
    const longValue = 'a'.repeat(500)
    const result = sanitizeForPathSegmentWithHash(longValue, 'fallback', 40)

    expect(result.length).toBeLessThanOrEqual(40)
    expect(result).toMatch(/-[0-9a-f]{8}$/)
  })

  test('buildSeriesOutputDirName caps intent slug length', () => {
    const intent =
      'We need to replace the DataTable component in the Pricing Rules section with the same library component in the Fee Manager'
    const date = new Date(2025, 11, 27, 11, 46, 55)

    const dirName = buildSeriesOutputDirName(intent, date)

    expect(dirName.startsWith('20251227-114655-')).toBe(true)

    const intentSlug = dirName.replace(/^\d{8}-\d{6}-/, '')
    expect(intentSlug.length).toBeLessThanOrEqual(80)
    expect(intentSlug).not.toMatch(/\s/)
  })
})
