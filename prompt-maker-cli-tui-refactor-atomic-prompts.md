# prompt-maker-cli TUI Refactor — Atomic Prompt Series

This file decomposes the provided “refactor the Ink TUI” prompt into a **series of atomic prompts**. Each atomic prompt is designed to be run in a **fresh coding session** and is **self-contained**: it restates context, constraints, and validation steps.

Important properties of this series:

- **Incremental**: each prompt assumes the repo already includes the changes from earlier prompts.
- **No repeated work**: each prompt focuses on a distinct deliverable.
- **Behavior-preserving by default**: no user-visible changes unless explicitly called out.
- **Junior-friendly inline documentation**: every touched file must include a module overview + section comments + inline commentary for non-trivial logic.

Repository scope:

- Primary focus: `apps/prompt-maker-cli/src/tui/**`
- Related call-into code (avoid refactors unless required for correctness):
  - `apps/prompt-maker-cli/src/generate-command.ts`
  - `apps/prompt-maker-cli/src/prompt-generator-service.ts`

Global constraints (apply to every prompt):

- Preserve existing user-visible behavior (same commands, keybindings, popups, UX).
- Keep entry behavior stable: `apps/prompt-maker-cli/src/index.ts`, `apps/prompt-maker-cli/src/tui/index.tsx`.
- TypeScript strict: **do not use `any`**, prefer `unknown` + narrowing.
- Avoid heavy new dependencies.
- Keep the TUI functional in TTY interactive mode and in non-TTY contexts (tests/CI).
- If you add new pure helpers, add unit tests for them under `apps/prompt-maker-cli/src/__tests__/**`.

Run commands (as applicable):

- Unit tests: `npx jest --runInBand`
- Targeted tests: `npx jest <path> --runInBand`
- Lint (optional when relevant): `npx nx lint prompt-maker-cli`
- Build/run CLI (manual validation): `npx nx build prompt-maker-cli` and `npx nx serve prompt-maker-cli -- --help`

---

## Prompt 0 — Series Overview (use this as the “overview prompt”)

### Title

Plan a safe, incremental refactor of the prompt-maker-cli Ink TUI

### Role

You are a senior TypeScript + React (Ink) engineer and TUI architect.

### Context

You are working in `apps/prompt-maker-cli`, focusing on the Ink-based TUI under `apps/prompt-maker-cli/src/tui/**`.

The TUI works today, but we want a refactor that:

- follows Ink/TUI best practices
- improves performance by reducing unnecessary re-renders and heavy render-time work
- improves maintainability by separating concerns and clarifying state flow
- adds **junior-friendly inline comments** (top-of-file overview + section comments + inline explanation)

Key files to prioritize:

- `apps/prompt-maker-cli/src/tui/AppContainer.tsx`
- `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`
- `apps/prompt-maker-cli/src/tui/TestRunnerScreen.tsx`
- `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`
- `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`
- `apps/prompt-maker-cli/src/tui/components/core/*`
- `apps/prompt-maker-cli/src/tui/components/popups/*`
- `apps/prompt-maker-cli/src/tui/*-keymap.ts`, `command-filter.ts`, `file-suggestions.ts`, `model-*.ts`, `provider-status.ts`

### Task

Produce a short implementation plan for the refactor with:

1. Top 5 complexity hotspots and why.
2. Proposed module boundaries (screens/state/input/components) that keep behavior stable.
3. A staged sequence (matching the atomic prompts in this file), describing risks and how to validate after each stage.

### Constraints

- Do not implement code changes in this step.
- Do not change user-facing behavior.

### Deliverable

Post the plan in the session output (no file write required).

### Validation

- Plan references real files/concerns and includes per-stage validation.

---

## Prompt 1 — Baseline helpers + tests: command filtering and windowing primitives

### Title

Extract and test pure TUI primitives: filtering + windowing

### Role

You are a senior TypeScript + React (Ink) engineer.

### Preconditions (assume true before you start)

- Repository is at baseline state (or only contains planning docs); no refactor code has been applied yet.

### Context

We want to refactor the Ink TUI safely. The safest first step is to extract/normalize **pure helper logic** and add tests, so later component splits don’t break behavior.

Focus areas:

- Filtering logic used for command/model/file suggestions.
- “Windowing” logic used to display long lists (history, suggestions, logs) without rendering everything.

