import { useEffect, useState } from 'react'

export const usePersistentState = <T>(key: string, initial: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return initial
      return JSON.parse(raw) as T
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }, [key, value])

  return [value, setValue] as const
}

export const clearPersisted = (prefix = 'pl.') => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return
  }

  const storage = window.localStorage
  const keysToRemove: string[] = []

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key) continue
    if (key.startsWith(prefix)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => {
    try {
      storage.removeItem(key)
    } catch {}
  })
}
