import type { MutableRefObject } from 'react'
import { useMemo, useRef } from 'react'

import { usePersistentCommandHistory } from '../../../hooks/usePersistentCommandHistory'
import { useStableCallback } from '../../../hooks/useStableCallback'
import type { HistoryEntry } from '../../../types'

import { usePromptTestRunner } from './usePromptTestRunner'

const DEFAULT_TEST_FILE = 'prompt-tests.yaml'

type PushHistory = (content: string, kind?: HistoryEntry['kind']) => void

export type UseCommandScreenHistoryAndTestsResult = {
  pushHistoryRef: MutableRefObject<PushHistory>
  pushHistoryProxy: PushHistory

  clearHistoryRef: MutableRefObject<() => void>
  clearHistoryProxy: () => void

  scrollToRef: MutableRefObject<(row: number) => void>
  scrollToProxy: (row: number) => void

  closeTestPopupRef: MutableRefObject<() => void>
  closeTestPopupProxy: () => void

  commandHistoryValues: string[]
  addCommandHistoryEntry: (value: string) => void

  isTestCommandRunning: boolean
  lastTestFile: string | null
  runTestsFromCommandProxy: (value: string) => void
  onTestPopupSubmit: (value: string) => void
}

export const useCommandScreenHistoryAndTests = (): UseCommandScreenHistoryAndTestsResult => {
  const pushHistoryRef = useRef<PushHistory>((_content, _kind) => {
    throw new Error('pushHistoryRef.current has not been initialized yet.')
  })
  const pushHistoryProxy: PushHistory = useStableCallback(
    (content: string, kind: HistoryEntry['kind'] = 'system') => {
      pushHistoryRef.current(content, kind)
    },
  )

  const clearHistoryRef = useRef<() => void>(() => {
    throw new Error('clearHistoryRef.current has not been initialized yet.')
  })
  const clearHistoryProxy = useStableCallback(() => {
    clearHistoryRef.current()
  })

  const scrollToRef = useRef<(row: number) => void>(() => {
    throw new Error('scrollToRef.current has not been initialized yet.')
  })
  const scrollToProxy = useStableCallback((row: number) => {
    scrollToRef.current(row)
  })

  const closeTestPopupRef = useRef<() => void>(() => {
    throw new Error('closeTestPopupRef.current has not been initialized yet.')
  })
  const closeTestPopupProxy = useStableCallback(() => {
    closeTestPopupRef.current()
  })

  const { entries: commandHistoryEntries, addEntry: addCommandHistoryEntry } =
    usePersistentCommandHistory({
      onError: (message) => {
        pushHistoryProxy(`[history] ${message}`, 'system')
      },
    })

  const commandHistoryValues = useMemo(
    () => commandHistoryEntries.map((entry) => entry.value),
    [commandHistoryEntries],
  )

  const { isTestCommandRunning, lastTestFile, runTestsFromCommand, onTestPopupSubmit } =
    usePromptTestRunner({
      defaultTestFile: DEFAULT_TEST_FILE,
      pushHistory: pushHistoryProxy,
      clearHistory: clearHistoryProxy,
      closeTestPopup: closeTestPopupProxy,
      addCommandHistoryEntry,
    })

  return {
    pushHistoryRef,
    pushHistoryProxy,
    clearHistoryRef,
    clearHistoryProxy,
    scrollToRef,
    scrollToProxy,
    closeTestPopupRef,
    closeTestPopupProxy,
    commandHistoryValues,
    addCommandHistoryEntry,
    isTestCommandRunning,
    lastTestFile,
    runTestsFromCommandProxy: runTestsFromCommand,
    onTestPopupSubmit,
  }
}
