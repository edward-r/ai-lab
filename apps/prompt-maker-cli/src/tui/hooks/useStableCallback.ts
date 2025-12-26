import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export const useStableCallback = <Args extends unknown[], R>(
  fn: (...args: Args) => R,
): ((...args: Args) => R) => {
  const fnRef = useRef(fn)

  useIsomorphicLayoutEffect(() => {
    fnRef.current = fn
  }, [fn])

  return useCallback((...args: Args) => fnRef.current(...args), [])
}
