/*
 * useTestRunnerScreen
 *
 * Hook wrapper around the pure test runner reducer.
 *
 * This keeps `TestRunnerScreen` focused on orchestration (Ink input, async test
 * execution) and keeps state transitions explicit and testable.
 */

import { useCallback, useMemo, useReducer } from 'react'

import {
  INITIAL_TEST_RUNNER_STATE,
  testRunnerReducer,
  type FocusField,
  type SetStateAction,
  type TestRunnerState,
} from './test-runner-reducer'

const focusOrder: FocusField[] = ['file', 'actions']

const nextFocus = (current: FocusField): FocusField => {
  const index = focusOrder.indexOf(current)
  return focusOrder[(index + 1) % focusOrder.length] ?? 'file'
}

const previousFocus = (current: FocusField): FocusField => {
  const index = focusOrder.indexOf(current)
  return focusOrder[(index - 1 + focusOrder.length) % focusOrder.length] ?? 'file'
}

export type UseTestRunnerScreenResult = {
  state: TestRunnerState
  canRun: boolean
  setFilePath: (next: SetStateAction<string>) => void
  focusNext: () => void
  focusPrevious: () => void
  setFocus: (focus: FocusField) => void
  startRun: () => void
  suiteLoaded: (loadedPath: string, testNames: string[]) => void
  testStarted: (ordinal: number, name: string) => void
  testCompleted: (ordinal: number, name: string, pass: boolean, reason: string | null) => void
  runCompleted: (passed: number, failed: number) => void
  runErrored: (message: string) => void
}

export const useTestRunnerScreen = (): UseTestRunnerScreenResult => {
  const [state, dispatch] = useReducer(testRunnerReducer, INITIAL_TEST_RUNNER_STATE)

  const canRun = useMemo(
    () => state.status !== 'running' && state.filePath.trim().length > 0,
    [state.filePath, state.status],
  )

  const setFilePath = useCallback((next: SetStateAction<string>) => {
    dispatch({ type: 'set-file-path', next })
  }, [])

  const setFocus = useCallback((focus: FocusField) => {
    dispatch({ type: 'set-focus', focus })
  }, [])

  const focusNext = useCallback(() => {
    setFocus(nextFocus(state.focus))
  }, [setFocus, state.focus])

  const focusPrevious = useCallback(() => {
    setFocus(previousFocus(state.focus))
  }, [setFocus, state.focus])

  const startRun = useCallback(() => {
    dispatch({ type: 'run-start' })
  }, [])

  const suiteLoaded = useCallback((loadedPath: string, testNames: string[]) => {
    dispatch({ type: 'suite-loaded', loadedPath, testNames })
  }, [])

  const testStarted = useCallback((ordinal: number, name: string) => {
    dispatch({ type: 'test-start', ordinal, name })
  }, [])

  const testCompleted = useCallback(
    (ordinal: number, name: string, pass: boolean, reason: string | null) => {
      dispatch({ type: 'test-complete', ordinal, name, pass, reason })
    },
    [],
  )

  const runCompleted = useCallback((passed: number, failed: number) => {
    dispatch({ type: 'run-complete', passed, failed })
  }, [])

  const runErrored = useCallback((message: string) => {
    dispatch({ type: 'run-error', message })
  }, [])

  return {
    state,
    canRun,
    setFilePath,
    focusNext,
    focusPrevious,
    setFocus,
    startRun,
    suiteLoaded,
    testStarted,
    testCompleted,
    runCompleted,
    runErrored,
  }
}
