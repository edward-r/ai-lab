import { useCallback, useMemo, useRef, useState } from 'react'

export type LogEntry = {
  id: string
  level: 'info' | 'warn' | 'error'
  message: string
}

export const useLogBuffer = (initialCapacity = 20) => {
  const capacityRef = useRef(initialCapacity)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const pushLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => {
      const next = [...prev, entry]
      if (next.length > capacityRef.current) {
        return next.slice(next.length - capacityRef.current)
      }
      return next
    })
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const logger = useMemo(
    () => ({
      info: (message: string) =>
        pushLog({ id: `${Date.now()}-${Math.random()}`, level: 'info', message }),
      warn: (message: string) =>
        pushLog({ id: `${Date.now()}-${Math.random()}`, level: 'warn', message }),
      error: (message: string) =>
        pushLog({ id: `${Date.now()}-${Math.random()}`, level: 'error', message }),
    }),
    [pushLog],
  )

  return { logs, log: logger, clearLogs }
}
