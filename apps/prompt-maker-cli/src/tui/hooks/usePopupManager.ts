import fs from 'node:fs/promises'
import path from 'node:path'
import { useCallback, useMemo, useReducer, useRef } from 'react'

import {
  INITIAL_POPUP_MANAGER_STATE,
  popupReducer,
  type PopupAction,
  type SetStateAction,
} from '../popup-reducer'

import { TOGGLE_LABELS } from '../config'
import {
  discoverDirectorySuggestions,
  discoverFileSuggestions,
  discoverIntentFileSuggestions,
} from '../file-suggestions'
import type { NotifyOptions } from '../notifier'
import { buildModelPopupOptions } from '../model-popup-options'
import { getRecentSessionModels, recordRecentSessionModel } from '../model-session'
import type {
  CommandDescriptor,
  HistoryEntry,
  ModelOption,
  PopupState,
  ToggleField,
} from '../types'

export type PopupManagerActions = {
  openModelPopup: () => void
  openTogglePopup: (field: ToggleField) => void
  openFilePopup: () => void
  openUrlPopup: () => void
  openImagePopup: () => void
  openVideoPopup: () => void
  openHistoryPopup: () => void
  openSmartPopup: () => void
  openTokensPopup: () => void
  openSettingsPopup: () => void
  openReasoningPopup: () => void
  openTestPopup: () => void
  openIntentPopup: () => void
  openInstructionsPopup: () => void
  openSeriesPopup: (initialDraft?: string, hintOverride?: string) => void
  closePopup: () => void
  handleCommandSelection: (commandId: CommandDescriptor['id'], argsRaw?: string) => void
  handleModelPopupSubmit: (option?: ModelOption) => void
  applyToggleSelection: (field: ToggleField, value: boolean) => void
  handleIntentFileSubmit: (value: string) => void
  handleInstructionsSubmit: (value: string) => void
  handleSeriesIntentSubmit: (value: string) => void
}

export type UsePopupManagerOptions = {
  currentModel: ModelOption['id']
  modelOptions: readonly ModelOption[]
  smartContextRoot: string | null
  images: string[]
  videos: string[]
  addImage: (value: string) => void
  addVideo: (value: string) => void
  lastTestFile: string | null
  defaultTestFile: string
  interactiveTransportPath?: string | undefined
  isGenerating: boolean
  lastUserIntentRef: React.MutableRefObject<string | null>
  pushHistory: (content: string, kind?: HistoryEntry['kind']) => void
  notify: (message: string, options?: NotifyOptions) => void
  setInputValue: (value: string) => void
  runSeriesGeneration: (intent: string) => void
  runTestsFromCommand: (value: string) => void
  exitApp: () => void
  setCurrentModel: (value: ModelOption['id']) => void
  setPolishEnabled: (value: boolean) => void
  setCopyEnabled: (value: boolean) => void
  setChatGptEnabled: (value: boolean) => void
  setJsonOutputEnabled: (value: boolean) => void
  setIntentFilePath: (value: string) => void
  intentFilePath: string
  metaInstructions: string
  setMetaInstructions: (value: string) => void
  polishEnabled: boolean
  copyEnabled: boolean
  chatGptEnabled: boolean
  jsonOutputEnabled: boolean
  getLatestTypedIntent: () => string | null
  syncTypedIntentRef: (intent: string) => void
}

const JSON_INTERACTIVE_ERROR = 'JSON output is unavailable while interactive transport is enabled.'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.avi', '.mpeg', '.mpg', '.gif'])

/*
 * Popup state management for the Ink TUI.
 *
 * This hook wires UI actions (open/close/submit) to a pure reducer:
 * `apps/prompt-maker-cli/src/tui/popup-reducer.ts`.
 *
 * Keeping the reducer in a separate module lets us unit test popup transitions
 * without a TTY and keeps this hook focused on effects (async scans, commands).
 */