### Tasks

1. Identify existing pure-ish helpers that can be made fully pure and stable, prioritizing:
   - `apps/prompt-maker-cli/src/tui/command-filter.ts`
   - any existing list windowing / cursor window calculations used in the TUI
2. Extract (or rewrite) **small pure functions** with explicit types and no side effects:
   - A filter function that takes `(items, query)` and returns results with stable ordering.
   - A windowing function that takes `(itemCount, cursorIndex, windowSize)` and returns `{startIndex, endIndexExclusive}`.
3. Ensure helpers do not import React/Ink; they must be usable from tests without a TTY.
4. Add unit tests under `apps/prompt-maker-cli/src/__tests__/` that lock in behavior:
   - filtering with empty query
   - filtering with exact match
   - filtering with substring/fuzzy behavior (whatever current UX implies)
   - windowing near start, middle, end
   - windowing for small lists (< windowSize)
5. Add junior-friendly comments in every touched helper file:
   - top-of-file overview comment
   - section comments
   - inline comments for tricky logic

### Constraints

- Preserve current UX semantics (don’t “improve” ranking unless it matches current behavior).
- No new dependencies.
- No `any`.

### Deliverables

- Pure helper(s) extracted and used by existing call sites (minimal wiring change only).
- New tests that pass.

### Validation

- Run: `npx jest --runInBand`
- Manually smoke-check TUI quickly:
  - start CLI and type in command palette
  - confirm filtering behavior feels unchanged

---

## Prompt 2 — Refactor input/key handling into a predictable layered model

### Title

Make input handling layered and predictable (global vs screen vs popup)

### Role

You are a senior TypeScript + React (Ink) engineer and TUI architect.

### Preconditions (assume true before you start)

- Prompt 1 is complete.
- Pure filtering/windowing helpers exist and are covered by tests.

### Context

Ink apps can become brittle when key handling is scattered across components. We want a clear, layered input model:

- **Global**: app-level keys (quit, help overlay).
- **Screen-level**: CommandScreen/TestRunnerScreen keys.
- **Popup-level**: when a popup is open, it gets priority; underlying screen must not react.

Likely relevant files:

- `apps/prompt-maker-cli/src/tui/AppContainer.tsx`
- `apps/prompt-maker-cli/src/tui/*-keymap.ts`
- `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`
- popup components in `apps/prompt-maker-cli/src/tui/components/popups/*`

### Tasks

1. Document and enforce a single “input routing” rule:
   - If a popup is open, only popup handlers run (except a very small set of truly global keys if already intended).
   - If help overlay is open, it suppresses all other inputs except closing.
2. Refactor keymaps/handlers to make dependencies stable:
   - avoid recreating handler maps every render
   - use `useCallback` for handlers that are passed down
3. Ensure `useEffect` usage in input handling is minimal and has stable dependency arrays.
4. Add junior-friendly inline comments explaining:
   - how Ink’s `useInput` works
   - why layered routing prevents “double handling” bugs
   - typical failure modes (stale closures, unstable dependencies)

### Constraints

- Do not change any keybindings or visible behavior.
- No new dependencies.
- Keep non-TTY/test contexts working.

### Deliverables

- Input routing behavior is explicit and encoded in a small number of well-named functions/hooks.

### Validation

- Run: `npx jest --runInBand`
- Manual TUI checks:
  - open a popup; verify underlying screen does not react to arrow keys
  - open help overlay; verify it suppresses input

---

## Prompt 3 — Refactor `usePopupManager` into a reducer with explicit transitions

### Title

Make popup state transitions explicit with a reducer

### Role

You are a senior TypeScript + React (Ink) engineer.

### Preconditions (assume true before you start)

- Prompt 1 and Prompt 2 are complete.
- Input routing is already layered and predictable.

### Context

Popup behavior tends to accumulate complex state: active popup type, selected item, transient UI state, etc. Reducers make transitions explicit and testable.

Target file:

- `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`

### Tasks

1. Convert popup management to a reducer-based design:
   - Define `PopupState` and a `PopupAction` union.
   - Write a pure `popupReducer(state, action)`.
   - Keep existing external API of `usePopupManager` as stable as possible.
2. Move any non-UI computations out of the hook render path:
   - compute derived popup props via `useMemo` keyed on minimal deps
