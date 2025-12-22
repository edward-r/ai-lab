# prompt-maker-cli Ink TUI Refactor Plan (Behavior-Preserving)

Scope: `apps/prompt-maker-cli/src/tui/**` (Ink/React).

Goals:

- Follow Ink/TUI best practices: predictable input routing, focused components, explicit state transitions.
- Improve performance: fewer avoidable re-renders, less heavy work during render, and fewer cascading state updates.
- Improve maintainability: clear module boundaries, stable contracts between “screen state” and “presentational components”.
- Add junior-friendly inline comments in touched files (module overview + section comments + inline notes for tricky logic).

Non-goals / hard constraints:

- No user-facing behavior changes (commands, keybindings, popups, output formatting).
- Avoid refactors outside the TUI unless required for correctness (especially `apps/prompt-maker-cli/src/generate-command.ts` and `apps/prompt-maker-cli/src/prompt-generator-service.ts`).
- No new heavy dependencies; TypeScript strict; no `any`.

---

## Current Architecture (Reality Check)

Entry + shell:

- `apps/prompt-maker-cli/src/tui/index.tsx`: Ink `render()` entry.
- `apps/prompt-maker-cli/src/tui/AppContainer.tsx`: top-level view switch (`generate` vs `tests`), global input (`Ctrl+G`, `Ctrl+T`, `?`, `Ctrl+C`), help overlay, toast.

Big screens and state “centers of gravity”:

- `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`: large orchestrator for the main “generate” view.
  - Owns: text input (including bracketed paste/token substitution), command palette, popups, model selection, provider status checks, history/log window sizing, and wiring to generation pipeline.
  - Integrates: `useGenerationPipeline`, `usePopupManager`, `useCommandHistory`, `usePersistentCommandHistory`, `ContextProvider` store.
- `apps/prompt-maker-cli/src/tui/TestRunnerScreen.tsx`: simple test runner with its own input routing and log buffer.

Cross-cutting helpers:

- Filtering/scoring:
  - `apps/prompt-maker-cli/src/tui/command-filter.ts`
  - `apps/prompt-maker-cli/src/tui/model-filter.ts`
  - `apps/prompt-maker-cli/src/tui/file-suggestions.ts` (both scanning via `fast-glob` and filtering/scoring)
- Windowing:
  - `apps/prompt-maker-cli/src/tui/components/popups/list-window.ts` (`resolveWindowedList`)
  - `apps/prompt-maker-cli/src/tui/components/core/ScrollableOutput.tsx` (manual slice)
- Input/keymaps:
  - `apps/prompt-maker-cli/src/tui/app-container-keymap.ts`
  - `apps/prompt-maker-cli/src/tui/components/core/command-menu-keymap.ts`
  - `apps/prompt-maker-cli/src/tui/components/core/*TextInput*.tsx` and related `*-keymap.ts`

---

## 1) Top 5 Complexity Hotspots (and why)

### 1. `CommandScreen.tsx` is a “god component”

Files:

- `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`

Why it’s complex:

- Mixes unrelated concerns in one render tree: input parsing, paste/token management, history, provider status, model loading, popups, generation pipeline integration.
- Many local states + refs + effects → hard to reason about ordering and invariants.
- High re-render surface area: any state change can re-run derived computations and recreate props passed to child components.

Performance risks today:

- Derived values like filtered command list, layout calculations, and “dropped file” stat checks are recomputed frequently.
- Multiple `useEffect` blocks with async work can update state in bursts (model options load, provider checks), fanning out re-renders.

### 2. `useGenerationPipeline.ts` mixes state transitions, side effects, and formatting

Files:

- `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`

Why it’s complex:

- Owns interactive refinement flow via `InteractiveDelegate` + refs and state.
- A single streaming event (e.g. iteration complete) can push many history lines (wrap + split) and update multiple pieces of state.
- Timer-driven spinner updates (`setInterval`) add “background churn” while busy.

