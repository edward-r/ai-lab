import React, { useMemo } from 'react'
import type { RocPoint } from './metrics'

type RocCurveProps = {
  points: RocPoint[]
  auc: number | null
  width?: number
  height?: number
  strokeWidth?: number
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
}) => {
  const path = useMemo(() => buildPath(points, width, height), [points, width, height])

  return (
    <div className="space-y-2">
      <svg width={width} height={height} role="img" aria-label="ROC curve">
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
      </svg>
      <div className="text-xs text-gray-600">
        AUC: {auc === null ? '—' : auc.toFixed(3)} (random ≈ 0.5)
      </div>
    </div>
  )
}
