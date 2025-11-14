import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const elRef = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const element = document.createElement('div')
    elRef.current = element
    document.body.appendChild(element)
    setMounted(true)

    return () => {
      if (elRef.current) {
        document.body.removeChild(elRef.current)
      }
    }
  }, [])

  if (!mounted || !elRef.current) {
    return null
  }

  return createPortal(children, elRef.current)
}
