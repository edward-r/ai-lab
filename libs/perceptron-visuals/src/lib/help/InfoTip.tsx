import React, { useContext, useId, useLayoutEffect, useRef, useState } from 'react'
import { HELP, HelpKey } from './helpText'
import { Portal } from '../ui/Portal'

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
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const tooltipId = useId()
  const enabled = useContext(InfoTipContext)
  const triggerRef = useRef<HTMLSpanElement | null>(null)

  useLayoutEffect(() => {
    if (!enabled || !open || !triggerRef.current) {
      return
    }

    const rect = triggerRef.current.getBoundingClientRect()
    const top = rect.bottom + 8
    const left = rect.left

    setPosition({ top, left })
  }, [enabled, open])

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

  const handleMouseEnter = (): void => {
    setOpen(true)
  }

  const handleMouseLeave = (): void => {
    setOpen(false)
  }

  if (!enabled) {
    return null
  }

  return (
    <span className={`group relative inline-flex align-middle ${className ?? ''}`}>
      <span
        ref={triggerRef}
        tabIndex={0}
        role="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={tooltipId}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] leading-none select-none"
      >
        i
      </span>
      <Portal>
        {open && position ? (
          <span
            id={tooltipId}
            role="tooltip"
            style={{ top: position.top, left: position.left }}
            className="fixed z-50 w-72 max-w-[80vw] rounded border bg-white p-2 text-xs shadow-lg"
          >
            {label}
          </span>
        ) : null}
      </Portal>
    </span>
  )
}
