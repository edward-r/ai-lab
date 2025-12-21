import { resolveListPopupHeights } from '../tui/components/popups/list-popup-layout'
import { resolveWindowedList } from '../tui/components/popups/list-window'

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
