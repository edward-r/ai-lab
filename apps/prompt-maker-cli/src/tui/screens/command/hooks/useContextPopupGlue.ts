import { useCallback, useEffect, useMemo } from 'react'
import { useInput, type Key } from 'ink'

import { useStableCallback } from '../../../hooks/useStableCallback'

import { stripTerminalPasteArtifacts } from '../../../components/core/bracketed-paste'
import { parseAbsolutePathFromInput } from '../../../drag-drop-path'
import { filterDirectorySuggestions, filterFileSuggestions } from '../../../file-suggestions'
import type { CommandDescriptor, PopupState } from '../../../types'

const EMPTY_SUGGESTIONS: string[] = []

export type UseContextPopupGlueOptions = {
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

  setInputValue: (value: string) => void
  setPopupState: (next: PopupState | ((prev: PopupState) => PopupState)) => void
  suppressNextInput: () => void

  notify: (message: string) => void
  pushHistory: (content: string, kind?: 'system' | 'user' | 'progress') => void

  addCommandHistoryEntry: (value: string) => void
  handleCommandSelection: (commandId: CommandDescriptor['id'], argsRaw?: string) => void

  consumeSuppressedTextInputChange: () => boolean

  isFilePath: (candidate: string) => boolean
}

export type UseContextPopupGlueResult = {
  // File
  filePopupSuggestions: string[]
  filePopupSuggestionSelectionIndex: number
  filePopupSuggestionsFocused: boolean
  onFilePopupDraftChange: (next: string) => void
  onAddFile: (value: string) => void
  onRemoveFile: (index: number) => void

  // URL
  onUrlPopupDraftChange: (next: string) => void
  onAddUrl: (value: string) => void
  onRemoveUrl: (index: number) => void

  // Image
  imagePopupSuggestions: string[]
  imagePopupSuggestionSelectionIndex: number
  imagePopupSuggestionsFocused: boolean
  onImagePopupDraftChange: (next: string) => void
  onAddImage: (value: string) => void
  onRemoveImage: (index: number) => void

  // Video
  videoPopupSuggestions: string[]
  videoPopupSuggestionSelectionIndex: number
  videoPopupSuggestionsFocused: boolean
  onVideoPopupDraftChange: (next: string) => void
  onAddVideo: (value: string) => void
  onRemoveVideo: (index: number) => void

  // Smart
  smartPopupSuggestions: string[]
  smartPopupSuggestionSelectionIndex: number
  smartPopupSuggestionsFocused: boolean
  onSmartPopupDraftChange: (next: string) => void
  onSmartToggle: (nextEnabled: boolean) => void
  onSmartRootSubmit: (value: string) => void
}