Performance risks today:

- Per-event wrapping logic (`wrapAnsi`, `split`) happens inside `handleStreamEvent` and can generate many history updates.
- The hook’s API forces many inputs (files/urls/images/videos/meta flags), increasing memo/effect dependency complexity.

### 3. `usePopupManager.ts` is an implicit state machine with async side effects

Files:

- `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`

Why it’s complex:

- Uses a single `popupState` union and many ad-hoc `setPopupState(...)` transitions.
- Async scanning (file/dir/intent suggestions) updates popup state after open; race/cancellation logic is implicit.
- Responsibility spill: it also performs business actions (toggle options, run series/tests, exit) not strictly “popup state”.

Performance / correctness risks:

- Async scan completion can update state after popup changes unless carefully guarded.
- Many callbacks depend on large option objects → unstable identities can cascade into child rerenders.

### 4. Input routing is scattered and relies on “suppression” flags

Files:

- `apps/prompt-maker-cli/src/tui/AppContainer.tsx` (global `useInput`)
- `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` (screen/popup/key handling)
- `apps/prompt-maker-cli/src/tui/TestRunnerScreen.tsx`
- `apps/prompt-maker-cli/src/tui/components/core/MultilineTextInput.tsx`

Why it’s complex:

- Multiple `useInput` handlers exist at different levels.
- “suppress next input” is implemented via refs in multiple places; behavior depends on timing of Ink input events.

Risks:

- Double-handling of keys when a popup or help overlay is open.
- Stale closures if handlers capture outdated state.

### 5. Suggestion discovery + filtering mixes IO and ranking logic

Files:

- `apps/prompt-maker-cli/src/tui/file-suggestions.ts`

Why it’s complex:

- Both discovery (IO via `fast-glob`) and ranking/filtering live together.
- Popup open triggers scans that can be expensive in large repos.

Risks:

- Accidental changes to ranking semantics (subsequence scoring is subtle and UX-sensitive).
- Hard to test IO code; ranking behavior needs lock-in tests.

---

## 2) Proposed Module Boundaries (Screens / State / Input / Components)

The goal is to reduce coupling without changing runtime behavior.

### A. Screens (orchestrators only)

Keep these as “wiring + layout” files that:

- call hooks
- build stable props
- render presentational components

Targets:

- `apps/prompt-maker-cli/src/tui/AppContainer.tsx` (stays the outer shell)
- `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` → shrinks to orchestrator
- `apps/prompt-maker-cli/src/tui/TestRunnerScreen.tsx` → optionally shrinks similarly

Recommended (when Prompt 5 begins):

- `apps/prompt-maker-cli/src/tui/screens/command/*`
- `apps/prompt-maker-cli/src/tui/screens/test-runner/*`

### B. State + reducers (pure transitions)

Create “screen models” as reducers and pure helpers so behavior is testable and stable:

- Popup transitions: reducer extracted from `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`
- Generation pipeline transitions: reducer (if helpful) extracted from `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`
- Command screen transitions: reducer extracted from `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`

Naming convention:

- `state/*.ts` or `model/*.ts` inside each screen folder.
- Pure reducers exported as `XReducer(state, action)` and unit-tested.

### C. Input layer (routing + keymaps)

Make input routing a first-class boundary:

- **Global input**: handled in `AppContainer.tsx` via `resolveAppContainerKeyAction`.
- **Screen input**: handled in screen-level hooks/components.
- **Popup input**: handled inside popup components (or a popup “controller”) with a single rule: when a popup is open, it exclusively owns inputs (except explicitly allowed truly-global keys).

Where to put this:

- keep pure keymap logic in `*-keymap.ts` modules:
  - `apps/prompt-maker-cli/src/tui/app-container-keymap.ts`
  - `apps/prompt-maker-cli/src/tui/components/core/command-menu-keymap.ts`
  - `apps/prompt-maker-cli/src/tui/components/core/single-line-text-input-keymap.ts`
