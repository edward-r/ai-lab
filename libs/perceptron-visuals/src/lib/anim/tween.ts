import { interpolateNumber, interpolate } from 'd3-interpolate'

export type Cancel = () => void

export const tweenNumber = (
  from: number,
  to: number,
  opts: { duration: number; onUpdate: (v: number) => void; easing?: (t: number) => number },
): Cancel => {
  const start = performance.now()
  const interp = interpolateNumber(from, to)
  const ease = opts.easing ?? ((t: number) => t)
  let raf = 0
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / Math.max(1, opts.duration))
    opts.onUpdate(interp(ease(t)))
    if (t < 1) raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}

export const tweenTuple = <T extends number[]>(
  from: T,
  to: T,
  opts: { duration: number; onUpdate: (v: T) => void; easing?: (t: number) => number },
): Cancel => {
  const start = performance.now()
  const interp = interpolate(from, to)
  const ease = opts.easing ?? ((t: number) => t)
  let raf = 0
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / Math.max(1, opts.duration))
    opts.onUpdate(interp(ease(t)) as T)
    if (t < 1) raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}
