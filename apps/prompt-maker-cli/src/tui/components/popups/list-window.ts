/*
 * List “windowing” primitives.
 *
 * In a TUI, rendering huge lists is both slow and visually noisy.
 * These helpers answer: “Given N items and a selection cursor, which slice
 * should we render, and should we show ‘… earlier …’ / ‘… later …’ indicators?”
 *
 * This module is intentionally:
 * - Pure (no React/Ink imports)
 * - Deterministic (same input => same output)
 * - Unit-testable (used by popups and other scrolling views)
 */

export type WindowedList = {
  start: number
  end: number
  showBefore: boolean
  showAfter: boolean
}

export type WindowRange = {
  startIndex: number
  endIndexExclusive: number
}

type ResolveWindowedListOptions = {
  itemCount: number
  selectedIndex: number
  maxVisibleRows: number
  lead?: number
}

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

const normalizeSelectedIndex = (itemCount: number, selectedIndex: number): number => {
  if (itemCount <= 0) {
    return 0
  }

  return clamp(selectedIndex, 0, itemCount - 1)
}

const resolveCursorWindowInternal = (
  itemCount: number,
  cursorIndex: number,
  windowSize: number,
  lead: number,
): WindowRange => {
  if (itemCount <= 0 || windowSize <= 0) {
    return { startIndex: 0, endIndexExclusive: 0 }
  }

  const normalizedCursor = normalizeSelectedIndex(itemCount, cursorIndex)
  const safeLead = Math.max(0, lead)

  const upperBound = Math.max(itemCount - windowSize, 0)
  const startIndex = clamp(
    normalizedCursor - Math.min(safeLead, Math.max(windowSize - 1, 0)),
    0,
    upperBound,
  )

  return {
    startIndex,
    endIndexExclusive: Math.min(startIndex + windowSize, itemCount),
  }
}

/**
 * The simplest windowing primitive.
 *
 * Required by the refactor plan: `(itemCount, cursorIndex, windowSize) -> range`.
 * We keep a small “lead” (2 rows) so the cursor stays slightly below the top,
 * matching the current popup UX.
 */
export const resolveCursorWindow = (
  itemCount: number,
  cursorIndex: number,
  windowSize: number,
): WindowRange => resolveCursorWindowInternal(itemCount, cursorIndex, windowSize, 2)

export const resolveWindowedList = ({
  itemCount,
  selectedIndex,
  maxVisibleRows,
  lead = 2,
}: ResolveWindowedListOptions): WindowedList => {
  if (itemCount <= 0 || maxVisibleRows <= 0) {
    return { start: 0, end: 0, showBefore: false, showAfter: false }
  }

  const normalizedSelected = normalizeSelectedIndex(itemCount, selectedIndex)
  const safeLead = Math.max(0, lead)

  let showBefore = true
  let showAfter = true
  let start = 0
  let end = 0

  // We may need a couple iterations because the presence/absence of the
  // “earlier/later” indicator lines reduces the number of actual items that fit.
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const indicatorRows = (showBefore ? 1 : 0) + (showAfter ? 1 : 0)
    const visibleItems = Math.max(1, maxVisibleRows - indicatorRows)

    const range =
      safeLead === 2
        ? resolveCursorWindow(itemCount, normalizedSelected, visibleItems)
        : resolveCursorWindowInternal(itemCount, normalizedSelected, visibleItems, safeLead)

    start = range.startIndex
    end = range.endIndexExclusive

    const nextShowBefore = start > 0
    const nextShowAfter = end < itemCount

    if (nextShowBefore === showBefore && nextShowAfter === showAfter) {
      showBefore = nextShowBefore
      showAfter = nextShowAfter
      break
    }

    showBefore = nextShowBefore
    showAfter = nextShowAfter
  }

  return { start, end, showBefore, showAfter }
}
