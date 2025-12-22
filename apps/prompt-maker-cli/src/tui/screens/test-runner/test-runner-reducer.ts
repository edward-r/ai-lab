/*
 * Test runner reducer (pure state transitions).
 *
 * This reducer manages UI state for the TestRunnerScreen:
 * - current test file path
 * - focus (file input vs actions)
 * - loaded tests + per-test status
 * - last run info + summary + error
 *
 * Reducers in plain terms:
 * - We send "actions" describing what happened.
 * - The reducer is a pure function that returns the next state.
 *
 * Keeping this logic pure makes it easy to unit test and helps ensure the
 * screen refactor does not change behavior.
 */

export type SetStateAction<State> = State | ((prev: State) => State)

export type TestStatus = 'pending' | 'running' | 'pass' | 'fail'

export type TestDisplayState = {
  name: string
  status: TestStatus
  reason: string | null
}

export type FocusField = 'file' | 'actions'

export type RunStatus = 'idle' | 'running'

export type TestRunSummary = { passed: number; failed: number }

export type TestRunnerState = {
  filePath: string
  tests: TestDisplayState[]
  status: RunStatus
  error: string | null
  summary: TestRunSummary | null
  lastRunFile: string | null
  focus: FocusField
}

export type TestRunnerAction =
  | { type: 'set-file-path'; next: SetStateAction<string> }
  | { type: 'set-focus'; focus: FocusField }
  | { type: 'run-start' }
  | { type: 'suite-loaded'; loadedPath: string; testNames: string[] }
  | { type: 'test-start'; ordinal: number; name: string }
  | { type: 'test-complete'; ordinal: number; name: string; pass: boolean; reason: string | null }
  | { type: 'run-complete'; passed: number; failed: number }
  | { type: 'run-error'; message: string }

export const INITIAL_TEST_RUNNER_STATE: TestRunnerState = {
  filePath: 'prompt-tests.yaml',
  tests: [],
  status: 'idle',
  error: null,
  summary: null,
  lastRunFile: null,
  focus: 'file',
}

const updateTestAtOrdinal = (
  tests: TestDisplayState[],
  ordinal: number,
  updater: (prev: TestDisplayState) => TestDisplayState,
): TestDisplayState[] => {
  // Ordinals are 1-based in the test runner callbacks.
  const index = ordinal - 1
  if (index < 0 || index >= tests.length) {
    return tests
  }

  const next = [...tests]
  next[index] = updater(next[index] ?? { name: 'unknown', status: 'pending', reason: null })
  return next
}

export const testRunnerReducer = (
  state: TestRunnerState,
  action: TestRunnerAction,
): TestRunnerState => {
  switch (action.type) {
    case 'set-file-path': {
      const next = typeof action.next === 'function' ? action.next(state.filePath) : action.next
      return next === state.filePath ? state : { ...state, filePath: next }
    }

    case 'set-focus':
      return action.focus === state.focus ? state : { ...state, focus: action.focus }

    case 'run-start':
      return {
        ...state,
        status: 'running',
        error: null,
        summary: null,
        tests: [],
      }

    case 'suite-loaded':
      return {
        ...state,
        lastRunFile: action.loadedPath,
        tests: action.testNames.map((name) => ({ name, status: 'pending', reason: null })),
      }

    case 'test-start':
      return {
        ...state,
        tests: updateTestAtOrdinal(state.tests, action.ordinal, (prev) => ({
          ...prev,
          name: action.name,
          status: 'running',
        })),
      }

    case 'test-complete':
      return {
        ...state,
        tests: updateTestAtOrdinal(state.tests, action.ordinal, () => ({
          name: action.name,
          status: action.pass ? 'pass' : 'fail',
          reason: action.reason,
        })),
      }

    case 'run-complete':
      return {
        ...state,
        status: 'idle',
        summary: { passed: action.passed, failed: action.failed },
      }

    case 'run-error':
      return {
        ...state,
        status: 'idle',
        error: action.message,
      }

    default:
      return state
  }
}
