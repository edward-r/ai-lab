import React from 'react'
import { clsx } from 'clsx'

export type LedProps = { on: boolean; size?: 'sm' | 'md' }

export function Led({ on, size = 'sm' }: LedProps): JSX.Element {
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'
  return (
    <div
      className={clsx(
        dim,
        'rounded-full border transition-shadow',
        on ? 'bg-green-400 shadow-lg' : 'bg-gray-400',
      )}
    />
  )
}