- introduce (later) a small input-router helper/hook (e.g. `apps/prompt-maker-cli/src/tui/input/useInputRouter.ts`) that applies the priority rules.

### D. Presentational components (pure-ish, memo-friendly)

Components should accept:

- data (already derived)
- callbacks (stable via `useCallback`)
- minimal config props

Targets:

- `apps/prompt-maker-cli/src/tui/components/core/*`
- `apps/prompt-maker-cli/src/tui/components/popups/*`

Important guideline:

- Use `React.memo` only when it prevents real churn. Prefer stabilizing data/callback identities first.

### E. Pure helpers (no Ink/React imports)

Keep logic testable and stable.

Candidates:

- Filtering/scoring: `apps/prompt-maker-cli/src/tui/command-filter.ts`, `apps/prompt-maker-cli/src/tui/model-filter.ts`, and the filtering portion of `apps/prompt-maker-cli/src/tui/file-suggestions.ts`.
- Windowing: `apps/prompt-maker-cli/src/tui/components/popups/list-window.ts` (move or re-export as a generic `tui/windowing.ts`).

---

## 3) Staged Sequence (Aligned With `prompt-maker-cli-tui-refactor-atomic-prompts.md`)

This sequence mirrors the existing atomic prompt series so each step is small, behavior-preserving, and easy to validate.

### Prompt 0 — Planning (this document)

Output: this plan file.

Validation:

- Plan references real files and a staged approach.

### Prompt 1 — Baseline helpers + tests: filtering and windowing primitives

Primary targets:

- `apps/prompt-maker-cli/src/tui/command-filter.ts`
- `apps/prompt-maker-cli/src/tui/model-filter.ts`
- `apps/prompt-maker-cli/src/tui/file-suggestions.ts` (filtering functions)
- `apps/prompt-maker-cli/src/tui/components/popups/list-window.ts`

Approach:

- Identify “pure-ish” logic already present and lock behavior with unit tests.
- If extraction is needed, do it as a re-export/move with minimal call-site changes.

Key risks:

- Changing ranking semantics by accident (especially subsequence scoring in `model-filter.ts` and `file-suggestions.ts`).
- Breaking list navigation if windowing edge cases change.

Validation:

- `npx jest --runInBand`
- Manual smoke: open command palette, model popup, file/intent popups; confirm ordering and selection feel unchanged.

### Prompt 2 — Layered input handling (global vs screen vs popup)

Primary targets:

- `apps/prompt-maker-cli/src/tui/AppContainer.tsx`
- `apps/prompt-maker-cli/src/tui/app-container-keymap.ts`
- `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` (current gating: `helpOpen`, `isPopupOpen`, etc.)
- `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts` (to expose “popup open” truth cleanly)

Approach:

- Document and enforce one rule: help overlay suppresses everything; popups suppress screen input.
- Prefer explicit `isActive` flags on `useInput` calls instead of ad-hoc early returns.

Key risks:

- Subtle timing bugs around the existing `suppressNextInput` pattern.
- Accidentally allowing a key to “fall through” to screen while popup is open.

Validation:

- `npx jest --runInBand`
- Manual:
  - open a popup and press arrow keys; ensure only popup selection changes
  - open help overlay (`?`); ensure other keys are ignored except close

### Prompt 3 — `usePopupManager` reducer with explicit transitions

Primary targets:

- `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`
- Popups under `apps/prompt-maker-cli/src/tui/components/popups/*` (only if API shape needs adjustment)

Approach:

- Introduce a pure reducer that encodes popup transitions explicitly.
- Keep the external hook API stable so `CommandScreen.tsx` doesn’t churn.
- Add cancellation/guarding for async scans so old requests can’t overwrite new popup state.

Key risks:

- Regression in “where focus goes” after close or after actions.
- Async scans writing into the wrong popup state.

Validation:

- `npx jest --runInBand`
- Manual: open/close popups repeatedly; switch between popups; confirm cursor/selection behavior unchanged.