export const useContextPopupGlue = ({
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
  isFilePath,
}: UseContextPopupGlueOptions): UseContextPopupGlueResult => {
  const addFileToContext = useCallback(
    (value: string): void => {
      const trimmed = value.trim()
      if (!trimmed) {
        return
      }
      if (files.includes(trimmed)) {
        pushHistory(`Context file already added: ${trimmed}`)
        return
      }
      addFile(trimmed)
      pushHistory(`Context file added: ${trimmed}`)
    },
    [addFile, files, pushHistory],
  )

  const addImageToContext = useCallback(
    (value: string): void => {
      const trimmed = value.trim()
      if (!trimmed) {
        return
      }
      if (images.includes(trimmed)) {
        pushHistory(`[image] Already attached: ${trimmed}`)
        return
      }
      addImage(trimmed)
      pushHistory(`[image] Attached: ${trimmed}`)
    },
    [addImage, images, pushHistory],
  )

  const addVideoToContext = useCallback(
    (value: string): void => {
      const trimmed = value.trim()
      if (!trimmed) {
        return
      }
      if (videos.includes(trimmed)) {
        pushHistory(`[video] Already attached: ${trimmed}`)
        return
      }
      addVideo(trimmed)
      pushHistory(`[video] Attached: ${trimmed}`)
    },
    [addVideo, pushHistory, videos],
  )

  const handleSeriesShortcut = useStableCallback((_input: string, key: Key) => {
    if (popupState || isCommandMenuActive || isCommandMode) {
      return
    }
    if (!key.tab || key.shift) {
      return
    }

    if (droppedFilePath) {
      addFileToContext(droppedFilePath)
      suppressNextInput()
      setInputValue('')
      return
    }

    if (isGenerating) {
      pushHistory('Generation already running. Please wait.', 'system')
      return
    }

    const trimmedArgs = inputValue.trim()
    addCommandHistoryEntry(`/series${trimmedArgs ? ` ${trimmedArgs}` : ''}`)
    handleCommandSelection('series', inputValue)
  })

  useInput(handleSeriesShortcut, { isActive: !isPopupOpen && !helpOpen })

  const onAddFile = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) {
        return
      }
      addFileToContext(trimmed)
      setPopupState((prev) =>
        prev?.type === 'file'
          ? {
              ...prev,
              draft: '',
              selectionIndex: Math.max(files.length, 0),
              suggestedFocused: false,
              suggestedSelectionIndex: 0,
            }
          : prev,
      )
    },
    [addFileToContext, files.length, setPopupState],
  )

  useEffect(() => {
    if (popupState?.type !== 'file') {
      return
    }

    const candidate = parseAbsolutePathFromInput(popupState.draft)
    if (!candidate) {
      return
    }

    if (!isFilePath(candidate)) {
      return
    }

    onAddFile(candidate)
  }, [isFilePath, onAddFile, popupState])

  const onRemoveFile = useCallback(
    (index: number) => {
      if (index < 0 || index >= files.length) {
        return
      }
      const target = files[index]
      removeFile(index)
      pushHistory(`Context file removed: ${target}`)
    },
    [files, pushHistory, removeFile],
  )

  const onAddUrl = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) {
        return
      }
      addUrl(trimmed)
      pushHistory(`Context URL added: ${trimmed}`)
      setPopupState((prev) =>
        prev?.type === 'url'
          ? { ...prev, draft: '', selectionIndex: Math.max(urls.length, 0) }
          : prev,
      )
    },
    [addUrl, pushHistory, setPopupState, urls.length],
  )

  const onRemoveUrl = useCallback(
    (index: number) => {
      if (index < 0 || index >= urls.length) {
        return
      }
      const target = urls[index]
      removeUrl(index)
      pushHistory(`Context URL removed: ${target}`)
    },
    [pushHistory, removeUrl, urls],
  )

  const onAddImage = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) {
        return
      }
      addImageToContext(trimmed)
      setPopupState((prev) =>
        prev?.type === 'image'
          ? {
              ...prev,
              draft: '',
              selectionIndex: Math.max(images.length, 0),
              suggestedFocused: false,
              suggestedSelectionIndex: 0,
            }
          : prev,
      )
    },
    [addImageToContext, images.length, setPopupState],
  )

  useEffect(() => {
    if (popupState?.type !== 'image') {
      return
    }

    const candidate = parseAbsolutePathFromInput(popupState.draft)
    if (!candidate) {
      return
    }

    if (!isFilePath(candidate)) {
      return
    }

    onAddImage(candidate)
  }, [isFilePath, onAddImage, popupState])

  const onRemoveImage = useCallback(
    (index: number) => {
      if (index < 0 || index >= images.length) {
        return
      }
      const target = images[index]
      removeImage(index)
      pushHistory(`[image] Removed: ${target}`)
    },
    [images, pushHistory, removeImage],
  )

  const onAddVideo = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) {
        return
      }
      addVideoToContext(trimmed)
      setPopupState((prev) =>
        prev?.type === 'video'
          ? {
              ...prev,
              draft: '',
              selectionIndex: Math.max(videos.length, 0),
              suggestedFocused: false,
              suggestedSelectionIndex: 0,
            }
          : prev,
      )
    },
    [addVideoToContext, setPopupState, videos.length],
  )

  useEffect(() => {
    if (popupState?.type !== 'video') {
      return
    }

    const candidate = parseAbsolutePathFromInput(popupState.draft)
    if (!candidate) {
      return
    }

    if (!isFilePath(candidate)) {
      return
    }

    onAddVideo(candidate)
  }, [isFilePath, onAddVideo, popupState])

  const onRemoveVideo = useCallback(
    (index: number) => {
      if (index < 0 || index >= videos.length) {
        return
      }
      const target = videos[index]
      removeVideo(index)
      pushHistory(`[video] Removed: ${target}`)
    },
    [pushHistory, removeVideo, videos],
  )

  const onSmartToggle = useCallback(
    (nextEnabled: boolean) => {
      if (smartContextEnabled === nextEnabled) {
        return
      }

      const shouldClearRoot = !nextEnabled && Boolean(smartContextRoot)

      if (shouldClearRoot) {
        setSmartRoot('')
        setPopupState((prev) =>
          prev?.type === 'smart' && prev.draft === smartContextRoot
            ? {
                ...prev,
                draft: '',
                suggestedFocused: false,
                suggestedSelectionIndex: 0,
              }
            : prev,
        )
      }

      toggleSmartContext()

      notify(
        nextEnabled
          ? 'Smart context enabled'
          : shouldClearRoot
            ? 'Smart context disabled; root cleared'
            : 'Smart context disabled',
      )
    },
    [
      notify,
      setPopupState,
      setSmartRoot,
      smartContextEnabled,
      smartContextRoot,
      toggleSmartContext,
    ],
  )

  const onSmartRootSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      const shouldEnable = Boolean(trimmed) && !smartContextEnabled

      setSmartRoot(trimmed)

      if (shouldEnable) {
        toggleSmartContext()
      }

      notify(
        trimmed
          ? shouldEnable
            ? `Smart context enabled; root set to ${trimmed}`
            : `Smart context root set to ${trimmed}`
          : 'Smart context root cleared',
      )

      if (trimmed) {
        setPopupState((prev) => (prev?.type === 'smart' ? null : prev))
        return
      }

      setPopupState((prev) =>
        prev?.type === 'smart'
          ? {
              ...prev,
              draft: trimmed,
              suggestedFocused: false,
              suggestedSelectionIndex: 0,
            }
          : prev,
      )
    },
    [notify, setPopupState, setSmartRoot, smartContextEnabled, toggleSmartContext],
  )

  const filePopupDraft = popupState?.type === 'file' ? popupState.draft : ''
  const filePopupSuggestedItems =
    popupState?.type === 'file' ? popupState.suggestedItems : EMPTY_SUGGESTIONS
  const filePopupSuggestedFocused =
    popupState?.type === 'file' ? popupState.suggestedFocused : false
  const filePopupSuggestedSelectionIndex =
    popupState?.type === 'file' ? popupState.suggestedSelectionIndex : 0

  const filePopupSuggestions = useMemo(() => {
    if (!filePopupSuggestedItems.length) {
      return []
    }
    return filterFileSuggestions({
      suggestions: filePopupSuggestedItems,
      query: filePopupDraft,
      exclude: files,
    })
  }, [filePopupDraft, filePopupSuggestedItems, files])

  const filePopupSuggestionSelectionIndex = Math.min(
    filePopupSuggestedSelectionIndex,
    Math.max(filePopupSuggestions.length - 1, 0),
  )

  const filePopupSuggestionsFocused = filePopupSuggestedFocused && filePopupSuggestions.length > 0

  useEffect(() => {
    if (popupState?.type !== 'file') {
      return
    }
    if (!filePopupSuggestedFocused) {
      return
    }
    if (filePopupSuggestions.length > 0) {
      return
    }
    setPopupState((prev) =>
      prev?.type === 'file'
        ? { ...prev, suggestedFocused: false, suggestedSelectionIndex: 0 }
        : prev,
    )
  }, [filePopupSuggestedFocused, filePopupSuggestions.length, popupState?.type, setPopupState])

  const imagePopupDraft = popupState?.type === 'image' ? popupState.draft : ''
  const imagePopupSuggestedItems =
    popupState?.type === 'image' ? popupState.suggestedItems : EMPTY_SUGGESTIONS
  const imagePopupSuggestedFocused =
    popupState?.type === 'image' ? popupState.suggestedFocused : false
  const imagePopupSuggestedSelectionIndex =
    popupState?.type === 'image' ? popupState.suggestedSelectionIndex : 0

  const imagePopupSuggestions = useMemo(() => {
    if (!imagePopupSuggestedItems.length) {
      return []
    }
    return filterFileSuggestions({
      suggestions: imagePopupSuggestedItems,
      query: imagePopupDraft,
      exclude: images,
    })
  }, [imagePopupDraft, imagePopupSuggestedItems, images])

  const imagePopupSuggestionSelectionIndex = Math.min(
    imagePopupSuggestedSelectionIndex,
    Math.max(imagePopupSuggestions.length - 1, 0),
  )

  const imagePopupSuggestionsFocused =
    imagePopupSuggestedFocused && imagePopupSuggestions.length > 0

  useEffect(() => {
    if (popupState?.type !== 'image') {
      return
    }
    if (!imagePopupSuggestedFocused) {
      return
    }
    if (imagePopupSuggestions.length > 0) {
      return
    }
    setPopupState((prev) =>
      prev?.type === 'image'
        ? { ...prev, suggestedFocused: false, suggestedSelectionIndex: 0 }
        : prev,
    )
  }, [imagePopupSuggestedFocused, imagePopupSuggestions.length, popupState?.type, setPopupState])

  const videoPopupDraft = popupState?.type === 'video' ? popupState.draft : ''
  const videoPopupSuggestedItems =
    popupState?.type === 'video' ? popupState.suggestedItems : EMPTY_SUGGESTIONS
  const videoPopupSuggestedFocused =
    popupState?.type === 'video' ? popupState.suggestedFocused : false
  const videoPopupSuggestedSelectionIndex =
    popupState?.type === 'video' ? popupState.suggestedSelectionIndex : 0

  const videoPopupSuggestions = useMemo(() => {
    if (!videoPopupSuggestedItems.length) {
      return []
    }
    return filterFileSuggestions({
      suggestions: videoPopupSuggestedItems,
      query: videoPopupDraft,
      exclude: videos,
    })
  }, [videoPopupDraft, videoPopupSuggestedItems, videos])

  const videoPopupSuggestionSelectionIndex = Math.min(
    videoPopupSuggestedSelectionIndex,
    Math.max(videoPopupSuggestions.length - 1, 0),
  )

  const videoPopupSuggestionsFocused =
    videoPopupSuggestedFocused && videoPopupSuggestions.length > 0

  useEffect(() => {
    if (popupState?.type !== 'video') {
      return
    }
    if (!videoPopupSuggestedFocused) {
      return
    }
    if (videoPopupSuggestions.length > 0) {
      return
    }
    setPopupState((prev) =>
      prev?.type === 'video'
        ? { ...prev, suggestedFocused: false, suggestedSelectionIndex: 0 }
        : prev,
    )
  }, [popupState?.type, setPopupState, videoPopupSuggestedFocused, videoPopupSuggestions.length])

  const smartPopupDraft = popupState?.type === 'smart' ? popupState.draft : ''
  const smartPopupSuggestedItems =
    popupState?.type === 'smart' ? popupState.suggestedItems : EMPTY_SUGGESTIONS
  const smartPopupSuggestedFocused =
    popupState?.type === 'smart' ? popupState.suggestedFocused : false
  const smartPopupSuggestedSelectionIndex =
    popupState?.type === 'smart' ? popupState.suggestedSelectionIndex : 0

  const smartPopupSuggestions = useMemo(() => {
    if (!smartPopupSuggestedItems.length) {
      return []
    }

    const excluded = smartContextRoot ? [smartContextRoot] : []

    return filterDirectorySuggestions({
      suggestions: smartPopupSuggestedItems,
      query: smartPopupDraft,
      exclude: excluded,
    })
  }, [smartContextRoot, smartPopupDraft, smartPopupSuggestedItems])

  const smartPopupSuggestionSelectionIndex = Math.min(
    smartPopupSuggestedSelectionIndex,
    Math.max(smartPopupSuggestions.length - 1, 0),
  )

  const smartPopupSuggestionsFocused =
    smartPopupSuggestedFocused && smartPopupSuggestions.length > 0

  useEffect(() => {
    if (popupState?.type !== 'smart') {
      return
    }
    if (!smartPopupSuggestedFocused) {
      return
    }
    if (smartPopupSuggestions.length > 0) {
      return
    }
    setPopupState((prev) =>
      prev?.type === 'smart'
        ? { ...prev, suggestedFocused: false, suggestedSelectionIndex: 0 }
        : prev,
    )
  }, [popupState?.type, setPopupState, smartPopupSuggestedFocused, smartPopupSuggestions.length])

  const onFilePopupDraftChange = useCallback(
    (next: string) => {
      if (consumeSuppressedTextInputChange()) {
        return
      }

      const sanitized = stripTerminalPasteArtifacts(next)

      setPopupState((prev) =>
        prev?.type === 'file'
          ? {
              ...prev,
              draft: sanitized,
              suggestedSelectionIndex: 0,
              suggestedFocused: false,
            }
          : prev,
      )
    },
    [consumeSuppressedTextInputChange, setPopupState],
  )

  const onImagePopupDraftChange = useCallback(
    (next: string) => {
      if (consumeSuppressedTextInputChange()) {
        return
      }

      const sanitized = stripTerminalPasteArtifacts(next)

      setPopupState((prev) =>
        prev?.type === 'image'
          ? {
              ...prev,
              draft: sanitized,
              suggestedSelectionIndex: 0,
              suggestedFocused: false,
            }
          : prev,
      )
    },
    [consumeSuppressedTextInputChange, setPopupState],
  )

  const onVideoPopupDraftChange = useCallback(
    (next: string) => {
      if (consumeSuppressedTextInputChange()) {
        return
      }

      const sanitized = stripTerminalPasteArtifacts(next)

      setPopupState((prev) =>
        prev?.type === 'video'
          ? {
              ...prev,
              draft: sanitized,
              suggestedSelectionIndex: 0,
              suggestedFocused: false,
            }
          : prev,
      )
    },
    [consumeSuppressedTextInputChange, setPopupState],
  )

  const onSmartPopupDraftChange = useCallback(
    (next: string) => {
      if (consumeSuppressedTextInputChange()) {
        return
      }

      const sanitized = stripTerminalPasteArtifacts(next)

      setPopupState((prev) =>
        prev?.type === 'smart'
          ? {
              ...prev,
              draft: sanitized,
              suggestedSelectionIndex: 0,
              suggestedFocused: false,
            }
          : prev,
      )
    },
    [consumeSuppressedTextInputChange, setPopupState],
  )

  const onUrlPopupDraftChange = useCallback(
    (next: string) => {
      if (consumeSuppressedTextInputChange()) {
        return
      }
      setPopupState((prev) => (prev?.type === 'url' ? { ...prev, draft: next } : prev))
    },
    [consumeSuppressedTextInputChange, setPopupState],
  )

  return {
    filePopupSuggestions,
    filePopupSuggestionSelectionIndex,
    filePopupSuggestionsFocused,
    onFilePopupDraftChange,
    onAddFile,
    onRemoveFile,
    onUrlPopupDraftChange,
    onAddUrl,
    onRemoveUrl,
    imagePopupSuggestions,
    imagePopupSuggestionSelectionIndex,
    imagePopupSuggestionsFocused,
    onImagePopupDraftChange,
    onAddImage,
    onRemoveImage,
    videoPopupSuggestions,
    videoPopupSuggestionSelectionIndex,
    videoPopupSuggestionsFocused,
    onVideoPopupDraftChange,
    onAddVideo,
    onRemoveVideo,
    smartPopupSuggestions,
    smartPopupSuggestionSelectionIndex,
    smartPopupSuggestionsFocused,
    onSmartPopupDraftChange,
    onSmartToggle,
    onSmartRootSubmit,
  }
}
