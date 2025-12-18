import {
  clampHelpOverlayScrollOffset,
  getHelpOverlayContentRows,
  getHelpOverlayMaxScroll,
  scrollHelpOverlayBy,
} from '../tui/components/core/help-overlay-scroll'

describe('help-overlay-scroll', () => {
  it('computes content rows accounting for header/footer spacing', () => {
    expect(getHelpOverlayContentRows(10)).toBe(5)
    expect(getHelpOverlayContentRows(5)).toBe(1)
  })

  it('clamps scroll offset to valid range', () => {
    const contentRows = 5
    expect(getHelpOverlayMaxScroll(5, contentRows)).toBe(0)
    expect(getHelpOverlayMaxScroll(8, contentRows)).toBe(3)

    expect(clampHelpOverlayScrollOffset(-1, 8, contentRows)).toBe(0)
    expect(clampHelpOverlayScrollOffset(0, 8, contentRows)).toBe(0)
    expect(clampHelpOverlayScrollOffset(3, 8, contentRows)).toBe(3)
    expect(clampHelpOverlayScrollOffset(4, 8, contentRows)).toBe(3)
  })

  it('scrolls by delta and clamps at edges', () => {
    const contentRows = 5
    const lineCount = 8

    expect(scrollHelpOverlayBy(0, 1, lineCount, contentRows)).toBe(1)
    expect(scrollHelpOverlayBy(0, -1, lineCount, contentRows)).toBe(0)
    expect(scrollHelpOverlayBy(3, 1, lineCount, contentRows)).toBe(3)
    expect(scrollHelpOverlayBy(0, contentRows, lineCount, contentRows)).toBe(3)
  })
})