### Prompt 4 — `useGenerationPipeline` stabilization (effects isolation + rerender reduction)

Primary targets:

- `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`

Approach:

- Separate three layers:
  - state transitions (possibly reducer)
  - side effects/timers/subscriptions (effects)
  - derived display state (memoized)
- Keep history output identical, but reduce the number of React state updates where possible (e.g., batch writes or buffer internally).

Key risks:

- Breaking the interactive refinement handshake (`InteractiveDelegate`) or leaving dangling promises.
- Cleanup bugs: spinner timer, pending refinement resolution on unmount.

Validation:

- `npx jest --runInBand`
- Manual: run generation; verify streaming history, refinement prompts, and cancellation/exit behavior.

### Prompt 5 — Break up `CommandScreen` into cohesive subcomponents + screen reducer

Primary targets:

- `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`

Likely supporting files:

- `apps/prompt-maker-cli/src/tui/components/core/*`
- `apps/prompt-maker-cli/src/tui/components/popups/*`

Approach:

- Move state transitions into `useCommandScreen` (reducer + action creators).
- Extract presentational components that take already-derived props.
- Reduce render-time work:
  - memoize filtered lists with minimal deps
  - avoid inline object/array creation passed to children
  - move IO-ish checks (like `fs.statSync` used for drag/drop detection) behind explicit memoization and only when necessary

Key risks:

- Accidental behavior drift because so many features are intertwined (paste tokens, command mode parsing, history scrolling).
- Breaking the implicit ordering assumptions between effects (provider status/model load/history wiring).

Validation:

- `npx jest --runInBand`
- Manual: type, navigate history, open/close each popup, bracketed paste, run `/series`, run `/test`, switch views.

### Prompt 6 — Apply similar structure to `TestRunnerScreen` and core components

Primary targets:

- `apps/prompt-maker-cli/src/tui/TestRunnerScreen.tsx`
- `apps/prompt-maker-cli/src/tui/components/core/*`

Approach:

- Optionally extract reducer/hook for test runner focus/status updates.
- Audit core components for unstable props and render-time heavy work.
  - Example: `apps/prompt-maker-cli/src/tui/components/core/MultilineTextInput.tsx` does token expansion + cursor mapping; keep memoization tight and inputs stable.

Key risks:

- Changing keyboard focus behavior (tab order) or test progress rendering.

Validation:

- `npx jest --runInBand`
- Manual: run tests, verify status updates/logs and focus changes.

### Prompt 7 — Performance audit + developer note

Primary targets:

- Likely many under `apps/prompt-maker-cli/src/tui/**`
- Developer note output (per atomic prompt series): `apps/prompt-maker-cli/src/tui/DEVELOPER_NOTE.md`

Approach:

- Identify remaining rerender sources:
  - unstable callbacks
  - derived arrays/objects built every render
  - heavy computations in render paths
- Remove “cargo cult” memoization that makes code harder to understand.
- Document:
  - directory structure and responsibilities
  - input routing invariants
  - reducer conventions and testing strategy

Key risks:

- Over-optimizing and accidentally changing visible timing/order of history messages.

Validation:

- `npx jest --runInBand`
- Optional: `npx nx lint prompt-maker-cli`
- Manual: stress typing, large history, open/close popups quickly.

---

## Practical Validation Checklist (Quick Manual Smoke)

These are the behaviors most likely to regress during refactor:

- Global keys always work: `Ctrl+C` exit, `?` help overlay.
- Command palette: filtering + arrow navigation, Enter to select.
- Popups suppress underlying screen input.
- Bracketed paste: pasted snippet tokens behave the same (no extra characters, no cursor weirdness).
- Generation flow:
  - history updates during generation
  - interactive refinement prompt, submit/finish
  - provider status errors abort generation consistently
- Test runner flow:
  - file input, tab focus behavior, running state locks input, logs update.
