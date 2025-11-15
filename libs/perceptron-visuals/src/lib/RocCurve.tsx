import React, { useCallback, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { RocPoint } from './metrics'

type RocCurveProps = {
  points: RocPoint[]
  auc: number | null
  width?: number
  height?: number
  strokeWidth?: number
  threshold?: number
  onThresholdChange?: (tau: number) => void
}

const buildPath = (points: RocPoint[], width: number, height: number): string => {
  if (points.length === 0) {
    return ''
  }

  const toX = (fpr: number) => fpr * width
  const toY = (tpr: number) => (1 - tpr) * height

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${toX(point.fpr)},${toY(point.tpr)}`)
    .join(' ')
}

export const RocCurve: React.FC<RocCurveProps> = ({
  points,
  auc,
  width = 320,
  height = 320,
  strokeWidth = 2,
  threshold,
  onThresholdChange,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [dragging, setDragging] = useState(false)

  const path = useMemo(() => buildPath(points, width, height), [points, width, height])
  const clampedThreshold = useMemo(() => {
    if (typeof threshold !== 'number') return undefined
    if (Number.isNaN(threshold)) return undefined
    return Math.min(1, Math.max(0, threshold))
  }, [threshold])

  const activePoint = useMemo<RocPoint | null>(() => {
    if (typeof clampedThreshold !== 'number') return null
    if (points.length === 0) return null
    const first = points[0]!
    let best: RocPoint = first
    let bestDiff = Math.abs(first.threshold - clampedThreshold)
    for (let index = 1; index < points.length; index += 1) {
      const candidate = points[index]!
      const diff = Math.abs(candidate.threshold - clampedThreshold)
      if (diff < bestDiff) {
        best = candidate
        bestDiff = diff
      }
    }
    return best
  }, [clampedThreshold, points])

  const activeX = activePoint ? activePoint.fpr * width : null
  const activeY = activePoint ? (1 - activePoint.tpr) * height : null

  const updateThreshold = useCallback(
    (clientX: number) => {
      if (!onThresholdChange || !svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const ratio = rect.width === 0 ? 0 : (clientX - rect.left) / rect.width
      const tau = Math.min(1, Math.max(0, ratio))
      onThresholdChange(tau)
    },
    [onThresholdChange],
  )

  const handlePointerDown: React.PointerEventHandler<SVGSVGElement> = useCallback(
    (event) => {
      if (!onThresholdChange) return
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragging(true)
      updateThreshold(event.clientX)
    },
    [onThresholdChange, updateThreshold],
  )

  const handlePointerMove: React.PointerEventHandler<SVGSVGElement> = useCallback(
    (event) => {
      if (!dragging) return
      updateThreshold(event.clientX)
    },
    [dragging, updateThreshold],
  )

  const handlePointerUp: React.PointerEventHandler<SVGSVGElement> = useCallback(
    (event) => {
      if (!dragging) return
      event.currentTarget.releasePointerCapture(event.pointerId)
      setDragging(false)
      updateThreshold(event.clientX)
    },
    [dragging, updateThreshold],
  )

  return (
    <div className="min-w-0 overflow-hidden">
      <div className="space-y-2">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          role="img"
          aria-label="ROC curve"
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none', cursor: onThresholdChange ? 'col-resize' : 'default' }}
        >
          <rect x={0} y={0} width={width} height={height} fill="#ffffff" stroke="#e5e7eb" />
          <line x1={0} y1={height} x2={width} y2={0} stroke="#d1d5db" strokeWidth={1} />
          <path d={path} fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
          {Array.from({ length: 4 }, (_, index) => (index + 1) / 5).map((t) => {
            const x = t * width
            const y = (1 - t) * height
            return (
              <g key={t}>
                <line x1={x} y1={0} x2={x} y2={height} stroke="#f3f4f6" strokeWidth={1} />
                <line x1={0} y1={y} x2={width} y2={y} stroke="#f3f4f6" strokeWidth={1} />
              </g>
            )
          })}
          {typeof clampedThreshold === 'number' ? (
            <line
              x1={clampedThreshold * width}
              y1={0}
              x2={clampedThreshold * width}
              y2={height}
              stroke="#1f2937"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          ) : null}
          {activeX !== null && activeY !== null ? (
            <motion.circle
              cx={activeX}
              cy={activeY}
              r={4}
              initial={false}
              animate={{ cx: activeX, cy: activeY }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            />
          ) : null}
        </svg>
        <div className="mt-1 text-xs text-gray-600">
          AUC: {auc === null ? '—' : auc.toFixed(3)} (random ≈ 0.5)
        </div>
      </div>
    </div>
  )
}