export const usePopupManager = ({
  currentModel,
  modelOptions,
  smartContextRoot,
  images,
  videos,
  addImage,
  addVideo,
  lastTestFile,
  defaultTestFile,
  interactiveTransportPath,
  isGenerating,
  lastUserIntentRef,
  pushHistory,
  notify,
  setInputValue,
  runSeriesGeneration,
  runTestsFromCommand,
  exitApp,
  setCurrentModel,
  setPolishEnabled,
  setCopyEnabled,
  setChatGptEnabled,
  setJsonOutputEnabled,
  setIntentFilePath,
  intentFilePath,
  metaInstructions,
  setMetaInstructions,
  polishEnabled,
  copyEnabled,
  chatGptEnabled,
  jsonOutputEnabled,
  getLatestTypedIntent,
  syncTypedIntentRef,
}: UsePopupManagerOptions): {
  popupState: PopupState
  setPopupState: React.Dispatch<React.SetStateAction<PopupState>>
  actions: PopupManagerActions
} => {
  const scanIdRef = useRef(0)

  const nextScanId = useCallback((): number => {
    scanIdRef.current += 1
    return scanIdRef.current
  }, [])

  const [popupManagerState, dispatch] = useReducer(popupReducer, INITIAL_POPUP_MANAGER_STATE)

  const popupState = popupManagerState.popupState

  // Compatibility shim: keeps the existing `setPopupState(prev => ...)` call sites working.
  // Internally we treat it as a reducer action.
  const setPopupState = useCallback<React.Dispatch<SetStateAction<PopupState>>>((next) => {
    dispatch({ type: 'set', next } satisfies PopupAction)
  }, [])

  const closePopup = useCallback(() => {
    dispatch({ type: 'close' })
  }, [])

  const openModelPopup = useCallback(() => {
    const recentModelIds = getRecentSessionModels()
    const { options } = buildModelPopupOptions({ query: '', modelOptions, recentModelIds })
    const defaultIndex = Math.max(
      0,
      options.findIndex((option) => option.id === currentModel),
    )

    dispatch({ type: 'open-model', query: '', selectionIndex: defaultIndex })
  }, [currentModel, modelOptions])

  const openTogglePopup = useCallback(
    (field: ToggleField) => {
      const currentValue =
        field === 'polish'
          ? polishEnabled
          : field === 'copy'
            ? copyEnabled
            : field === 'chatgpt'
              ? chatGptEnabled
              : jsonOutputEnabled

      dispatch({
        type: 'open-toggle',
        field,
        selectionIndex: currentValue ? 0 : 1,
      })
    },
    [polishEnabled, copyEnabled, chatGptEnabled, jsonOutputEnabled],
  )

  const openFilePopup = useCallback(() => {
    const scanId = nextScanId()
    dispatch({ type: 'open-file', scanId })

    const scan = async (): Promise<void> => {
      try {
        const suggestions = await discoverFileSuggestions({ cwd: process.cwd(), limit: 200 })
        dispatch({
          type: 'scan-suggestions-success',
          kind: 'file',
          scanId,
          suggestions,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown workspace scan error.'
        pushHistory(`[file] Failed to scan workspace: ${message}`, 'system')
      }
    }

    void scan()
  }, [nextScanId, pushHistory])

  const openUrlPopup = useCallback(() => {
    dispatch({ type: 'open-url' })
  }, [])

  const openImagePopup = useCallback(() => {
    const scanId = nextScanId()
    dispatch({ type: 'open-image', scanId })

    const scan = async (): Promise<void> => {
      try {
        const suggestions = await discoverFileSuggestions({ cwd: process.cwd(), limit: 200 })
        const filtered = suggestions.filter((candidate) => {
          const ext = path.extname(candidate).toLowerCase()
          return IMAGE_EXTENSIONS.has(ext)
        })
        dispatch({
          type: 'scan-suggestions-success',
          kind: 'image',
          scanId,
          suggestions: filtered,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown workspace scan error.'
        pushHistory(`[image] Failed to scan workspace: ${message}`, 'system')
      }
    }

    void scan()
  }, [nextScanId, pushHistory])

  const openVideoPopup = useCallback(() => {
    const scanId = nextScanId()
    dispatch({ type: 'open-video', scanId })

    const scan = async (): Promise<void> => {
      try {
        const suggestions = await discoverFileSuggestions({ cwd: process.cwd(), limit: 200 })
        const filtered = suggestions.filter((candidate) => {
          const ext = path.extname(candidate).toLowerCase()
          return VIDEO_EXTENSIONS.has(ext)
        })
        dispatch({
          type: 'scan-suggestions-success',
          kind: 'video',
          scanId,
          suggestions: filtered,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown workspace scan error.'
        pushHistory(`[video] Failed to scan workspace: ${message}`, 'system')
      }
    }

    void scan()
  }, [nextScanId, pushHistory])

  const openHistoryPopup = useCallback(() => {
    dispatch({ type: 'open-history' })
  }, [])

  const openSmartPopup = useCallback(() => {
    const draft = smartContextRoot ?? ''
    const scanId = nextScanId()

    dispatch({ type: 'open-smart', scanId, draft })

    const scan = async (): Promise<void> => {
      try {
        const suggestions = await discoverDirectorySuggestions({ cwd: process.cwd(), limit: 200 })
        dispatch({
          type: 'scan-suggestions-success',
          kind: 'smart',
          scanId,
          suggestions,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown workspace scan error.'
        pushHistory(`[smart] Failed to scan workspace: ${message}`, 'system')
      }
    }

    void scan()
  }, [nextScanId, pushHistory, smartContextRoot])

  const openTokensPopup = useCallback(() => {
    dispatch({ type: 'open-tokens' })
  }, [])

  const openSettingsPopup = useCallback(() => {
    dispatch({ type: 'open-settings' })
  }, [])

  const openReasoningPopup = useCallback(() => {
    dispatch({ type: 'open-reasoning', scrollOffset: 0 })
  }, [])

  const openTestPopup = useCallback(() => {
    dispatch({ type: 'open-test', draft: lastTestFile ?? defaultTestFile })
  }, [defaultTestFile, lastTestFile])

  const openIntentPopup = useCallback(() => {
    const scanId = nextScanId()
    dispatch({ type: 'open-intent', scanId, draft: intentFilePath })

    const scan = async (): Promise<void> => {
      try {
        const suggestions = await discoverIntentFileSuggestions({ cwd: process.cwd(), limit: 200 })
        dispatch({
          type: 'scan-suggestions-success',
          kind: 'intent',
          scanId,
          suggestions,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown workspace scan error.'
        pushHistory(`[intent] Failed to scan workspace: ${message}`, 'system')
      }
    }

    void scan()
  }, [intentFilePath, nextScanId, pushHistory])

  const openInstructionsPopup = useCallback(() => {
    dispatch({ type: 'open-instructions', draft: metaInstructions })
  }, [metaInstructions])

  const openSeriesPopup = useCallback(
    (initialDraft?: string, hintOverride?: string) => {
      const trimmedIntentFile = intentFilePath.trim()
      const defaultHint = trimmedIntentFile
        ? 'Draft prefills from typed/last intent; if empty, loads the intent file.'
        : 'Draft prefills from typed/last intent (or pass /series <intent>).'

      dispatch({
        type: 'open-series',
        draft: initialDraft ?? '',
        hint: hintOverride ?? defaultHint,
      })
    },
    [intentFilePath],
  )

  const applyModelSelection = useCallback(
    (option?: ModelOption) => {
      if (!option) {
        return
      }
      recordRecentSessionModel(option.id)
      setCurrentModel(option.id)
      notify(`Selected model: ${option.label} (${option.id})`, { kind: 'info' })
      setInputValue('')
      closePopup()
    },
    [closePopup, notify, setCurrentModel, setInputValue],
  )

  const handleModelPopupSubmit = useCallback(
    (option?: ModelOption) => {
      applyModelSelection(option)
    },
    [applyModelSelection],
  )

  const applyToggleSelection = useCallback(
    (field: ToggleField, value: boolean) => {
      // Guardrail: JSON output and interactive transport both want to “own” stdout.
      if (field === 'json' && value && interactiveTransportPath) {
        pushHistory(JSON_INTERACTIVE_ERROR, 'system')
        setInputValue('')
        closePopup()
        return
      }

      if (field === 'json') {
        setJsonOutputEnabled(value)
        notify(
          value
            ? 'JSON output is ON (payload shown in history)'
            : 'JSON output is OFF (payload hidden)',
          { kind: value ? 'info' : 'warning' },
        )
        setInputValue('')
        closePopup()
        return
      }

      const message = `${TOGGLE_LABELS[field]} ${value ? 'enabled' : 'disabled'}`

      if (field === 'polish') {
        setPolishEnabled(value)
      } else if (field === 'copy') {
        setCopyEnabled(value)
      } else {
        setChatGptEnabled(value)
      }

      pushHistory(message)
      setInputValue('')
      closePopup()
    },
    [
      closePopup,
      interactiveTransportPath,
      notify,
      pushHistory,
      setChatGptEnabled,
      setCopyEnabled,
      setInputValue,
      setJsonOutputEnabled,
      setPolishEnabled,
    ],
  )

  const handleIntentFileSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      setIntentFilePath(trimmed)
      pushHistory(
        trimmed ? `Intent file set to ${trimmed}` : 'Intent file cleared; using typed intent.',
      )
      setInputValue('')
      closePopup()
    },
    [closePopup, pushHistory, setInputValue, setIntentFilePath],
  )

  const handleInstructionsSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      setMetaInstructions(trimmed)
      pushHistory(trimmed ? `[instr] ${trimmed}` : '[instr] cleared')
      setInputValue('')
      closePopup()
    },
    [closePopup, pushHistory, setInputValue, setMetaInstructions],
  )

  const handleSeriesIntentSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) {
        pushHistory('Series intent cannot be empty.', 'system')
        return
      }
      lastUserIntentRef.current = trimmed
      syncTypedIntentRef(trimmed)
      pushHistory(`> /series ${trimmed}`, 'user')
      setInputValue('')
      closePopup()
      void runSeriesGeneration(trimmed)
    },
    [
      closePopup,
      lastUserIntentRef,
      pushHistory,
      runSeriesGeneration,
      setInputValue,
      syncTypedIntentRef,
    ],
  )

  const handleCommandSelection = useCallback(
    (commandId: CommandDescriptor['id'], argsRaw?: string) => {
      const trimmedArgs = argsRaw?.trim() ?? ''
      const normalizedToggleArgs = trimmedArgs.toLowerCase()
      switch (commandId) {
        case 'model':
          openModelPopup()
          return
        case 'polish': {
          if (!trimmedArgs) {
            applyToggleSelection('polish', !polishEnabled)
            return
          }
          if (normalizedToggleArgs === 'on' || normalizedToggleArgs === 'off') {
            applyToggleSelection('polish', normalizedToggleArgs === 'on')
            return
          }
          openTogglePopup('polish')
          return
        }
        case 'copy': {
          if (!trimmedArgs) {
            applyToggleSelection('copy', !copyEnabled)
            return
          }
          if (normalizedToggleArgs === 'on' || normalizedToggleArgs === 'off') {
            applyToggleSelection('copy', normalizedToggleArgs === 'on')
            return
          }
          openTogglePopup('copy')
          return
        }
        case 'chatgpt': {
          if (!trimmedArgs) {
            applyToggleSelection('chatgpt', !chatGptEnabled)
            return
          }
          if (normalizedToggleArgs === 'on' || normalizedToggleArgs === 'off') {
            applyToggleSelection('chatgpt', normalizedToggleArgs === 'on')
            return
          }
          openTogglePopup('chatgpt')
          return
        }
        case 'json': {
          if (interactiveTransportPath) {
            pushHistory(JSON_INTERACTIVE_ERROR, 'system')
            setInputValue('')
            return
          }
          if (!trimmedArgs) {
            applyToggleSelection('json', !jsonOutputEnabled)
            return
          }
          if (normalizedToggleArgs === 'on' || normalizedToggleArgs === 'off') {
            applyToggleSelection('json', normalizedToggleArgs === 'on')
            return
          }
          openTogglePopup('json')
          return
        }
        case 'file':
          openFilePopup()
          return
        case 'url':
          openUrlPopup()
          return
        case 'image': {
          if (trimmedArgs) {
            if (images.includes(trimmedArgs)) {
              pushHistory(`[image] Already attached: ${trimmedArgs}`, 'system')
            } else {
              addImage(trimmedArgs)
              pushHistory(`[image] Attached: ${trimmedArgs}`, 'system')
            }
            setInputValue('')
            closePopup()
            return
          }
          openImagePopup()
          return
        }
        case 'video': {
          if (trimmedArgs) {
            if (videos.includes(trimmedArgs)) {
              pushHistory(`[video] Already attached: ${trimmedArgs}`, 'system')
            } else {
              addVideo(trimmedArgs)
              pushHistory(`[video] Attached: ${trimmedArgs}`, 'system')
            }
            setInputValue('')
            closePopup()
            return
          }
          openVideoPopup()
          return
        }
        case 'smart':
          openSmartPopup()
          return
        case 'tokens':
          openTokensPopup()
          setInputValue('')
          return
        case 'settings':
          openSettingsPopup()
          setInputValue('')
          return
        case 'reasoning':
          openReasoningPopup()
          setInputValue('')
          return
        case 'history':
          openHistoryPopup()
          setInputValue('')
          return
        case 'intent':
          if (trimmedArgs) {
            handleIntentFileSubmit(trimmedArgs)
            return
          }
          openIntentPopup()
          return
        case 'instructions':
          if (trimmedArgs) {
            handleInstructionsSubmit(trimmedArgs)
            return
          }
          openInstructionsPopup()
          return
        case 'exit':
          pushHistory('Exiting…', 'system')
          setInputValue('')
          exitApp()
          return
        case 'series': {
          const handleSeriesCommand = async (): Promise<void> => {
            if (isGenerating) {
              pushHistory('Generation already running. Please wait.', 'system')
              return
            }

            const latestTypedIntent = getLatestTypedIntent()
            const typedDraft = latestTypedIntent?.trim() ?? ''

            let initialDraft = trimmedArgs || typedDraft || lastUserIntentRef.current || ''
            let hintOverride: string | undefined

            if (trimmedArgs) {
              pushHistory('[series] Using provided text as intent draft.', 'system')
            } else if (typedDraft) {
              pushHistory('[series] Using typed intent as draft.', 'system')
            } else if (lastUserIntentRef.current) {
              pushHistory('[series] Reusing last intent as draft.', 'system')
            }

            if (!initialDraft) {
              const trimmedIntentFile = intentFilePath.trim()
              if (trimmedIntentFile) {
                try {
                  const raw = await fs.readFile(trimmedIntentFile, 'utf8')
                  const fileIntent = raw.trim()
                  if (fileIntent) {
                    initialDraft = fileIntent
                    const fileLabel = path.basename(trimmedIntentFile)
                    pushHistory(`[series] Loaded draft from intent file ${fileLabel}.`, 'system')
                    hintOverride = `Loaded from intent file ${fileLabel}`
                    syncTypedIntentRef(fileIntent)
                  } else {
                    pushHistory(
                      `[series] Intent file ${trimmedIntentFile} is empty; please add content.`,
                      'system',
                    )
                  }
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : 'Unknown intent file error.'
                  pushHistory(
                    `[series] Failed to read intent file ${trimmedIntentFile}: ${message}`,
                    'system',
                  )
                }
              }
            }

            if (!initialDraft) {
              pushHistory('[series] No intent found; enter one in the popup.', 'system')
            }

            openSeriesPopup(initialDraft, hintOverride)
            setInputValue('')
          }
          void handleSeriesCommand()
          return
        }
        case 'test': {
          if (trimmedArgs) {
            pushHistory(`[tests] Running /test ${trimmedArgs}`, 'system')
            void runTestsFromCommand(trimmedArgs)
          } else {
            openTestPopup()
          }
          return
        }
        default:
          pushHistory(`Selected ${commandId}`)
      }
    },
    [
      applyToggleSelection,
      chatGptEnabled,
      copyEnabled,
      exitApp,
      getLatestTypedIntent,
      handleIntentFileSubmit,
      handleInstructionsSubmit,
      intentFilePath,
      interactiveTransportPath,
      isGenerating,
      jsonOutputEnabled,
      lastUserIntentRef,
      openFilePopup,
      openHistoryPopup,
      openInstructionsPopup,
      openIntentPopup,
      openModelPopup,
      openReasoningPopup,
      openSeriesPopup,
      openSettingsPopup,
      openSmartPopup,
      openTestPopup,
      openTogglePopup,
      openTokensPopup,
      openUrlPopup,
      polishEnabled,
      pushHistory,
      runTestsFromCommand,
      setInputValue,
      closePopup,
      addImage,
      addVideo,
      images,
      videos,
      openImagePopup,
      openVideoPopup,
      syncTypedIntentRef,
    ],
  )

  // Memoizing the actions object keeps `actions` referentially stable.
  // This reduces avoidable rerenders in components that receive `actions`.
  const actions = useMemo<PopupManagerActions>(
    () => ({
      openModelPopup,
      openTogglePopup,
      openFilePopup,
      openUrlPopup,
      openImagePopup,
      openVideoPopup,
      openHistoryPopup,
      openSmartPopup,
      openTokensPopup,
      openSettingsPopup,
      openReasoningPopup,
      openTestPopup,
      openIntentPopup,
      openInstructionsPopup,
      openSeriesPopup,
      closePopup,
      handleCommandSelection,
      handleModelPopupSubmit,
      applyToggleSelection,
      handleIntentFileSubmit,
      handleInstructionsSubmit,
      handleSeriesIntentSubmit,
    }),
    [
      applyToggleSelection,
      closePopup,
      handleCommandSelection,
      handleInstructionsSubmit,
      handleIntentFileSubmit,
      handleModelPopupSubmit,
      handleSeriesIntentSubmit,
      openFilePopup,
      openHistoryPopup,
      openInstructionsPopup,
      openIntentPopup,
      openModelPopup,
      openReasoningPopup,
      openSeriesPopup,
      openSettingsPopup,
      openSmartPopup,
      openTestPopup,
      openTogglePopup,
      openTokensPopup,
      openUrlPopup,
      openImagePopup,
      openVideoPopup,
    ],
  )

  return {
    popupState,
    setPopupState,
    actions,
  }
}
