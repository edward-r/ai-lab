import {
  formatIndicatorLines,
  formatIndicatorSegmentPlain,
  resolveIndicatorSegments,
} from '../tui/components/core/status-indicators-layout'

describe('status indicator layout', () => {
  const chips = [
    '[status:Idle]',
    '[gpt-4o-mini]',
    '[target:gpt-4o]',
    '[openai:ok]',
    '[tokens:1.2k]',
    '[polish:on]',
    '[copy:off]',
    '[chatgpt:off]',
    '[json:on]',
    '[files:2]',
    '[urls:0]',
    '[intent:file]',
    '[file:demo.md]',
    '[instr:on]',
    '[tests:idle]',
  ] as const

  const flattenLine = (line: ReturnType<typeof formatIndicatorLines>[number]): string =>
    line.segments.map(formatIndicatorSegmentPlain).join(' · ')

  it('packs indicators into one line when wide', () => {
    const lines = formatIndicatorLines({ chips, maxWidth: 240 })
    expect(lines).toHaveLength(1)

    const firstLine = lines[0]
    if (!firstLine) {
      throw new Error('Expected at least one indicator line')
    }

    const text = flattenLine(firstLine)
    expect(text).toContain('Status: Idle')
    expect(text).toContain('Model: gpt-4o-mini')
    expect(text).toContain('Target: gpt-4o')
    expect(text).toContain('OpenAI: ok')
    expect(text).toContain('Tokens: 1.2k')
  })

  it('wraps indicators across multiple lines when narrow', () => {
    const maxWidth = 44
    const lines = formatIndicatorLines({ chips, maxWidth })
    expect(lines.length).toBeGreaterThan(1)

    for (const line of lines) {
      expect(flattenLine(line).length).toBeLessThanOrEqual(maxWidth)
    }
  })

  it('marks enabled toggles as primary and disabled toggles as muted', () => {
    const segments = resolveIndicatorSegments(chips)

    const polish = segments.find((segment) => segment.label === 'Polish')
    const copy = segments.find((segment) => segment.label === 'Copy')
    const json = segments.find((segment) => segment.label === 'JSON')

    expect(polish?.style).toBe('primary')
    expect(copy?.style).toBe('muted')
    expect(json?.style).toBe('primary')
  })
})
