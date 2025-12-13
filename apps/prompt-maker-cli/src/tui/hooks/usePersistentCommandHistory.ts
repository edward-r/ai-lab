import { useCallback, useEffect, useRef, useState } from 'react'

import type { CommandHistoryRecord } from '../command-history'
import { readCommandHistory, updateCommandHistory, writeCommandHistory } from '../command-history'

export type UsePersistentCommandHistoryOptions = {
  maxEntries?: number
  onError?: (message: string) => void
}

export const usePersistentCommandHistory = ({
  maxEntries = 200,
  onError,
}: UsePersistentCommandHistoryOptions = {}): {
  entries: CommandHistoryRecord[]
  addEntry: (value: string) => void
  isLoaded: boolean
} => {
  const [entries, setEntries] = useState<CommandHistoryRecord[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const writeQueueRef = useRef(Promise.resolve())

  useEffect(() => {
    let cancelled = false

    const load = async (): Promise<void> => {
      try {
        const loaded = await readCommandHistory()
        if (cancelled) {
          return
        }
        setEntries(loaded)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown history error.'
        onError?.(message)
      } finally {
        if (!cancelled) {
          setIsLoaded(true)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [onError])

  const persist = useCallback(
    (next: CommandHistoryRecord[]) => {
      writeQueueRef.current = writeQueueRef.current
        .then(async () => {
          await writeCommandHistory(next)
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Unknown history write error.'
          onError?.(message)
        })
    },
    [onError],
  )

  const addEntry = useCallback(
    (value: string) => {
      setEntries((prev) => {
        const next = updateCommandHistory({ previous: prev, nextValue: value, maxEntries })
        if (next !== prev) {
          persist(next)
        }
        return next
      })
    },
    [maxEntries, persist],
  )

  return { entries, addEntry, isLoaded }
}
