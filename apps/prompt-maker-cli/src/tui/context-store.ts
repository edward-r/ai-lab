import { createContext, useContext } from 'react'

export type ContextSourceState = {
  files: string[]
  urls: string[]
  images: string[]
  videos: string[]
  smartContextEnabled: boolean
  smartContextRoot: string | null
  metaInstructions: string
  lastReasoning: string | null
  lastGeneratedPrompt: string | null
}

export type ContextDispatch = {
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
  setMetaInstructions: (value: string) => void
  setLastReasoning: (value: string | null) => void
  setLastGeneratedPrompt: (value: string | null) => void
  resetContext: () => void
}

export const ContextStateContext = createContext<ContextSourceState | null>(null)
export const ContextDispatchContext = createContext<ContextDispatch | null>(null)

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
