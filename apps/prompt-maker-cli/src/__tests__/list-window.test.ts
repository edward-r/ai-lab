import { resolveListPopupHeights } from '../tui/components/popups/list-popup-layout'
import { resolveCursorWindow, resolveWindowedList } from '../tui/components/popups/list-window'

describe('resolveCursorWindow', () => {
  it('returns empty range for invalid sizes', () => {
    expect(resolveCursorWindow(10, 5, 0)).toEqual({ startIndex: 0, endIndexExclusive: 0 })
    expect(resolveCursorWindow(0, 0, 5)).toEqual({ startIndex: 0, endIndexExclusive: 0 })
  })

  it('windows near the start', () => {
    expect(resolveCursorWindow(10, 0, 5)).toEqual({ startIndex: 0, endIndexExclusive: 5 })
    expect(resolveCursorWindow(10, 1, 5)).toEqual({ startIndex: 0, endIndexExclusive: 5 })
  })

  it('windows in the middle with a 2-row lead', () => {
    // With lead=2, cursorIndex=5 should put the window start at 3.
    expect(resolveCursorWindow(10, 5, 5)).toEqual({ startIndex: 3, endIndexExclusive: 8 })
  })

  it('windows near the end', () => {
    expect(resolveCursorWindow(10, 9, 5)).toEqual({ startIndex: 5, endIndexExclusive: 10 })
  })

  it('shows all items when list is smaller than window', () => {
    expect(resolveCursorWindow(3, 1, 10)).toEqual({ startIndex: 0, endIndexExclusive: 3 })
  })
})

describe('resolveWindowedList', () => {
  it('shows all items when they fit', () => {
    expect(
      resolveWindowedList({
        itemCount: 2,
        selectedIndex: 1,
        maxVisibleRows: 5,
      }),
    ).toEqual({ start: 0, end: 2, showBefore: false, showAfter: false })
  })

  it('windows a long list with indicators', () => {
    const result = resolveWindowedList({
      itemCount: 10,
      selectedIndex: 9,
      maxVisibleRows: 5,
      lead: 2,
    })

    expect(result.showBefore).toBe(true)
    expect(result.showAfter).toBe(false)
    expect(result.end).toBe(10)
    expect(result.start).toBeGreaterThanOrEqual(0)
    expect(result.start).toBeLessThan(result.end)
  })

  it('returns empty window for invalid sizes', () => {
    expect(resolveWindowedList({ itemCount: 5, selectedIndex: 2, maxVisibleRows: 0 })).toEqual({
      start: 0,
      end: 0,
      showBefore: false,
      showAfter: false,
    })
  })
})

describe('resolveListPopupHeights', () => {
  it('allocates rows for file popup height 16', () => {
    expect(resolveListPopupHeights({ maxHeight: 16, hasSuggestions: true })).toEqual({
      selectedRows: 5,
      suggestionRows: 4,
    })
  })

  it('prefers selected rows on small heights', () => {
    expect(resolveListPopupHeights({ maxHeight: 10, hasSuggestions: true })).toEqual({
      selectedRows: 3,
      suggestionRows: 0,
    })
  })

  it('keeps defaults when suggestions are absent', () => {
    expect(resolveListPopupHeights({ maxHeight: undefined, hasSuggestions: false })).toEqual({
      selectedRows: 6,
      suggestionRows: 0,
    })
  })
})
