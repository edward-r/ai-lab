import React, { useMemo } from 'react'

type SparklineLossProps = {
  values: number[]
  width?: number
  height?: number
  strokeWidth?: number
  showStats?: boolean
}

type SparklineSummary = {
  path: string
  min: number
  max: number
  last: number
}

const summarizeValues = (values: number[], width: number, height: number): SparklineSummary => {
  if (values.length === 0) {
    return { path: '', min: 0, max: 0, last: 0 }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const coordinates = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width
    const y = height - ((value - min) / span) * height
    return `${index === 0 ? 'M' : 'L'}${x},${y}`
  })

  return {
    path: coordinates.join(' '),
    min,
    max,
    last: values[values.length - 1] ?? 0,
  }
}

export const SparklineLoss: React.FC<SparklineLossProps> = ({
  values,
  width = 720,
  height = 60,
  strokeWidth = 2,
  showStats = true,
}) => {
  const summary = useMemo(() => summarizeValues(values, width, height), [values, width, height])

  return (
    <div className="w-full">
      <svg width={width} height={height} role="img" aria-label="loss trend">
        <path d={summary.path} fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
      </svg>
      {showStats ? (
        <div className="mt-1 flex gap-4 text-xs text-gray-600">
          <span>lossₘᵢₙ: {summary.min.toFixed(4)}</span>
          <span>lossₘₐₓ: {summary.max.toFixed(4)}</span>
          <span>lossₗₐₛₜ: {summary.last.toFixed(4)}</span>
        </div>
      ) : null}
    </div>
  )
}
