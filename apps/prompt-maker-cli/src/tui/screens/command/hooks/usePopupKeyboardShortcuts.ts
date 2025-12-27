import { useInput, type Key } from 'ink'
import type { Dispatch, SetStateAction } from 'react'

import { useStableCallback } from '../../../hooks/useStableCallback'

import { isBackspaceKey } from '../../../components/core/text-input-keys'
import type { HistoryEntry, ModelOption, PopupState } from '../../../types'

import { isControlKey } from '../utils/control-key'

export type UsePopupKeyboardShortcutsOptions = {
  popupState: PopupState
  helpOpen: boolean
  setPopupState: Dispatch<SetStateAction<PopupState>>
  closePopup: () => void

  // model
  modelPopupOptions: ModelOption[]
  onModelPopupSubmit: (option?: ModelOption) => void

  // toggle
  applyToggleSelection: (field: 'polish' | 'copy' | 'chatgpt' | 'json', value: boolean) => void

  // theme
  themeCount: number
  onThemeConfirm: () => void
  onThemeCancel: () => void

  // theme mode
  themeModeCount: number
  onThemeModeConfirm: () => void
  onThemeModeCancel: () => void

  // file
  files: string[]
  filePopupSuggestions: string[]
  onRemoveFile: (index: number) => void

  // url
  urls: string[]
  onRemoveUrl: (index: number) => void

  // image
  images: string[]
  imagePopupSuggestions: string[]
  onRemoveImage: (index: number) => void

  // video
  videos: string[]
  videoPopupSuggestions: string[]
  onRemoveVideo: (index: number) => void

  // history
  historyPopupItems: string[]

  // smart
  smartPopupSuggestions: string[]
  smartContextRoot: string | null
  onSmartRootSubmit: (value: string) => void

  // intent
  intentPopupSuggestions: string[]
  onIntentFileSubmit: (value: string) => void

  // reasoning
  reasoningPopupLines: HistoryEntry[]
  reasoningPopupVisibleRows: number
}

