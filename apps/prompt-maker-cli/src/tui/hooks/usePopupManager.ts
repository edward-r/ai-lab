import fs from 'node:fs/promises'
import path from 'node:path'
import { useCallback, useState } from 'react'

import { TOGGLE_LABELS } from '../config'
import { discoverFileSuggestions } from '../file-suggestions'
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
  openSmartPopup: () => void
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
  lastTestFile: string | null
  defaultTestFile: string
  interactiveTransportPath?: string | undefined
  isGenerating: boolean
  lastUserIntentRef: React.MutableRefObject<string | null>
  pushHistory: (content: string, kind?: HistoryEntry['kind']) => void
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

export const usePopupManager = ({
  currentModel,
  modelOptions,
  smartContextRoot,
  lastTestFile,
  defaultTestFile,
  interactiveTransportPath,
  isGenerating,
  lastUserIntentRef,
  pushHistory,
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
  const [popupState, setPopupState] = useState<PopupState>(null)

  const openModelPopup = useCallback(() => {
    const defaultIndex = Math.max(
      0,
      modelOptions.findIndex((option) => option.id === currentModel),
    )
    setPopupState({ type: 'model', query: '', selectionIndex: defaultIndex })
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
      setPopupState({ type: 'toggle', field, selectionIndex: currentValue ? 0 : 1 })
    },
    [polishEnabled, copyEnabled, chatGptEnabled, jsonOutputEnabled],
  )

  const openFilePopup = useCallback(() => {
    setPopupState({
      type: 'file',
      draft: '',
      selectionIndex: 0,
      suggestedItems: [],
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    })

    const scan = async (): Promise<void> => {
      try {
        const suggestions = await discoverFileSuggestions({ cwd: process.cwd(), limit: 200 })
        setPopupState((prev) =>
          prev?.type === 'file'
            ? {
                ...prev,
                suggestedItems: suggestions,
                suggestedSelectionIndex: 0,
                suggestedFocused: false,
              }
            : prev,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown workspace scan error.'
        pushHistory(`[file] Failed to scan workspace: ${message}`, 'system')
      }
    }

    void scan()
  }, [pushHistory])

  const openUrlPopup = useCallback(() => {
    setPopupState({ type: 'url', draft: '', selectionIndex: 0 })
  }, [])

  const openSmartPopup = useCallback(() => {
    setPopupState({ type: 'smart', draft: smartContextRoot ?? '' })
  }, [smartContextRoot])

  const openTestPopup = useCallback(() => {
    setPopupState({ type: 'test', draft: lastTestFile ?? defaultTestFile })
  }, [defaultTestFile, lastTestFile])

  const openIntentPopup = useCallback(() => {
    setPopupState({ type: 'intent', draft: intentFilePath })
  }, [intentFilePath])

  const openInstructionsPopup = useCallback(() => {
    setPopupState({ type: 'instructions', draft: metaInstructions })
  }, [metaInstructions])

  const openSeriesPopup = useCallback(
    (initialDraft?: string, hintOverride?: string) => {
      const trimmedIntentFile = intentFilePath.trim()
      const defaultHint = trimmedIntentFile
        ? 'Draft prefills from typed/last intent; if empty, loads the intent file.'
        : 'Draft prefills from typed/last intent (or pass /series <intent>).'
      setPopupState({
        type: 'series',
        draft: initialDraft ?? '',
        hint: hintOverride ?? defaultHint,
      })
    },
    [intentFilePath],
  )

  const closePopup = useCallback(() => {
    setPopupState(null)
  }, [])

  const applyModelSelection = useCallback(
    (option?: ModelOption) => {
      if (!option) {
        return
      }
      setCurrentModel(option.id)
      pushHistory(`Model set to ${option.id}`)
      setInputValue('')
      setPopupState(null)
    },
    [setCurrentModel, pushHistory, setInputValue],
  )

  const handleModelPopupSubmit = useCallback(
    (option?: ModelOption) => {
      applyModelSelection(option)
    },
    [applyModelSelection],
  )

  const applyToggleSelection = useCallback(
    (field: ToggleField, value: boolean) => {
      if (field === 'json' && value && interactiveTransportPath) {
        pushHistory(JSON_INTERACTIVE_ERROR, 'system')
        setInputValue('')
        setPopupState(null)
        return
      }
      const message =
        field === 'json'
          ? value
            ? 'JSON enabled (payload shown in history)'
            : 'JSON disabled'
          : `${TOGGLE_LABELS[field]} ${value ? 'enabled' : 'disabled'}`
      if (field === 'polish') {
        setPolishEnabled(value)
      } else if (field === 'copy') {
        setCopyEnabled(value)
      } else if (field === 'chatgpt') {
        setChatGptEnabled(value)
      } else {
        setJsonOutputEnabled(value)
      }
      pushHistory(message)
      setInputValue('')
      setPopupState(null)
    },
    [
      interactiveTransportPath,
      pushHistory,
      setInputValue,
      setPolishEnabled,
      setCopyEnabled,
      setChatGptEnabled,
      setJsonOutputEnabled,
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
      setPopupState(null)
    },
    [pushHistory, setInputValue, setIntentFilePath],
  )

  const handleInstructionsSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      setMetaInstructions(trimmed)
      pushHistory(trimmed ? `[instr] ${trimmed}` : '[instr] cleared')
      setInputValue('')
      setPopupState(null)
    },
    [pushHistory, setInputValue, setMetaInstructions],
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
      setPopupState(null)
      void runSeriesGeneration(trimmed)
    },
    [lastUserIntentRef, pushHistory, runSeriesGeneration, setInputValue, syncTypedIntentRef],
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
        case 'smart':
          openSmartPopup()
          return
        case 'intent':
          openIntentPopup()
          return
        case 'instructions':
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
      interactiveTransportPath,
      intentFilePath,
      isGenerating,
      jsonOutputEnabled,
      lastUserIntentRef,
      openFilePopup,
      openModelPopup,
      openSeriesPopup,
      openSmartPopup,
      openTestPopup,
      openTogglePopup,
      openUrlPopup,
      openInstructionsPopup,
      polishEnabled,
      pushHistory,
      runTestsFromCommand,
      setInputValue,
      getLatestTypedIntent,
      syncTypedIntentRef,
    ],
  )

  return {
    popupState,
    setPopupState,
    actions: {
      openModelPopup,
      openTogglePopup,
      openFilePopup,
      openUrlPopup,
      openSmartPopup,
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
    },
  }
}
