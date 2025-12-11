import { useCallback, useState } from 'react'

import { MODEL_OPTIONS, TOGGLE_LABELS } from '../config'
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
  closePopup: () => void
  handleCommandSelection: (commandId: CommandDescriptor['id'], argsRaw?: string) => void
  handleModelPopupSubmit: (option?: ModelOption) => void
  applyToggleSelection: (field: ToggleField, value: boolean) => void
}

export type UsePopupManagerOptions = {
  currentModel: ModelOption['id']
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
  polishEnabled: boolean
  copyEnabled: boolean
  chatGptEnabled: boolean
  jsonOutputEnabled: boolean
}

export const usePopupManager = ({
  currentModel,
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
  polishEnabled,
  copyEnabled,
  chatGptEnabled,
  jsonOutputEnabled,
}: UsePopupManagerOptions): {
  popupState: PopupState
  setPopupState: React.Dispatch<React.SetStateAction<PopupState>>
  actions: PopupManagerActions
} => {
  const [popupState, setPopupState] = useState<PopupState>(null)

  const openModelPopup = useCallback(() => {
    const defaultIndex = Math.max(
      0,
      MODEL_OPTIONS.findIndex((option) => option.id === currentModel),
    )
    setPopupState({ type: 'model', query: '', selectionIndex: defaultIndex })
  }, [currentModel])

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
    setPopupState({ type: 'file', draft: '', selectionIndex: 0 })
  }, [])

  const openUrlPopup = useCallback(() => {
    setPopupState({ type: 'url', draft: '', selectionIndex: 0 })
  }, [])

  const openSmartPopup = useCallback(() => {
    setPopupState({ type: 'smart', draft: smartContextRoot ?? '' })
  }, [smartContextRoot])

  const openTestPopup = useCallback(() => {
    setPopupState({ type: 'test', draft: lastTestFile ?? defaultTestFile })
  }, [defaultTestFile, lastTestFile])

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
      if (!option) {
        applyModelSelection(undefined)
        return
      }
      const nextOption = MODEL_OPTIONS.find((model) => model.id === option.id)
      applyModelSelection(nextOption)
    },
    [applyModelSelection],
  )

  const applyToggleSelection = useCallback(
    (field: ToggleField, value: boolean) => {
      if (field === 'json' && value && interactiveTransportPath) {
        pushHistory(
          'JSON output cannot be enabled while interactive transport is active.',
          'system',
        )
        setInputValue('')
        setPopupState(null)
        return
      }
      const message = `${TOGGLE_LABELS[field]} ${value ? 'enabled' : 'disabled'}`
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

  const handleCommandSelection = useCallback(
    (commandId: CommandDescriptor['id'], argsRaw?: string) => {
      switch (commandId) {
        case 'model':
          openModelPopup()
          return
        case 'polish':
        case 'copy':
        case 'chatgpt':
          openTogglePopup(commandId)
          return
        case 'json': {
          if (interactiveTransportPath) {
            pushHistory(
              'JSON output is unavailable while interactive transport is enabled.',
              'system',
            )
            return
          }
          const normalized = argsRaw?.trim().toLowerCase() ?? ''
          if (normalized === 'on' || normalized === 'off') {
            const nextEnabled = normalized === 'on'
            setJsonOutputEnabled(nextEnabled)
            pushHistory(`JSON ${nextEnabled ? 'enabled' : 'disabled'}`)
            setInputValue('')
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
        case 'exit':
          pushHistory('Exiting…', 'system')
          setInputValue('')
          exitApp()
          return
        case 'series': {
          if (isGenerating) {
            pushHistory('Generation already running. Please wait.', 'system')
            return
          }
          const trimmedArgs = argsRaw?.trim() ?? ''
          const intentSource = trimmedArgs || lastUserIntentRef.current || ''
          if (!intentSource) {
            pushHistory(
              'Series mode requires an intent. Use /series <intent> or submit an intent first.',
              'system',
            )
            return
          }
          lastUserIntentRef.current = intentSource
          pushHistory(`> /series ${intentSource}`, 'user')
          setInputValue('')
          void runSeriesGeneration(intentSource)
          return
        }
        case 'test': {
          const trimmedArgs = argsRaw?.trim() ?? ''
          if (trimmedArgs) {
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
      exitApp,
      interactiveTransportPath,
      isGenerating,
      lastUserIntentRef,
      openFilePopup,
      openModelPopup,
      openSmartPopup,
      openTestPopup,
      openTogglePopup,
      openUrlPopup,
      pushHistory,
      runSeriesGeneration,
      runTestsFromCommand,
      setInputValue,
      setJsonOutputEnabled,
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
      closePopup,
      handleCommandSelection,
      handleModelPopupSubmit,
      applyToggleSelection,
    },
  }
}
