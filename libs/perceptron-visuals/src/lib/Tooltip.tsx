import React from 'react'

export type TooltipProps = {
  label: string
  children?: React.ReactNode
}

export const Tooltip: React.FC<TooltipProps> = ({ label, children }) => (
  <span className="group relative inline-flex items-center align-middle">
    <span
      aria-label={label}
      tabIndex={0}
      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px]"
    >
      i
    </span>
    <span
      role="tooltip"
      className="invisible group-hover:visible group-focus-within:visible absolute z-10 mt-6 w-64 rounded border bg-white p-2 text-xs shadow"
    >
      {children ?? label}
    </span>
  </span>
)
