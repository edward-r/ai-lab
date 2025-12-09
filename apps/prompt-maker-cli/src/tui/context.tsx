import React, { createContext, useCallback, useContext, useState } from 'react'

export type ContextSourceState = {
  files: string[]
  urls: string[]
  images: string[]
  videos: string[]
  smartContextEnabled: boolean
  smartContextRoot: string | null
}

type ContextDispatch = {
  addFile: (value: string) => void
  removeFile: (index: number) => void
  addUrl: (value: string) => void
  removeUrl: (index: number) => void
  addImage: (value: string) => void
  removeImage: (index: number) => void
  addVideo: (value: string) => void
  removeVideo: (index: number) => void
  toggleSmartContext: () => void
  setSmartRoot: (value: string) => void
}

const ContextStateContext = createContext<ContextSourceState | null>(null)
const ContextDispatchContext = createContext<ContextDispatch | null>(null)

export const ContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<string[]>([])
  const [urls, setUrls] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [smartContextEnabled, setSmartContextEnabled] = useState(false)
  const [smartContextRoot, setSmartContextRoot] = useState<string | null>(null)

  const addEntry = useCallback(
    (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
      const trimmed = value.trim()
      if (!trimmed) {
        return
      }
      setter((prev) => [...prev, trimmed])
    },
    [],
  )

  const removeEntry = useCallback(
    (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
      setter((prev) => prev.filter((_, idx) => idx !== index))
    },
    [],
  )

  const addFile = useCallback((value: string) => addEntry(value, setFiles), [addEntry])
  const removeFile = useCallback((index: number) => removeEntry(index, setFiles), [removeEntry])

  const addUrl = useCallback((value: string) => addEntry(value, setUrls), [addEntry])
  const removeUrl = useCallback((index: number) => removeEntry(index, setUrls), [removeEntry])

  const addImage = useCallback((value: string) => addEntry(value, setImages), [addEntry])
  const removeImage = useCallback((index: number) => removeEntry(index, setImages), [removeEntry])

  const addVideo = useCallback((value: string) => addEntry(value, setVideos), [addEntry])
  const removeVideo = useCallback((index: number) => removeEntry(index, setVideos), [removeEntry])

  const toggleSmartContext = useCallback(() => {
    setSmartContextEnabled((prev) => !prev)
  }, [])

  const setSmartRoot = useCallback((value: string) => {
    const trimmed = value.trim()
    setSmartContextRoot(trimmed.length > 0 ? trimmed : null)
  }, [])

  return (
    <ContextStateContext.Provider
      value={{ files, urls, images, videos, smartContextEnabled, smartContextRoot }}
    >
      <ContextDispatchContext.Provider
        value={{
          addFile,
          removeFile,
          addUrl,
          removeUrl,
          addImage,
          removeImage,
          addVideo,
          removeVideo,
          toggleSmartContext,
          setSmartRoot,
        }}
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

export const useContextDispatch = (): ContextDispatch => {
  const context = useContext(ContextDispatchContext)
  if (!context) {
    throw new Error('useContextDispatch must be used within ContextProvider')
  }
  return context
}
