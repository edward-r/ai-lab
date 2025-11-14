import React, { useContext, useId, useState } from 'react'
import { HELP, HelpKey } from './helpText'

const InfoTipContext = React.createContext<boolean>(true)

type ProviderProps = {
  enabled: boolean
  children: React.ReactNode
}

export const InfoTipProvider: React.FC<ProviderProps> = ({ enabled, children }) => (
  <InfoTipContext.Provider value={enabled}>{children}</InfoTipContext.Provider>
)

type Props = { k: HelpKey; className?: string }
export const InfoTip: React.FC<Props> = ({ k, className }) => {
  const label = HELP[k]
  const [open, setOpen] = useState<boolean>(false)
  const tooltipId = useId()
  const enabled = useContext(InfoTipContext)

  if (!enabled) {
    return null
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>): void => {
    if (event.key === 'Escape') {
      setOpen(false)
      event.currentTarget.blur()
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen((current) => !current)
    }
  }

  const handleBlur = (): void => {
    setOpen(false)
  }

  return (
    <span className={`group relative inline-flex align-middle ${className ?? ''}`}>
      <span
        tabIndex={0}
        role="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={tooltipId}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] leading-none select-none"
      >
        i
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className={`absolute z-40 mt-2 w-72 max-w-[80vw] rounded border bg-white p-2 text-xs shadow transition-opacity duration-100 ${
          open ? 'visible opacity-100' : 'invisible opacity-0'
        } group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100`}
      >
        {label}
      </span>
    </span>
  )
}
