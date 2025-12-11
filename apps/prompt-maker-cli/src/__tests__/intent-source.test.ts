import { resolveIntentSource } from '../tui/intent-source'

describe('resolveIntentSource', () => {
  it('returns text intent when no file path is provided', () => {
    const result = resolveIntentSource('  draft prompt ', '   ')
    expect(result).toEqual({ kind: 'text', intent: 'draft prompt' })
  })

  it('prefers the file path when both are provided', () => {
    const result = resolveIntentSource('typed intent', ' ./intent.md ')
    expect(result).toEqual({ kind: 'file', intentFile: './intent.md' })
  })

  it('returns empty when both sources are blank', () => {
    const result = resolveIntentSource('   ', '')
    expect(result).toEqual({ kind: 'empty' })
  })
})
