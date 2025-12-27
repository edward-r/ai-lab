import { useApp, useStdout } from 'ink'
import { useCallback } from 'react'

import { usePopupManager } from '../../../hooks/usePopupManager'
import type { NotifyOptions } from '../../../notifier'
import { useTheme } from '../../../theme/theme-provider'
import type { HistoryEntry, ModelOption, PopupState } from '../../../types'

const DEFAULT_TEST_FILE = 'prompt-tests.yaml'

type PushHistory = (content: string, kind?: HistoryEntry['kind']) => void

type UseCommandScreenPopupManagerOptions = {
  currentModel: ModelOption['id']
  modelOptions: readonly ModelOption[]
  smartContextRoot: string | null
  images: string[]
  videos: string[]
  addImage: (value: string) => void
  addVideo: (value: string) => void
  lastTestFile: string | null
  interactiveTransportPath?: string | undefined
  isGenerating: boolean
  lastUserIntentRef: import('react').MutableRefObject<string | null>
  lastTypedIntentRef: import('react').MutableRefObject<string>

  pushHistoryProxy: PushHistory
  notify: (message: string, options?: NotifyOptions) => void
  setInputValue: (value: string | ((prev: string) => string)) => void

  runSeriesGeneration: (intent: string) => void
  runTestsFromCommandProxy: (value: string) => void

  setCurrentModel: (value: ModelOption['id']) => void
  setPolishEnabled: (value: boolean) => void
  setCopyEnabled: (value: boolean) => void
  setChatGptEnabled: (value: boolean) => void
  setJsonOutputEnabled: (value: boolean) => void

  intentFilePath: string
  setIntentFilePath: (value: string) => void

  metaInstructions: string
  setMetaInstructions: (value: string) => void

  polishEnabled: boolean
  copyEnabled: boolean
  chatGptEnabled: boolean
  jsonOutputEnabled: boolean
}

export type UseCommandScreenPopupManagerResult = {
  popupState: PopupState
  setPopupState: import('react').Dispatch<import('react').SetStateAction<PopupState>>
  actions: ReturnType<typeof usePopupManager>['actions']
  isPopupOpen: boolean
}

export const useCommandScreenPopupManager = ({
  currentModel,
  modelOptions,
  smartContextRoot,
  images,
  videos,
  addImage,
  addVideo,
  lastTestFile,
  interactiveTransportPath,
  isGenerating,
  lastUserIntentRef,
  lastTypedIntentRef,
  pushHistoryProxy,
  notify,
  setInputValue,
  runSeriesGeneration,
  runTestsFromCommandProxy,
  setCurrentModel,
  setPolishEnabled,
  setCopyEnabled,
  setChatGptEnabled,
  setJsonOutputEnabled,
  intentFilePath,
  setIntentFilePath,
  metaInstructions,
  setMetaInstructions,
  polishEnabled,
  copyEnabled,
  chatGptEnabled,
  jsonOutputEnabled,
}: UseCommandScreenPopupManagerOptions): UseCommandScreenPopupManagerResult => {
  const { exit } = useApp()
  const { stdout } = useStdout()

  const clearScreen = useCallback(() => {
    if (stdout && stdout.isTTY) {
      stdout.write('\u001b[2J\u001b[H')
    }
  }, [stdout])

  const getLatestTypedIntent = useCallback(() => {
    const trimmed = lastTypedIntentRef.current.trim()
    return trimmed.length > 0 ? trimmed : null
  }, [lastTypedIntentRef])

  const syncTypedIntentRef = useCallback(
    (intent: string) => {
      lastTypedIntentRef.current = intent
    },
    [lastTypedIntentRef],
  )

  const { activeThemeName, mode, themes } = useTheme()

  const popupManager = usePopupManager({
    currentModel,
    modelOptions,
    activeThemeName,
    themeMode: mode,
    themes: themes.map((theme) => ({ name: theme.name, label: theme.label })),
    smartContextRoot,
    images,
    videos,
    addImage,
    addVideo,
    lastTestFile,
    defaultTestFile: DEFAULT_TEST_FILE,
    ...(interactiveTransportPath ? { interactiveTransportPath } : {}),
    isGenerating,
    lastUserIntentRef,
    pushHistory: pushHistoryProxy,
    notify,
    setInputValue,
    runSeriesGeneration,
    runTestsFromCommand: runTestsFromCommandProxy,
    clearScreen,
    exitApp: exit,
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
  })

  return {
    popupState: popupManager.popupState,
    setPopupState: popupManager.setPopupState,
    actions: popupManager.actions,
    isPopupOpen: popupManager.popupState !== null,
  }
}
