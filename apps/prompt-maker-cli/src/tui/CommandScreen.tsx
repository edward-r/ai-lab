/*
 * CommandScreen entry point.
 *
 * This file intentionally stays small.
 * The real implementation lives under `src/tui/screens/command/*` so we can
 * split the screen into a reducer-driven model + smaller components over time.
 */

export { CommandScreen } from './screens/command/CommandScreen'
export type { CommandScreenHandle } from './screens/command/CommandScreen'
