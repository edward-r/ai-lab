/*
 * useCommandScreen
 *
 * This hook owns the CommandScreen "screen model" state.
 *
 * Incremental refactor note:
 * - The legacy `CommandScreen.tsx` had a lot of scattered `useState` calls.
 * - We’re starting by moving the highest-churn UI state into a reducer.
 * - The rest of the orchestration logic can migrate here over time.
 */

import { useCallback, useMemo, useReducer } from 'react'
import { useStdout } from 'ink'

import {
  commandScreenReducer,
  createInitialCommandScreenState,
  type CommandScreenState,
  type SetStateAction,
} from './command-screen-reducer'

export type UseCommandScreenResult = {
  state: CommandScreenState
  setTerminalSize: (rows: number, columns: number) => void
  setInputValue: (next: SetStateAction<string>) => void
  setPasteActive: (isPasteActive: boolean) => void
  setCommandSelectionIndex: (next: SetStateAction<number>) => void
  setDebugKeyLine: (line: string | null) => void

  setIntentFilePath: (next: SetStateAction<string>) => void
  setPolishEnabled: (next: SetStateAction<boolean>) => void
  setCopyEnabled: (next: SetStateAction<boolean>) => void
  setChatGptEnabled: (next: SetStateAction<boolean>) => void
  setJsonOutputEnabled: (next: SetStateAction<boolean>) => void
}

export const useCommandScreen = (): UseCommandScreenResult => {
  const { stdout } = useStdout()

  const initialState = useMemo(
    () =>
      createInitialCommandScreenState({
        terminalRows: stdout?.rows ?? 24,
        terminalColumns: stdout?.columns ?? 80,
      }),
    [stdout?.columns, stdout?.rows],
  )

  const [state, dispatch] = useReducer(commandScreenReducer, initialState)

  const setTerminalSize = useCallback((rows: number, columns: number) => {
    dispatch({ type: 'set-terminal-size', rows, columns })
  }, [])

  const setInputValue = useCallback((next: SetStateAction<string>) => {
    dispatch({ type: 'set-input', next })
  }, [])

  const setPasteActive = useCallback((isPasteActive: boolean) => {
    dispatch({ type: 'set-paste-active', isPasteActive })
  }, [])

  const setCommandSelectionIndex = useCallback((next: SetStateAction<number>) => {
    dispatch({ type: 'set-command-selection', next })
  }, [])

  const setDebugKeyLine = useCallback((line: string | null) => {
    dispatch({ type: 'set-debug-line', line })
  }, [])

  const setIntentFilePath = useCallback((next: SetStateAction<string>) => {
    dispatch({ type: 'set-intent-file-path', next })
  }, [])

  const setPolishEnabled = useCallback((next: SetStateAction<boolean>) => {
    dispatch({ type: 'set-polish-enabled', next })
  }, [])

  const setCopyEnabled = useCallback((next: SetStateAction<boolean>) => {
    dispatch({ type: 'set-copy-enabled', next })
  }, [])

  const setChatGptEnabled = useCallback((next: SetStateAction<boolean>) => {
    dispatch({ type: 'set-chatgpt-enabled', next })
  }, [])

  const setJsonOutputEnabled = useCallback((next: SetStateAction<boolean>) => {
    dispatch({ type: 'set-json-output-enabled', next })
  }, [])

  return {
    state,
    setTerminalSize,
    setInputValue,
    setPasteActive,
    setCommandSelectionIndex,
    setDebugKeyLine,
    setIntentFilePath,
    setPolishEnabled,
    setCopyEnabled,
    setChatGptEnabled,
    setJsonOutputEnabled,
  }
}