3. Ensure cleanup for any timers/listeners is correct and clearly documented.
4. Add tests for the reducer if it is non-trivial:
   - actions open/close popup
   - switching popups
   - restoring focus/cursor indices as currently expected
5. Add junior-friendly comments:
   - what a reducer is (in plain terms)
   - why explicit actions are safer than ad-hoc `setState`

### Constraints

- Preserve popup UX and content.
- Avoid touching non-popup features.

### Deliverables

- `usePopupManager` becomes a thin hook around a pure reducer.
- Reducer transitions are easy to read.

### Validation

- Run: `npx jest --runInBand`
- Manual TUI checks:
  - open/close multiple popups repeatedly
  - verify focus returns where it used to

---

## Prompt 4 — Refactor `useGenerationPipeline` to isolate effects and reduce rerenders

### Title

Stabilize generation pipeline state and side effects

### Role

You are a senior TypeScript + React (Ink) engineer.

### Preconditions (assume true before you start)

- Prompt 1–3 are complete.
- Popup state transitions are reducer-based and stable.

### Context

The generation pipeline is a common source of expensive work and repeated effects (token counting, streaming logs, status updates).

Target file:

- `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`

Related (do not refactor unless needed for correctness):

- `apps/prompt-maker-cli/src/generate-command.ts`
- `apps/prompt-maker-cli/src/prompt-generator-service.ts`

### Tasks

1. Identify and separate concerns inside `useGenerationPipeline`:
   - pure state transitions (suitable for a reducer)
   - side effects (subscriptions, timers, stdout writes)
   - derived display state
2. Introduce a reducer for pipeline state if transitions are complex.
3. Ensure effects:
   - have stable dependencies
   - are idempotent where appropriate
   - always clean up subscriptions/listeners
4. Reduce render-time cost:
   - move heavy formatting or data shaping behind `useMemo` with minimal deps
   - avoid recreating large arrays/objects on each render
5. Add tests for any new pure logic (reducers/helpers).
6. Add junior-friendly comments:
   - why effects need cleanup
   - what “stale closure” means with a concrete example

### Constraints

- Preserve generation behavior and telemetry.
- Avoid changing LLM/core logic.

### Deliverables

- `useGenerationPipeline` is easier to reason about and generates fewer unnecessary renders.

### Validation

- Run: `npx jest --runInBand`
- Manual checks:
  - run a generation flow; verify streaming/log updates still work
  - verify cancellation/cleanup behavior (no runaway updates)

---

## Prompt 5 — Break up `CommandScreen` into cohesive subcomponents + a screen reducer

### Title

Split CommandScreen into smaller components and a reducer-driven screen model

### Role

You are a senior TypeScript + React (Ink) engineer and TUI architect.

### Preconditions (assume true before you start)

- Prompt 1–4 are complete.
- Filtering/windowing helpers are stable and tested.
- Popup management + generation pipeline are refactored with clearer boundaries.

### Context

`CommandScreen.tsx` is likely a “god component”. We want to reduce complexity by extracting:

- presentational subcomponents
- a screen-level reducer/hook for state transitions

Target file:

- `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`

Suggested new structure (only if it fits existing repo conventions):

- `apps/prompt-maker-cli/src/tui/screens/command/` (or similar)
  - `CommandScreen.tsx` (small orchestrator)
  - `useCommandScreen.ts` (reducer + actions)
  - `components/CommandInput.tsx`
  - `components/SuggestionList.tsx`
  - `components/HistoryPane.tsx`
  - `components/StatusBar.tsx`

### Tasks

1. Define the responsibilities of CommandScreen:
   - orchestration only (wire hooks + render layout)
2. Extract a reducer-based screen hook:
   - `CommandScreenState` + `CommandScreenAction` union
   - pure reducer with explicit transitions
3. Extract subcomponents:
   - must be mostly presentational and accept data + callbacks
   - use `React.memo` only where it demonstrably prevents re-render churn
4. Ensure performance improvements:
   - stable callbacks (`useCallback`) passed into lists
   - heavy suggestion formatting/filtering is memoized by `(query, sourceItems)`
   - list windowing uses the windowing helper from Prompt 1
5. Add junior-friendly comments in every touched/new file.
6. Add tests for any new pure reducer logic.

### Constraints

- Preserve UX behavior and keybindings.
- Do not remove features (popups, smart context, series, tests, token usage, reasoning popup, settings, etc.).

