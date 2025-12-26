import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useLatestRef } from './useLatestRef'

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
  resetHistory: () => void
  clearHistory: () => void
  scroll: {
    offset: number
    scrollTo: (next: number) => void
    scrollBy: (delta: number) => void
  }
} => {
  const [history, setHistory] = useState<HistoryEntry[]>(() => [...initialEntries])
  const initialEntriesSnapshot = useMemo(() => [...initialEntries], [initialEntries])
  const initialEntriesRef = useLatestRef<HistoryEntry[]>(initialEntriesSnapshot)
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

  const resetHistory = useCallback(() => {
    const seed = [...initialEntriesRef.current]
    historyIdRef.current = seed.length
    setHistory(seed)
    setScrollOffset(Math.max(0, seed.length - visibleRows))
    setIsPinnedToBottom(true)
  }, [initialEntriesRef, visibleRows])

  const clearHistory = useCallback(() => {
    historyIdRef.current = 0
    setHistory([])
    setScrollOffset(0)
    setIsPinnedToBottom(true)
  }, [])

  return {
    history,
    pushHistory,
    resetHistory,
    clearHistory,
    scroll: {
      offset: scrollOffset,
      scrollTo,
      scrollBy,
    },
  }
}
