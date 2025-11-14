import React from 'react'

export type DialProps = {
  value: number
  min: number
  max: number
  step: number
  label: string
  onChange: (v: number) => void
}

export function Dial({ value, min, max, step, label, onChange }: DialProps): JSX.Element {
  const angle = ((value - min) / (max - min)) * 270 - 135
  const handleReset = () => {
    const clampedZero = Math.min(max, Math.max(min, 0))
    onChange(clampedZero)
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative h-16 w-16 rounded-full border border-transparent focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500"
        onDoubleClick={handleReset}
      >
        <div className="absolute inset-0 rounded-full border bg-gray-200" />
        <div
          className="pointer-origin-bottom absolute left-1/2 h-8 w-1 origin-bottom bg-black"
          style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 cursor-grab opacity-0 focus-visible:outline-none"
          aria-label={label}
        />
      </div>
      <span className="mt-1 text-xs">
        {label}: {value.toFixed(2)}
      </span>
    </div>
  )
}
