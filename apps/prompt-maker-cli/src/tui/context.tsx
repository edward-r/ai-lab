import React, { useCallback, useState } from 'react'
import { ContextDispatchContext, ContextStateContext } from './context-store'

export const ContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<string[]>([])
  const [urls, setUrls] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [smartContextEnabled, setSmartContextEnabled] = useState(false)
  const [smartContextRoot, setSmartContextRoot] = useState<string | null>(null)
  const [metaInstructions, setMetaInstructions] = useState('')
  const [lastReasoning, setLastReasoning] = useState<string | null>(null)
  const [lastGeneratedPrompt, setLastGeneratedPrompt] = useState<string | null>(null)

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

  const resetContext = useCallback(() => {
    setFiles([])
    setUrls([])
    setImages([])
    setVideos([])
    setSmartContextEnabled(false)
    setSmartContextRoot(null)
    setMetaInstructions('')
    setLastReasoning(null)
  }, [])

  return (
    <ContextStateContext.Provider
      value={{
        files,
        urls,
        images,
        videos,
        smartContextEnabled,
        smartContextRoot,
        metaInstructions,
        lastReasoning,
        lastGeneratedPrompt,
      }}
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
          setMetaInstructions,
          setLastReasoning,
          setLastGeneratedPrompt,
          resetContext,
        }}
      >
        {children}
      </ContextDispatchContext.Provider>
    </ContextStateContext.Provider>
  )
}
