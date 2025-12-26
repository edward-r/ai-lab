import { useEffect, useRef, type MutableRefObject } from 'react'

/**
 * Returns a ref that always holds the latest value of the passed argument.
 * Useful for accessing the latest props/state inside asynchronous callbacks
 * (like stream handlers or timeouts) without triggering effect re-runs.
 */
export const useLatestRef = <T>(value: T): MutableRefObject<T> => {
  const ref = useRef<T>(value)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref
}