export const usePopupKeyboardShortcuts = ({
  popupState,
  helpOpen,
  setPopupState,
  closePopup,
  modelPopupOptions,
  onModelPopupSubmit,
  applyToggleSelection,
  themeCount,
  onThemeConfirm,
  onThemeCancel,
  themeModeCount,
  onThemeModeConfirm,
  onThemeModeCancel,
  files,

  filePopupSuggestions,
  onRemoveFile,
  urls,
  onRemoveUrl,
  images,
  imagePopupSuggestions,
  onRemoveImage,
  videos,
  videoPopupSuggestions,
  onRemoveVideo,
  historyPopupItems,
  smartPopupSuggestions,
  smartContextRoot,
  onSmartRootSubmit,
  intentPopupSuggestions,
  onIntentFileSubmit,
  reasoningPopupLines,
  reasoningPopupVisibleRows,
}: UsePopupKeyboardShortcutsOptions): void => {
  const isActive = popupState !== null && !helpOpen

  const handlePopupKey = useStableCallback((input: string, key: Key) => {
    if (!popupState) {
      return
    }

    if (popupState.type === 'model') {
      const options = modelPopupOptions
      const modelSelectionIndex = Math.min(
        popupState.selectionIndex,
        Math.max(options.length - 1, 0),
      )

      if (key.upArrow && options.length > 0) {
        setPopupState((prev) =>
          prev?.type === 'model'
            ? {
                ...prev,
                selectionIndex: (prev.selectionIndex - 1 + options.length) % options.length,
              }
            : prev,
        )
        return
      }
      if (key.downArrow && options.length > 0) {
        setPopupState((prev) =>
          prev?.type === 'model'
            ? {
                ...prev,
                selectionIndex: (prev.selectionIndex + 1) % options.length,
              }
            : prev,
        )
        return
      }
      if (key.escape) {
        closePopup()
        return
      }
      if (key.return) {
        onModelPopupSubmit(options[modelSelectionIndex])
      }
      return
    }

    if (popupState.type === 'toggle') {
      const options = ['On', 'Off']
      if (key.leftArrow || key.upArrow) {
        setPopupState((prev) =>
          prev?.type === 'toggle'
            ? {
                ...prev,
                selectionIndex: (prev.selectionIndex - 1 + options.length) % options.length,
              }
            : prev,
        )
        return
      }
      if (key.rightArrow || key.downArrow) {
        setPopupState((prev) =>
          prev?.type === 'toggle'
            ? {
                ...prev,
                selectionIndex: (prev.selectionIndex + 1) % options.length,
              }
            : prev,
        )
        return
      }
      if (key.escape) {
        closePopup()
        return
      }
      if (key.return) {
        applyToggleSelection(popupState.field, popupState.selectionIndex === 0)
      }
      return
    }

    if (popupState.type === 'theme') {
      if (key.upArrow && themeCount > 0) {
        setPopupState((prev) =>
          prev?.type === 'theme'
            ? {
                ...prev,
                selectionIndex: (prev.selectionIndex - 1 + themeCount) % themeCount,
              }
            : prev,
        )
        return
      }

      if (key.downArrow && themeCount > 0) {
        setPopupState((prev) =>
          prev?.type === 'theme'
            ? {
                ...prev,
                selectionIndex: (prev.selectionIndex + 1) % themeCount,
              }
            : prev,
        )
        return
      }

      if (key.escape) {
        onThemeCancel()
        return
      }

      if (key.return) {
        onThemeConfirm()
      }
      return
    }

    if (popupState.type === 'themeMode') {
      if ((key.leftArrow || key.upArrow) && themeModeCount > 0) {
        setPopupState((prev) =>
          prev?.type === 'themeMode'
            ? {
                ...prev,
                selectionIndex: (prev.selectionIndex - 1 + themeModeCount) % themeModeCount,
              }
            : prev,
        )
        return
      }

      if ((key.rightArrow || key.downArrow) && themeModeCount > 0) {
        setPopupState((prev) =>
          prev?.type === 'themeMode'
            ? {
                ...prev,
                selectionIndex: (prev.selectionIndex + 1) % themeModeCount,
              }
            : prev,
        )
        return
      }

      if (key.escape) {
        onThemeModeCancel()
        return
      }

      if (key.return) {
        onThemeModeConfirm()
      }
      return
    }

    if (popupState.type === 'file') {
      const hasSuggestions = filePopupSuggestions.length > 0
      const maxSuggestedIndex = Math.max(filePopupSuggestions.length - 1, 0)
      const effectiveSuggestedIndex = Math.min(
        popupState.suggestedSelectionIndex,
        maxSuggestedIndex,
      )
      const draftIsEmpty = popupState.draft.trim().length === 0

      if (key.escape) {
        closePopup()
        return
      }

      if (popupState.suggestedFocused && hasSuggestions) {
        if (key.tab) {
          setPopupState((prev) =>
            prev?.type === 'file' ? { ...prev, suggestedFocused: false } : prev,
          )
          return
        }

        if (key.upArrow) {
          if (effectiveSuggestedIndex === 0) {
            setPopupState((prev) =>
              prev?.type === 'file' ? { ...prev, suggestedFocused: false } : prev,
            )
            return
          }

          setPopupState((prev) =>
            prev?.type === 'file'
              ? {
                  ...prev,
                  suggestedSelectionIndex: Math.max(prev.suggestedSelectionIndex - 1, 0),
                }
              : prev,
          )
          return
        }

        if (key.downArrow) {
          setPopupState((prev) =>
            prev?.type === 'file'
              ? {
                  ...prev,
                  suggestedSelectionIndex: Math.min(
                    prev.suggestedSelectionIndex + 1,
                    maxSuggestedIndex,
                  ),
                }
              : prev,
          )
          return
        }

        if (key.return) {
          const selection = filePopupSuggestions[effectiveSuggestedIndex]
          setPopupState((prev) =>
            prev?.type === 'file'
              ? {
                  ...prev,
                  draft: selection ?? prev.draft,
                  suggestedFocused: false,
                }
              : prev,
          )
          return
        }

        return
      }

      if (key.tab && !key.shift && hasSuggestions) {
        setPopupState((prev) =>
          prev?.type === 'file'
            ? {
                ...prev,
                suggestedFocused: true,
                suggestedSelectionIndex: 0,
              }
            : prev,
        )
        return
      }

      if (key.upArrow && files.length > 0) {
        setPopupState((prev) =>
          prev?.type === 'file'
            ? { ...prev, selectionIndex: Math.max(prev.selectionIndex - 1, 0) }
            : prev,
        )
        return
      }

      if (key.downArrow) {
        if (files.length === 0) {
          if (hasSuggestions) {
            setPopupState((prev) =>
              prev?.type === 'file'
                ? {
                    ...prev,
                    suggestedFocused: true,
                    suggestedSelectionIndex: 0,
                  }
                : prev,
            )
          }
          return
        }

        if (popupState.selectionIndex >= files.length - 1) {
          if (hasSuggestions) {
            setPopupState((prev) =>
              prev?.type === 'file'
                ? {
                    ...prev,
                    suggestedFocused: true,
                    suggestedSelectionIndex: 0,
                  }
                : prev,
            )
            return
          }

          return
        }

        setPopupState((prev) =>
          prev?.type === 'file'
            ? {
                ...prev,
                selectionIndex: Math.min(prev.selectionIndex + 1, files.length - 1),
              }
            : prev,
        )
        return
      }

      if ((key.delete || (draftIsEmpty && isBackspaceKey(input, key))) && files.length > 0) {
        onRemoveFile(popupState.selectionIndex)
        return
      }

      return
    }

    if (popupState.type === 'url') {
      if (key.upArrow && urls.length > 0) {
        setPopupState((prev) =>
          prev?.type === 'url'
            ? { ...prev, selectionIndex: Math.max(prev.selectionIndex - 1, 0) }
            : prev,
        )
        return
      }
      if (key.downArrow && urls.length > 0) {
        setPopupState((prev) =>
          prev?.type === 'url'
            ? {
                ...prev,
                selectionIndex: Math.min(prev.selectionIndex + 1, urls.length - 1),
              }
            : prev,
        )
        return
      }
      if (
        (key.delete || (popupState.draft.trim().length === 0 && isBackspaceKey(input, key))) &&
        urls.length > 0
      ) {
        onRemoveUrl(popupState.selectionIndex)
        return
      }
      if (key.escape) {
        closePopup()
      }
      return
    }

    if (popupState.type === 'image') {
      const hasSuggestions = imagePopupSuggestions.length > 0
      const maxSuggestedIndex = Math.max(imagePopupSuggestions.length - 1, 0)
      const effectiveSuggestedIndex = Math.min(
        popupState.suggestedSelectionIndex,
        maxSuggestedIndex,
      )
      const draftIsEmpty = popupState.draft.trim().length === 0

      if (key.escape) {
        closePopup()
        return
      }

      if (popupState.suggestedFocused && hasSuggestions) {
        if (key.tab) {
          setPopupState((prev) =>
            prev?.type === 'image' ? { ...prev, suggestedFocused: false } : prev,
          )
          return
        }

        if (key.upArrow) {
          if (effectiveSuggestedIndex === 0) {
            setPopupState((prev) =>
              prev?.type === 'image' ? { ...prev, suggestedFocused: false } : prev,
            )
            return
          }

          setPopupState((prev) =>
            prev?.type === 'image'
              ? {
                  ...prev,
                  suggestedSelectionIndex: Math.max(prev.suggestedSelectionIndex - 1, 0),
                }
              : prev,
          )
          return
        }

        if (key.downArrow) {
          setPopupState((prev) =>
            prev?.type === 'image'
              ? {
                  ...prev,
                  suggestedSelectionIndex: Math.min(
                    prev.suggestedSelectionIndex + 1,
                    maxSuggestedIndex,
                  ),
                }
              : prev,
          )
          return
        }

        if (key.return) {
          const selection = imagePopupSuggestions[effectiveSuggestedIndex]
          setPopupState((prev) =>
            prev?.type === 'image'
              ? {
                  ...prev,
                  draft: selection ?? prev.draft,
                  suggestedFocused: false,
                }
              : prev,
          )
          return
        }

        return
      }

      if (key.tab && !key.shift && hasSuggestions) {
        setPopupState((prev) =>
          prev?.type === 'image'
            ? {
                ...prev,
                suggestedFocused: true,
                suggestedSelectionIndex: 0,
              }
            : prev,
        )
        return
      }

      if (key.upArrow && images.length > 0) {
        setPopupState((prev) =>
          prev?.type === 'image'
            ? { ...prev, selectionIndex: Math.max(prev.selectionIndex - 1, 0) }
            : prev,
        )
        return
      }

      if (key.downArrow) {
        if (images.length === 0) {
          if (hasSuggestions) {
            setPopupState((prev) =>
              prev?.type === 'image'
                ? {
                    ...prev,
                    suggestedFocused: true,
                    suggestedSelectionIndex: 0,
                  }
                : prev,
            )
          }
          return
        }

        if (popupState.selectionIndex >= images.length - 1) {
          if (hasSuggestions) {
            setPopupState((prev) =>
              prev?.type === 'image'
                ? {
                    ...prev,
                    suggestedFocused: true,
                    suggestedSelectionIndex: 0,
                  }
                : prev,
            )
          }
          return
        }

        setPopupState((prev) =>
          prev?.type === 'image'
            ? {
                ...prev,
                selectionIndex: Math.min(prev.selectionIndex + 1, images.length - 1),
              }
            : prev,
        )
        return
      }

      if ((key.delete || (draftIsEmpty && isBackspaceKey(input, key))) && images.length > 0) {
        onRemoveImage(popupState.selectionIndex)
        return
      }

      return
    }

    if (popupState.type === 'video') {
      const hasSuggestions = videoPopupSuggestions.length > 0
      const maxSuggestedIndex = Math.max(videoPopupSuggestions.length - 1, 0)
      const effectiveSuggestedIndex = Math.min(
        popupState.suggestedSelectionIndex,
        maxSuggestedIndex,
      )
      const draftIsEmpty = popupState.draft.trim().length === 0

      if (key.escape) {
        closePopup()
        return
      }

      if (popupState.suggestedFocused && hasSuggestions) {
        if (key.tab) {
          setPopupState((prev) =>
            prev?.type === 'video' ? { ...prev, suggestedFocused: false } : prev,
          )
          return
        }

        if (key.upArrow) {
          if (effectiveSuggestedIndex === 0) {
            setPopupState((prev) =>
              prev?.type === 'video' ? { ...prev, suggestedFocused: false } : prev,
            )
            return
          }

          setPopupState((prev) =>
            prev?.type === 'video'
              ? {
                  ...prev,
                  suggestedSelectionIndex: Math.max(prev.suggestedSelectionIndex - 1, 0),
                }
              : prev,
          )
          return
        }

        if (key.downArrow) {
          setPopupState((prev) =>
            prev?.type === 'video'
              ? {
                  ...prev,
                  suggestedSelectionIndex: Math.min(
                    prev.suggestedSelectionIndex + 1,
                    maxSuggestedIndex,
                  ),
                }
              : prev,
          )
          return
        }

        if (key.return) {
          const selection = videoPopupSuggestions[effectiveSuggestedIndex]
          setPopupState((prev) =>
            prev?.type === 'video'
              ? {
                  ...prev,
                  draft: selection ?? prev.draft,
                  suggestedFocused: false,
                }
              : prev,
          )
          return
        }

        return
      }

      if (key.tab && !key.shift && hasSuggestions) {
        setPopupState((prev) =>
          prev?.type === 'video'
            ? {
                ...prev,
                suggestedFocused: true,
                suggestedSelectionIndex: 0,
              }
            : prev,
        )
        return
      }

      if (key.upArrow && videos.length > 0) {
        setPopupState((prev) =>
          prev?.type === 'video'
            ? { ...prev, selectionIndex: Math.max(prev.selectionIndex - 1, 0) }
            : prev,
        )
        return
      }

      if (key.downArrow) {
        if (videos.length === 0) {
          if (hasSuggestions) {
            setPopupState((prev) =>
              prev?.type === 'video'
                ? {
                    ...prev,
                    suggestedFocused: true,
                    suggestedSelectionIndex: 0,
                  }
                : prev,
            )
          }
          return
        }

        if (popupState.selectionIndex >= videos.length - 1) {
          if (hasSuggestions) {
            setPopupState((prev) =>
              prev?.type === 'video'
                ? {
                    ...prev,
                    suggestedFocused: true,
                    suggestedSelectionIndex: 0,
                  }
                : prev,
            )
          }
          return
        }

        setPopupState((prev) =>
          prev?.type === 'video'
            ? {
                ...prev,
                selectionIndex: Math.min(prev.selectionIndex + 1, videos.length - 1),
              }
            : prev,
        )
        return
      }

      if ((key.delete || (draftIsEmpty && isBackspaceKey(input, key))) && videos.length > 0) {
        onRemoveVideo(popupState.selectionIndex)
        return
      }

      return
    }

    if (popupState.type === 'history') {
      if (key.upArrow && historyPopupItems.length > 0) {
        setPopupState((prev) =>
          prev?.type === 'history'
            ? { ...prev, selectionIndex: Math.max(prev.selectionIndex - 1, 0) }
            : prev,
        )
        return
      }
      if (key.downArrow && historyPopupItems.length > 0) {
        setPopupState((prev) =>
          prev?.type === 'history'
            ? {
                ...prev,
                selectionIndex: Math.min(prev.selectionIndex + 1, historyPopupItems.length - 1),
              }
            : prev,
        )
        return
      }
      if (key.escape) {
        closePopup()
      }
      return
    }

    if (popupState.type === 'smart') {
      const hasSuggestions = smartPopupSuggestions.length > 0
      const maxSuggestedIndex = Math.max(smartPopupSuggestions.length - 1, 0)
      const effectiveSuggestedIndex = Math.min(
        popupState.suggestedSelectionIndex,
        maxSuggestedIndex,
      )
      const draftIsEmpty = popupState.draft.trim().length === 0

      if (key.escape) {
        closePopup()
        return
      }

      if (popupState.suggestedFocused && hasSuggestions) {
        if (key.tab) {
          setPopupState((prev) =>
            prev?.type === 'smart' ? { ...prev, suggestedFocused: false } : prev,
          )
          return
        }

        if (key.upArrow) {
          if (effectiveSuggestedIndex === 0) {
            setPopupState((prev) =>
              prev?.type === 'smart' ? { ...prev, suggestedFocused: false } : prev,
            )
            return
          }

          setPopupState((prev) =>
            prev?.type === 'smart'
              ? {
                  ...prev,
                  suggestedSelectionIndex: Math.max(prev.suggestedSelectionIndex - 1, 0),
                }
              : prev,
          )
          return
        }

        if (key.downArrow) {
          setPopupState((prev) =>
            prev?.type === 'smart'
              ? {
                  ...prev,
                  suggestedSelectionIndex: Math.min(
                    prev.suggestedSelectionIndex + 1,
                    maxSuggestedIndex,
                  ),
                }
              : prev,
          )
          return
        }

        if (key.return) {
          const selection = smartPopupSuggestions[effectiveSuggestedIndex]
          setPopupState((prev) =>
            prev?.type === 'smart'
              ? {
                  ...prev,
                  draft: selection ?? prev.draft,
                  suggestedFocused: false,
                }
              : prev,
          )
          return
        }

        return
      }

      if (key.tab && !key.shift && hasSuggestions) {
        setPopupState((prev) =>
          prev?.type === 'smart'
            ? {
                ...prev,
                suggestedFocused: true,
                suggestedSelectionIndex: 0,
              }
            : prev,
        )
        return
      }

      if (key.downArrow && hasSuggestions) {
        setPopupState((prev) =>
          prev?.type === 'smart'
            ? {
                ...prev,
                suggestedFocused: true,
                suggestedSelectionIndex: 0,
              }
            : prev,
        )
        return
      }

      if ((key.delete || (draftIsEmpty && isBackspaceKey(input, key))) && smartContextRoot) {
        onSmartRootSubmit('')
        return
      }

      return
    }

    if (popupState.type === 'tokens') {
      if (key.escape) {
        closePopup()
      }
      return
    }

    if (popupState.type === 'settings') {
      if (key.escape) {
        closePopup()
      }
      return
    }

    if (popupState.type === 'reasoning') {
      const maxOffset = Math.max(0, reasoningPopupLines.length - reasoningPopupVisibleRows)

      if (key.upArrow) {
        setPopupState((prev) =>
          prev?.type === 'reasoning'
            ? { ...prev, scrollOffset: Math.max(prev.scrollOffset - 1, 0) }
            : prev,
        )
        return
      }

      if (key.downArrow) {
        setPopupState((prev) =>
          prev?.type === 'reasoning'
            ? { ...prev, scrollOffset: Math.min(prev.scrollOffset + 1, maxOffset) }
            : prev,
        )
        return
      }

      if (key.pageUp) {
        setPopupState((prev) =>
          prev?.type === 'reasoning'
            ? {
                ...prev,
                scrollOffset: Math.max(prev.scrollOffset - reasoningPopupVisibleRows, 0),
              }
            : prev,
        )
        return
      }

      if (key.pageDown) {
        setPopupState((prev) =>
          prev?.type === 'reasoning'
            ? {
                ...prev,
                scrollOffset: Math.min(prev.scrollOffset + reasoningPopupVisibleRows, maxOffset),
              }
            : prev,
        )
        return
      }

      if (key.escape) {
        closePopup()
      }
      return
    }

    if (popupState.type === 'intent') {
      const hasSuggestions = intentPopupSuggestions.length > 0
      const maxSuggestedIndex = Math.max(intentPopupSuggestions.length - 1, 0)
      const effectiveSuggestedIndex = Math.min(
        popupState.suggestedSelectionIndex,
        maxSuggestedIndex,
      )

      if (key.escape) {
        closePopup()
        return
      }

      if (popupState.suggestedFocused && hasSuggestions) {
        if (key.tab) {
          setPopupState((prev) =>
            prev?.type === 'intent' ? { ...prev, suggestedFocused: false } : prev,
          )
          return
        }

        if (key.upArrow) {
          if (effectiveSuggestedIndex === 0) {
            setPopupState((prev) =>
              prev?.type === 'intent' ? { ...prev, suggestedFocused: false } : prev,
            )
            return
          }

          setPopupState((prev) =>
            prev?.type === 'intent'
              ? {
                  ...prev,
                  suggestedSelectionIndex: Math.max(prev.suggestedSelectionIndex - 1, 0),
                }
              : prev,
          )
          return
        }

        if (key.downArrow) {
          setPopupState((prev) =>
            prev?.type === 'intent'
              ? {
                  ...prev,
                  suggestedSelectionIndex: Math.min(
                    prev.suggestedSelectionIndex + 1,
                    maxSuggestedIndex,
                  ),
                }
              : prev,
          )
          return
        }

        if (key.return) {
          const selection = intentPopupSuggestions[effectiveSuggestedIndex]
          if (selection) {
            onIntentFileSubmit(selection)
          }
          return
        }

        return
      }

      if (key.tab && !key.shift && hasSuggestions) {
        setPopupState((prev) =>
          prev?.type === 'intent'
            ? {
                ...prev,
                suggestedFocused: true,
                suggestedSelectionIndex: 0,
              }
            : prev,
        )
        return
      }

      if (key.downArrow && hasSuggestions) {
        setPopupState((prev) =>
          prev?.type === 'intent'
            ? {
                ...prev,
                suggestedFocused: true,
                suggestedSelectionIndex: 0,
              }
            : prev,
        )
        return
      }

      return
    }

    if (popupState.type === 'instructions') {
      if (key.escape) {
        closePopup()
      }
      return
    }

    if (popupState.type === 'series') {
      if (key.escape) {
        closePopup()
      }
      return
    }

    if (popupState.type === 'test') {
      if (key.escape) {
        closePopup()
      }
    }
  })

  useInput(handlePopupKey, { isActive })
}
