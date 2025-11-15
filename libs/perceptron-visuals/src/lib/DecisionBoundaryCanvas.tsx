import React, { useEffect, useMemo, useRef } from 'react'
import type { Activation, LabeledPoint, Params, Point2 } from './usePerceptronTrainer'

type Bounds = {
  xmin: number
  xmax: number
  ymin: number
  ymax: number
}

export type SnapshotParams = {
  w: [number, number]
  b: number
}

type DecisionBoundaryCanvasProps = {
  data: LabeledPoint[]
  params: Params
  width?: number
  height?: number
  onAddPoint?: (point: LabeledPoint) => void
  activation: Activation
  threshold?: number
  haloRadius?: number
  adjustBoundaryByThreshold?: boolean
  showMarginBand?: boolean

  showBaselineBoundary?: boolean
  baselineThreshold?: number
  snapshotParams?: SnapshotParams[]
  prevParams?: Params | undefined
  pulseMarginBand?: boolean
  prevData?: LabeledPoint[] | null
  dataAlpha?: number
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z))

const logit = (t: number): number => {
  const eps = 1e-12
  const clamped = Math.min(1 - eps, Math.max(eps, t))
  return Math.log(clamped / (1 - clamped))
}

const computeBounds = (points: LabeledPoint[], padRatio = 0.1): Bounds => {
  if (points.length === 0) {
    return { xmin: -1, xmax: 1, ymin: -1, ymax: 1 }
  }

  const xs = points.map((point) => point.x[0])
  const ys = points.map((point) => point.x[1])

  const xmin = Math.min(...xs)
  const xmax = Math.max(...xs)
  const ymin = Math.min(...ys)
  const ymax = Math.max(...ys)
  const dx = xmax - xmin || 1
  const dy = ymax - ymin || 1

  return {
    xmin: xmin - dx * padRatio,
    xmax: xmax + dx * padRatio,
    ymin: ymin - dy * padRatio,
    ymax: ymax + dy * padRatio,
  }
}

const useDevicePixelRatio = (): number => {
  if (typeof window === 'undefined') {
    return 1
  }
  return window.devicePixelRatio || 1
}

const SNAPSHOT_BOUNDARY_STYLES: Array<{ color: string; width: number; dash: number[] }> = [
  { color: '#7c3aed', width: 2, dash: [4, 4] },
  { color: '#0ea5e9', width: 2, dash: [2, 6] },
  { color: '#22c55e', width: 2, dash: [8, 4] },
]

const drawBoundary = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bounds: Bounds,
  w: [number, number],
  b: number,
  sx: (x: number) => number,
  sy: (y: number) => number,
  style: { color: string; width: number; dash?: number[] },
): void => {
  const [w1, w2] = w
  ctx.save()
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.width
  if (style.dash) {
    ctx.setLineDash(style.dash)
  } else {
    ctx.setLineDash([])
  }

  if (Math.abs(w2) < 1e-8) {
    if (Math.abs(w1) > 1e-8) {
      const xv = -b / w1
      if (xv > bounds.xmin && xv < bounds.xmax) {
        const cx = sx(xv)
        ctx.beginPath()
        ctx.moveTo(cx, 0)
        ctx.lineTo(cx, height)
        ctx.stroke()
      }
    }
  } else {
    const yAt = (x: number) => -(w1 / w2) * x - b / w2
    const start: Point2 = [sx(bounds.xmin), sy(yAt(bounds.xmin))]
    const end: Point2 = [sx(bounds.xmax), sy(yAt(bounds.xmax))]
    const clippedStart: Point2 = [start[0], clamp(start[1], 0, height)]
    const clippedEnd: Point2 = [end[0], clamp(end[1], 0, height)]
    ctx.beginPath()
    ctx.moveTo(clippedStart[0], clippedStart[1])
    ctx.lineTo(clippedEnd[0], clippedEnd[1])
    ctx.stroke()
  }

  ctx.restore()
}

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sx: (x: number) => number,
  sy: (y: number) => number,
  bounds: Bounds,
): void => {
  ctx.save()
  ctx.lineWidth = 1
  ctx.strokeStyle = '#e5e7eb'

  const ticks = 10
  for (let i = 1; i < ticks; i += 1) {
    const tx = bounds.xmin + (i / ticks) * (bounds.xmax - bounds.xmin)
    const ty = bounds.ymin + (i / ticks) * (bounds.ymax - bounds.ymin)

    ctx.beginPath()
    ctx.moveTo(sx(tx), 0)
    ctx.lineTo(sx(tx), height)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, sy(ty))
    ctx.lineTo(width, sy(ty))
    ctx.stroke()
  }

  ctx.strokeStyle = '#9ca3af'
  if (bounds.xmin < 0 && bounds.xmax > 0) {
    const axisX = sx(0)
    ctx.beginPath()
    ctx.moveTo(axisX, 0)
    ctx.lineTo(axisX, height)
    ctx.stroke()
  }
  if (bounds.ymin < 0 && bounds.ymax > 0) {
    const axisY = sy(0)
    ctx.beginPath()
    ctx.moveTo(0, axisY)
    ctx.lineTo(width, axisY)
    ctx.stroke()
  }

  ctx.restore()
}

