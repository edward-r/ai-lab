import { useCallback, useEffect, useRef, useState } from 'react'

import type { HistoryEntry } from '../types'

export type UseCommandHistoryOptions = {
  initialEntries: HistoryEntry[]
  visibleRows: number
}

export const useCommandHistory = ({
  initialEntries,
  visibleRows,
}: UseCommandHistoryOptions): {
  history: HistoryEntry[]
  pushHistory: (content: string, kind?: HistoryEntry['kind']) => void
  scroll: {
    offset: number
    scrollTo: (next: number) => void
    scrollBy: (delta: number) => void
  }
} => {
  const [history, setHistory] = useState<HistoryEntry[]>(() => [...initialEntries])
  const historyIdRef = useRef(initialEntries.length)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true)

  const pushHistory = useCallback((content: string, kind: HistoryEntry['kind'] = 'system') => {
    setHistory((prev) => [...prev, { id: `entry-${historyIdRef.current++}`, content, kind }])
    setIsPinnedToBottom(true)
  }, [])

  useEffect(() => {
    setScrollOffset((prev) => {
      const nextMax = Math.max(0, history.length - visibleRows)
      if (isPinnedToBottom) {
        return nextMax
      }
      return Math.min(prev, nextMax)
    })
  }, [history, visibleRows, isPinnedToBottom])

  const scrollTo = useCallback(
    (next: number) => {
      const nextMax = Math.max(0, history.length - visibleRows)
      const clamped = Math.max(0, Math.min(next, nextMax))
      setScrollOffset(clamped)
      setIsPinnedToBottom(clamped >= nextMax)
    },
    [history.length, visibleRows],
  )

  const scrollBy = useCallback(
    (delta: number) => {
      scrollTo(scrollOffset + delta)
    },
    [scrollOffset, scrollTo],
  )

  return {
    history,
    pushHistory,
    scroll: {
      offset: scrollOffset,
      scrollTo,
      scrollBy,
    },
  }
}
