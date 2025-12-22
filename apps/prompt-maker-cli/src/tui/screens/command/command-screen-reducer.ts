/*
 * Command screen reducer (pure state transitions).
 *
 * This is the “screen model” for the main Ink TUI screen.
 *
 * Reducers in plain terms:
 * - Instead of calling many `setState(...)` functions from all over the file,
 *   we send small “actions” describing what happened.
 * - The reducer is a pure function that turns (previousState + action) into
 *   nextState.
 *
 * Why this helps:
 * - Keeps state transitions explicit and testable.
 * - Lets us update multiple related fields in one render.
 * - Reduces accidental bugs where different `setState` calls race.
 *
 * This file is intentionally pure: no React/Ink imports.
 */

// Lightweight replacement for React's SetStateAction.
export type SetStateAction<State> = State | ((prev: State) => State)

export type CommandScreenState = {
  terminalRows: number
  terminalColumns: number
  inputValue: string
  isPasteActive: boolean
  commandSelectionIndex: number
  debugKeyLine: string | null
}

export type CommandScreenAction =
  | { type: 'set-terminal-size'; rows: number; columns: number }
  | { type: 'set-input'; next: SetStateAction<string> }
  | { type: 'set-paste-active'; isPasteActive: boolean }
  | { type: 'set-command-selection'; next: SetStateAction<number> }
  | { type: 'set-debug-line'; line: string | null }

export const createInitialCommandScreenState = (options: {
  terminalRows: number
  terminalColumns: number
}): CommandScreenState => ({
  terminalRows: options.terminalRows,
  terminalColumns: options.terminalColumns,
  inputValue: '',
  isPasteActive: false,
  commandSelectionIndex: 0,
  debugKeyLine: null,
})

export const commandScreenReducer = (
  state: CommandScreenState,
  action: CommandScreenAction,
): CommandScreenState => {
  switch (action.type) {
    case 'set-terminal-size':
      // Terminal resize events can be noisy; avoid needless rerenders.
      if (state.terminalRows === action.rows && state.terminalColumns === action.columns) {
        return state
      }
      return { ...state, terminalRows: action.rows, terminalColumns: action.columns }

    case 'set-input': {
      const nextValue =
        typeof action.next === 'function' ? action.next(state.inputValue) : action.next
      return nextValue === state.inputValue ? state : { ...state, inputValue: nextValue }
    }

    case 'set-paste-active':
      return action.isPasteActive === state.isPasteActive
        ? state
        : { ...state, isPasteActive: action.isPasteActive }

    case 'set-command-selection': {
      const nextIndex =
        typeof action.next === 'function' ? action.next(state.commandSelectionIndex) : action.next

      return nextIndex === state.commandSelectionIndex
        ? state
        : { ...state, commandSelectionIndex: nextIndex }
    }

    case 'set-debug-line':
      return action.line === state.debugKeyLine ? state : { ...state, debugKeyLine: action.line }

    default:
      return state
  }
}