export const DecisionBoundaryCanvas: React.FC<DecisionBoundaryCanvasProps> = ({
  data,
  params,
  width = 640,
  height = 480,
  onAddPoint,
  activation = 'step',
  threshold = 0.5,
  haloRadius = 11,
  adjustBoundaryByThreshold = false,
  showMarginBand = false,
  showBaselineBoundary = false,
  baselineThreshold = 0.5,
  snapshotParams = [],
  prevParams,
  pulseMarginBand = false,
  prevData = null,
  dataAlpha = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dpr = useDevicePixelRatio()
  const bounds = useMemo(() => computeBounds(data, 0.12), [data])

  const sx = useMemo(
    () => (x: number) => ((x - bounds.xmin) / (bounds.xmax - bounds.xmin || 1)) * width,
    [bounds.xmax, bounds.xmin, width],
  )

  const sy = useMemo(
    () => (y: number) => height - ((y - bounds.ymin) / (bounds.ymax - bounds.ymin || 1)) * height,
    [bounds.ymax, bounds.ymin, height],
  )

  const inv = useMemo(
    () =>
      (cx: number, cy: number): Point2 => {
        const x = bounds.xmin + (cx / width) * (bounds.xmax - bounds.xmin || 1)
        const y = bounds.ymin + ((height - cy) / height) * (bounds.ymax - bounds.ymin || 1)
        return [x, y]
      },
    [bounds, height, width],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d')
    if (!context) return undefined

    const draw = () => {
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      context.clearRect(0, 0, width, height)
      drawGrid(context, width, height, sx, sy, bounds)

      const scaleX = width / (bounds.xmax - bounds.xmin || 1)
      const scaleY = height / (bounds.ymax - bounds.ymin || 1)

      const now = typeof performance !== 'undefined' ? performance.now() : 0
      const t = (now % 1600) / 1600
      const haloPulse = 0.85 + 0.15 * Math.sin(2 * Math.PI * t)
      const bandPulse = 0.9 + 0.1 * Math.sin(2 * Math.PI * t)

      const clampedAlpha = clamp(dataAlpha ?? 1, 0, 1)

      const drawPoints = (points: LabeledPoint[], opacityScale: number) => {
        if (opacityScale <= 0) return
        for (const point of points) {
          context.save()
          context.globalAlpha = opacityScale

          const cx = sx(point.x[0])
          const cy = sy(point.x[1])
          const z = params.w[0] * point.x[0] + params.w[1] * point.x[1] + params.b
          const isSigmoid = activation === 'sigmoid'
          const probability = isSigmoid ? sigmoid(z) : null
          const predicted: 0 | 1 = isSigmoid
            ? probability !== null && probability >= threshold
              ? 1
              : 0
            : z > 0
              ? 1
              : 0
          const confidence = isSigmoid && probability !== null ? probability : predicted
          const ringColor = `rgba(${Math.round((1 - confidence) * 255)}, ${Math.round(
            confidence * 255,
          )}, 0, 0.5)`

          if (predicted !== point.y) {
            context.save()
            const haloGradient = context.createRadialGradient(cx, cy, 0, cx, cy, haloRadius)
            const haloBase = point.y === 1 ? '59, 130, 246' : '220, 38, 38'
            const haloAlpha = 0.32 * haloPulse
            haloGradient.addColorStop(0, `rgba(${haloBase}, ${haloAlpha})`)
            haloGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
            context.beginPath()
            context.fillStyle = haloGradient
            context.arc(cx, cy, haloRadius, 0, Math.PI * 2)
            context.fill()
            context.restore()
          }

          context.beginPath()
          context.arc(cx, cy, 7, 0, Math.PI * 2)
          context.strokeStyle = ringColor
          context.lineWidth = 2
          context.stroke()

          context.beginPath()
          context.arc(cx, cy, 4, 0, Math.PI * 2)
          context.fillStyle = point.y === 1 ? '#2563eb' : '#dc2626'
          context.fill()

          context.restore()
        }
      }

      const previousPoints = prevData ?? []
      const prevOpacity = previousPoints.length > 0 ? 1 - clampedAlpha : 0
      const nextOpacity = clampedAlpha

      if (prevOpacity > 0) {
        drawPoints(previousPoints, prevOpacity)
      }
      if (nextOpacity > 0) {
        drawPoints(data, nextOpacity)
      }

      const effectiveBias =
        activation === 'sigmoid' && adjustBoundaryByThreshold
          ? params.b - logit(threshold)
          : params.b

      if (showMarginBand) {
        const norm = Math.hypot(params.w[0], params.w[1])
        if (norm > 1e-6) {
          const scaledNormal = Math.sqrt((params.w[0] * scaleX) ** 2 + (params.w[1] * scaleY) ** 2)
          const baseWorldHalfWidth = 1 / norm
          const pulseFactor = pulseMarginBand ? bandPulse : 1
          const worldHalfWidth = baseWorldHalfWidth * pulseFactor
          const pixelHalfWidth = scaledNormal * worldHalfWidth
          const bandWidth = clamp(pixelHalfWidth * 2, 6, 72)
          drawBoundary(context, width, height, bounds, params.w, effectiveBias, sx, sy, {
            color: 'rgba(59, 130, 246, 0.12)',
            width: bandWidth,
          })
        }
      }

      drawBoundary(context, width, height, bounds, params.w, effectiveBias, sx, sy, {
        color: '#111827',
        width: 2,
      })

      if (activation === 'sigmoid' && showBaselineBoundary) {
        const baselineBias = params.b - logit(baselineThreshold)
        drawBoundary(context, width, height, bounds, params.w, baselineBias, sx, sy, {
          color: '#6b7280',
          width: 2,
          dash: [6, 4],
        })
      }

      if (snapshotParams.length > 0) {
        const shouldAdjustBias = activation === 'sigmoid' && adjustBoundaryByThreshold
        snapshotParams.forEach((overlay, index) => {
          const snapshotBias = shouldAdjustBias ? overlay.b - logit(threshold) : overlay.b
          const styleIndex = index % SNAPSHOT_BOUNDARY_STYLES.length
          const style = SNAPSHOT_BOUNDARY_STYLES[styleIndex]
          if (!style) return
          drawBoundary(context, width, height, bounds, overlay.w, snapshotBias, sx, sy, style)
        })
      }

      if (prevParams) {
        const prevW = prevParams.w
        const currW = params.w
        const prevNorm = Math.hypot(prevW[0], prevW[1])
        const currNorm = Math.hypot(currW[0], currW[1])
        if (prevNorm > 1e-6 && currNorm > 1e-6) {
          const prevUnit: Point2 = [prevW[0] / prevNorm, prevW[1] / prevNorm]
          const currUnit: Point2 = [currW[0] / currNorm, currW[1] / currNorm]
          const centerX = (bounds.xmin + bounds.xmax) / 2
          const centerY = (bounds.ymin + bounds.ymax) / 2
          const span =
            0.3 * Math.min(bounds.xmax - bounds.xmin || 1, bounds.ymax - bounds.ymin || 1)
          const startWorld: Point2 = [centerX + prevUnit[0] * span, centerY + prevUnit[1] * span]
          const endWorld: Point2 = [centerX + currUnit[0] * span, centerY + currUnit[1] * span]
          const startX = sx(startWorld[0])
          const startY = sy(startWorld[1])
          const endX = sx(endWorld[0])
          const endY = sy(endWorld[1])
          const dx = endX - startX
          const dy = endY - startY
          const mag = Math.hypot(dx, dy)
          if (mag > 1) {
            const ux = dx / mag
            const uy = dy / mag
            const headLength = 10
            const angle = Math.PI / 7
            const leftX = endX - headLength * (ux * Math.cos(angle) - uy * Math.sin(angle))
            const leftY = endY - headLength * (ux * Math.sin(angle) + uy * Math.cos(angle))
            const rightX = endX - headLength * (ux * Math.cos(-angle) - uy * Math.sin(-angle))
            const rightY = endY - headLength * (ux * Math.sin(-angle) + uy * Math.cos(-angle))

            context.save()
            context.strokeStyle = '#2563eb'
            context.fillStyle = '#2563eb'
            context.lineWidth = 2
            context.beginPath()
            context.moveTo(startX, startY)
            context.lineTo(endX, endY)
            context.stroke()
            context.beginPath()
            context.moveTo(endX, endY)
            context.lineTo(leftX, leftY)
            context.lineTo(rightX, rightY)
            context.closePath()
            context.fill()
            context.restore()
          }
        }
      }
    }

    if (typeof window === 'undefined') {
      draw()
      return undefined
    }

    const frame = window.requestAnimationFrame(draw)
    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [
    activation,
    adjustBoundaryByThreshold,
    baselineThreshold,
    bounds,
    data,
    dpr,
    height,
    params,
    showMarginBand,
    showBaselineBoundary,
    snapshotParams,
    prevParams,
    pulseMarginBand,
    sx,
    sy,
    threshold,
    width,
    haloRadius,
  ])

  const handleClick: React.MouseEventHandler<HTMLCanvasElement> = (event) => {
    if (!onAddPoint) return
    const rect = event.currentTarget.getBoundingClientRect()
    const cx = event.clientX - rect.left
    const cy = event.clientY - rect.top
    const [x, y] = inv(cx, cy)
    const label: 0 | 1 = event.shiftKey ? 1 : 0
    onAddPoint({ x: [x, y], y: label })
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}
    />
  )
}
