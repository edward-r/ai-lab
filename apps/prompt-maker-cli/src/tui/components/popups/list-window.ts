export type WindowedList = {
  start: number
  end: number
  showBefore: boolean
  showAfter: boolean
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

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const indicatorRows = (showBefore ? 1 : 0) + (showAfter ? 1 : 0)
    const visibleItems = Math.max(1, maxVisibleRows - indicatorRows)
    const upperBound = Math.max(itemCount - visibleItems, 0)

    start = clamp(normalizedSelected - Math.min(safeLead, visibleItems - 1), 0, upperBound)
    end = Math.min(start + visibleItems, itemCount)

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
