import { useCallback, useEffect, useMemo } from 'react'
import { useInput } from 'ink'

import { stripTerminalPasteArtifacts } from '../../../components/core/bracketed-paste'
import { parseAbsolutePathFromInput } from '../../../drag-drop-path'
import { filterDirectorySuggestions, filterFileSuggestions } from '../../../file-suggestions'
import type { CommandDescriptor, PopupState } from '../../../types'

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
  smartContextEnabled: boolean
  smartContextRoot: string | null

  addFile: (value: string) => void
  removeFile: (index: number) => void
  addUrl: (value: string) => void
  removeUrl: (index: number) => void

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
  smartContextEnabled,
  smartContextRoot,
  addFile,
  removeFile,
  addUrl,
  removeUrl,
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

  useInput(
    (_input, key) => {
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
    },
    { isActive: !isPopupOpen && !helpOpen },
  )

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

  const onSmartToggle = useCallback(
    (nextEnabled: boolean) => {
      if (smartContextEnabled === nextEnabled) {
        return
      }
      toggleSmartContext()
      notify(`Smart context ${nextEnabled ? 'enabled' : 'disabled'}`)
    },
    [notify, smartContextEnabled, toggleSmartContext],
  )

  const onSmartRootSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      setSmartRoot(trimmed)
      notify(trimmed ? `Smart context root set to ${trimmed}` : 'Smart context root cleared')
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
    [notify, setPopupState, setSmartRoot],
  )

  const filePopupDraft = popupState?.type === 'file' ? popupState.draft : ''
  const filePopupSuggestedItems = popupState?.type === 'file' ? popupState.suggestedItems : []
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

  const smartPopupDraft = popupState?.type === 'smart' ? popupState.draft : ''
  const smartPopupSuggestedItems = popupState?.type === 'smart' ? popupState.suggestedItems : []
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
    smartPopupSuggestions,
    smartPopupSuggestionSelectionIndex,
    smartPopupSuggestionsFocused,
    onSmartPopupDraftChange,
    onSmartToggle,
    onSmartRootSubmit,
  }
}
