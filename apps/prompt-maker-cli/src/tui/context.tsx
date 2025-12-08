import React, { createContext, useCallback, useContext, useState } from 'react'

export type ContextSourceState = {
  files: string[]
  urls: string[]
  smartContextEnabled: boolean
  smartContextRoot: string | null
}

const ContextStateContext = createContext<ContextSourceState | null>(null)

const ContextDispatchContext = createContext<{
  addFile: (value: string) => void
  removeFile: (index: number) => void
  addUrl: (value: string) => void
  removeUrl: (index: number) => void
  toggleSmartContext: () => void
  setSmartRoot: (value: string) => void
} | null>(null)

export const ContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<string[]>([])
  const [urls, setUrls] = useState<string[]>([])
  const [smartContextEnabled, setSmartContextEnabled] = useState(false)
  const [smartContextRoot, setSmartContextRoot] = useState<string | null>(null)

  const addFile = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return
    }
    setFiles((prev) => [...prev, trimmed])
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index))
  }, [])

  const addUrl = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return
    }
    setUrls((prev) => [...prev, trimmed])
  }, [])

  const removeUrl = useCallback((index: number) => {
    setUrls((prev) => prev.filter((_, idx) => idx !== index))
  }, [])

  const toggleSmartContext = useCallback(() => {
    setSmartContextEnabled((prev) => !prev)
  }, [])

  const setSmartRoot = useCallback((value: string) => {
    const trimmed = value.trim()
    setSmartContextRoot(trimmed.length > 0 ? trimmed : null)
  }, [])

  return (
    <ContextStateContext.Provider value={{ files, urls, smartContextEnabled, smartContextRoot }}>
      <ContextDispatchContext.Provider
        value={{ addFile, removeFile, addUrl, removeUrl, toggleSmartContext, setSmartRoot }}
      >
        {children}
      </ContextDispatchContext.Provider>
    </ContextStateContext.Provider>
  )
}

export const useContextState = (): ContextSourceState => {
  const context = useContext(ContextStateContext)
  if (!context) {
    throw new Error('useContextState must be used within ContextProvider')
  }
  return context
}

export const useContextDispatch = () => {
  const context = useContext(ContextDispatchContext)
  if (!context) {
    throw new Error('useContextDispatch must be used within ContextProvider')
  }
  return context
}
