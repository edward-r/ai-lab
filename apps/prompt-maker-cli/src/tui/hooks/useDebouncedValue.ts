import { useEffect, useState } from 'react'

export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timeoutHandle: ReturnType<typeof setTimeout> = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      clearTimeout(timeoutHandle)
    }
  }, [delayMs, value])

  return debouncedValue
}
