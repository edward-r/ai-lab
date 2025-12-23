import fs from 'node:fs'

import type { PopupState } from '../../../types'

import { useContextPopupGlue } from './useContextPopupGlue'

export type UseCommandScreenContextPopupBindingsOptions = {
  inputValue: string
  popupState: PopupState
  helpOpen: boolean
  isPopupOpen: boolean

  isCommandMode: boolean
  isCommandMenuActive: boolean
  isGenerating: boolean

  droppedFilePath: string | null

  files: string[]
  urls: string[]
  images: string[]
  videos: string[]
  smartContextEnabled: boolean
  smartContextRoot: string | null

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

  setInputValue: (value: string | ((prev: string) => string)) => void
  setPopupState: import('react').Dispatch<import('react').SetStateAction<PopupState>>
  suppressNextInput: () => void

  notify: (message: string) => void
  pushHistory: (content: string, kind?: 'system' | 'user' | 'progress') => void

  addCommandHistoryEntry: (value: string) => void
  handleCommandSelection: (
    commandId: import('../../../types').CommandDescriptor['id'],
    argsRaw?: string,
  ) => void

  consumeSuppressedTextInputChange: () => boolean
}

export type UseCommandScreenContextPopupBindingsResult = ReturnType<typeof useContextPopupGlue>

export const useCommandScreenContextPopupBindings = ({
  inputValue,
  popupState,
  helpOpen,
  isPopupOpen,
  isCommandMode,
  isCommandMenuActive,
  isGenerating,
  droppedFilePath,
  files,
  urls,
  images,
  videos,
  smartContextEnabled,
  smartContextRoot,
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
  setInputValue,
  setPopupState,
  suppressNextInput,
  notify,
  pushHistory,
  addCommandHistoryEntry,
  handleCommandSelection,
  consumeSuppressedTextInputChange,
}: UseCommandScreenContextPopupBindingsOptions): UseCommandScreenContextPopupBindingsResult => {
  return useContextPopupGlue({
    inputValue,
    popupState,
    helpOpen,
    isPopupOpen,
    isCommandMode,
    isCommandMenuActive,
    isGenerating,
    droppedFilePath,
    files,
    urls,
    images,
    videos,
    smartContextEnabled,
    smartContextRoot,
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
    setInputValue,
    setPopupState,
    suppressNextInput,
    notify,
    pushHistory,
    addCommandHistoryEntry,
    handleCommandSelection,
    consumeSuppressedTextInputChange,
    isFilePath: (candidate: string) => {
      try {
        const stats = fs.statSync(candidate)
        return stats.isFile()
      } catch {
        return false
      }
    },
  })
}
