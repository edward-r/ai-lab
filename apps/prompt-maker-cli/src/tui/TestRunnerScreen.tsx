/*
 * TestRunnerScreen entry point.
 *
 * This file intentionally stays small.
 * The implementation lives under `src/tui/screens/test-runner/*` so it can share
 * the same reducer-driven architecture as the command screen.
 */

export { TestRunnerScreen } from './screens/test-runner/TestRunnerScreen'
export type {
  TestRunnerScreenHandle,
  TestRunnerScreenProps,
} from './screens/test-runner/TestRunnerScreen'