### Deliverables

- `CommandScreen` file is significantly smaller and easier to reason about.
- State transitions are explicit and testable.

### Validation

- Run: `npx jest --runInBand`
- Manual TUI checks:
  - type into command palette; navigate suggestions
  - open/close popups from command screen
  - verify history/log rendering still behaves

---

## Prompt 6 — Apply the same structure to `TestRunnerScreen` and shared core components

### Title

Refactor TestRunnerScreen + core components for the new architecture

### Role

You are a senior TypeScript + React (Ink) engineer.

### Preconditions (assume true before you start)

- Prompt 1–5 are complete.
- CommandScreen is split into reducer + subcomponents.

### Context

To keep the codebase consistent, apply the same principles to `TestRunnerScreen` and any core components that suffered from unstable props or heavy render work.

Targets:

- `apps/prompt-maker-cli/src/tui/TestRunnerScreen.tsx`
- `apps/prompt-maker-cli/src/tui/components/core/*`

### Tasks

1. Refactor `TestRunnerScreen.tsx`:
   - extract a reducer/hook if state transitions are complex
   - extract subcomponents if layout is doing too much work
2. Audit `components/core/*` for:
   - unstable props causing rerenders
   - expensive computations inside render
   - missing cleanup in effects
3. Add/strengthen memoization only where it prevents real work.
4. Add junior-friendly comments in every touched file.
5. Add tests for any new pure helpers/reducers.

### Constraints

- Preserve test runner UX.
- Avoid any cross-cutting changes outside the TUI unless required.

### Deliverables

- Test runner flow is consistent with CommandScreen architecture.
- Core components have predictable render cost.

### Validation

- Run: `npx jest --runInBand`
- Manual checks:
  - run test flow in TUI
  - verify progress/log windowing still behaves

---

## Prompt 7 — Performance audit + developer note (final polish)

### Title

Finalize performance improvements and write the developer note

### Role

You are a senior TypeScript + React (Ink) engineer.

### Preconditions (assume true before you start)

- Prompt 1–6 are complete.
- The TUI refactor is structurally done and behavior is stable.

### Context

We want a final pass to ensure performance goals were met and document the new architecture so future contributors can navigate the code.

### Tasks

1. Do a focused performance audit:
   - find the top re-render sources (unstable props/callbacks)
   - remove “cargo cult” memoization that adds complexity without benefit
   - ensure heavy work is behind correct memoization keys
2. Ensure history/log rendering is stable and windowed where appropriate.
3. Add a short “before vs after” note:
   - what was improved
   - why it matters
   - how to verify manually (responsiveness while typing, large histories, large model lists)
4. Create (or update) a developer note markdown file describing:
   - new structure (screens/state/input/components)
   - key invariants (input routing rules, reducer responsibilities)
   - how to add new popups/screens safely

Recommended file location:

- `apps/prompt-maker-cli/src/tui/DEVELOPER_NOTE.md`

Also ensure every touched file has:

- top-of-file overview
- section comments
- inline comments for non-trivial logic

### Constraints

- No user-visible behavior changes.
- Avoid adding dependencies.

### Deliverables

- Performance polish is complete.
- Developer note exists and is accurate.

### Validation

- Run: `npx jest --runInBand`
- Optional: `npx nx lint prompt-maker-cli`
- Manual checks:
  - TUI stays responsive during rapid typing
  - open/close popups quickly (no lag)

---

## Patch Description Template (use in your PR)

Use this template as the PR body (copy/paste):

```md
## Summary

- Refactors Ink TUI into reducer-driven screen architecture with clearer boundaries.
- Reduces unnecessary rerenders by stabilizing callbacks and memoizing heavy derived data.

## Key Changes

- Input routing is explicitly layered (global/screen/popup) to prevent double-handling.
- `usePopupManager` and `useGenerationPipeline` use reducers with explicit transitions.
- `CommandScreen` (and `TestRunnerScreen`) are split into focused subcomponents.

## Performance Notes

- Before: typing/navigation could trigger repeated heavy filtering/formatting.
- After: filtering/windowing are pure + memoized with minimal dependencies; list rendering is consistently windowed.

## Validation

- `npx jest --runInBand`
- Manual: command palette navigation, popups, bracketed paste, generation flow, test runner.
```
