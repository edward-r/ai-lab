# prompt-maker-cli TUI Developer Note

This document explains the _current_ Ink TUI architecture in `apps/prompt-maker-cli/src/tui/**` after the refactor series.

Goals of this architecture:

- Keep UI behavior stable while making state flow explicit.
- Reduce avoidable re-renders by stabilizing props/callbacks.
- Make complex state transitions unit-testable (pure reducers).

## Directory structure

### Entry points (thin re-exports)

These files stay intentionally small so “big screens” don’t live in the root `tui/` folder:

- `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`
- `apps/prompt-maker-cli/src/tui/TestRunnerScreen.tsx`

### Screens

Each screen owns orchestration + rendering, and delegates state transitions to a reducer.

- Command screen
  - `apps/prompt-maker-cli/src/tui/screens/command/CommandScreen.tsx`
  - `apps/prompt-maker-cli/src/tui/screens/command/useCommandScreen.ts`
  - `apps/prompt-maker-cli/src/tui/screens/command/command-screen-reducer.ts`
  - `apps/prompt-maker-cli/src/tui/screens/command/components/*`

- Test runner
  - `apps/prompt-maker-cli/src/tui/screens/test-runner/TestRunnerScreen.tsx`
  - `apps/prompt-maker-cli/src/tui/screens/test-runner/useTestRunnerScreen.ts`
  - `apps/prompt-maker-cli/src/tui/screens/test-runner/test-runner-reducer.ts`
  - `apps/prompt-maker-cli/src/tui/screens/test-runner/components/*`

### Cross-screen hooks and reducers

These modules are shared “feature hooks” used by screens:

- Popup state machine
  - Pure reducer: `apps/prompt-maker-cli/src/tui/popup-reducer.ts`
  - Hook + effects: `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`

- Generation pipeline
  - Pure reducer: `apps/prompt-maker-cli/src/tui/generation-pipeline-reducer.ts`
  - Hook + effects: `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`

### Core UI components

Reusable Ink components live in:

- `apps/prompt-maker-cli/src/tui/components/core/*`
- `apps/prompt-maker-cli/src/tui/components/popups/*`

Rule of thumb:

- **Core components** should be mostly presentational: props in, render out.
- Side effects (timers, subscriptions, async work) belong in hooks/screens.

## Input routing invariants

Input routing is one of the easiest places for TUIs to regress.

The intended priority order is:

1. **Help overlay**: when help is open, most screen input should be suppressed.
2. **Popup input**: when any popup is open, it should “own” the keyboard.
3. **Screen input**: otherwise, the active screen handles keys.
4. **AppContainer global keys**: keys like exit remain truly global.

Implementation notes:

- `usePopupManager` exposes `popupState` and popup actions; screens should use `popupState !== null` to decide whether screen-level inputs should be active.
- Avoid “fallthrough” key handling where the same key can be interpreted by both a popup and the screen.

## Reducers: responsibilities and patterns

Why reducers are used here (plain terms):

- Instead of calling many different `setState(...)` functions from many callbacks, we send a single “action” describing what happened.
- The reducer is a pure function that returns the next state.

Benefits:

- Easier to reason about state transitions.
- Easier to test (no Ink/TTY required).
- Often fewer renders because multiple fields can change in one dispatch.

Patterns used in this codebase:

- Pure reducers live in `*-reducer.ts` files with no React/Ink imports.
- Hooks (e.g. `usePopupManager`, `useGenerationPipeline`) wrap reducers and are responsible for effects.

### Stale closure (important React/Ink concept)

A “stale closure” happens when a callback captures old values.

Example:

- If a stable `handleStreamEvent` callback closes over an old terminal width, it would keep wrapping output at the wrong width after resize.

Fix pattern used here:

- Keep callbacks stable, but read changing values from refs (e.g. `terminalColumnsRef.current`).

## Performance notes

### Windowing and log/history rendering

- Main history rendering is windowed using `ScrollableOutput` which slices to the visible rows.
- List/windowing primitives live in `apps/prompt-maker-cli/src/tui/components/popups/list-window.ts`.
- Test runner logs are capped by `useLogBuffer` (default 20 entries) in `apps/prompt-maker-cli/src/tui/useLogBuffer.ts`.

### Where re-renders come from

Typical rerender causes in this TUI:

- Passing newly-created arrays/objects as props (e.g. `statusChips`, filtered lists).
- Recreating callbacks each render.
- Doing heavy formatting work in render paths.

Mitigations used:

- Memoize derived arrays when it actually prevents work.
- Use reducer dispatches to group related state updates.
- Use refs to avoid stale closures when callbacks must stay stable.

### Before vs after (high-level)

Before:

- `CommandScreen.tsx` and popup/generation logic mixed together in large, hard-to-test modules.
- More state “fan out” across many `useState` hooks.
- Async popup suggestion scans relied on implicit “prev.type === …” guards.

After:

- Popups and pipeline have explicit reducers and tests.
- Screens are organized under `screens/*` with presentational subcomponents.
- Async suggestion scans are guarded with scan IDs to avoid stale updates.

Why it matters:

- Less accidental rerender churn during typing.
- Fewer subtle regressions when splitting UI or moving logic.
- Faster onboarding: new contributors can locate “state vs effects vs rendering” more easily.

## How to add a new popup safely

1. Add a new popup union member in `apps/prompt-maker-cli/src/tui/types.ts`.
2. Add explicit transitions in `apps/prompt-maker-cli/src/tui/popup-reducer.ts`.
3. Add the render branch in `apps/prompt-maker-cli/src/tui/screens/command/components/PopupArea.tsx`.
4. Add a reducer unit test in `apps/prompt-maker-cli/src/__tests__/popup-reducer.test.ts`.

Keep behavior stable:

- Prefer “open-\*” actions for initial state.
- If the popup loads async suggestions, ensure scan results are only applied when popup type + scan id still match.

## How to add a new screen safely

1. Create `apps/prompt-maker-cli/src/tui/screens/<name>/`.
2. Add a pure reducer `*-reducer.ts`.
3. Add a screen hook `use<Name>Screen.ts` to expose a view-model API.
4. Keep the root-level entry file (`apps/prompt-maker-cli/src/tui/<Name>Screen.tsx`) as a small re-export.

## Manual verification checklist

These checks are intentionally “human-visible” and catch most regressions quickly:

- Responsiveness while typing quickly in the command input.
- Large history:
  - generate a long output and scroll; ensure no lag.
- Large model list:
  - open model popup and type queries quickly.
- Popup churn:
  - open/close popups repeatedly; ensure no delayed updates after switching.
- Test runner:
  - tab between fields, run tests, confirm statuses + logs update.
