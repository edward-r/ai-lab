# Prompt Maker CLI TUI Improvements — Atomic Prompt Series

## Prolog (How to Use This Document)

- Copy/paste **one prompt at a time** (in order) into the assistant.
- Each prompt is **atomic** (one specific outcome) and **self-contained**.
- Each prompt instructs the assistant to:
  1. reproduce + identify root cause,
  2. propose an implementation plan,
  3. wait for your approval,
  4. implement the approved plan,
  5. add/adjust tests where feasible,
  6. provide a short manual validation checklist,
  7. stop and wait for the next task.

### Global Constraints (apply to every prompt)

- Scope: `apps/prompt-maker-cli` TUI (Ink) unless explicitly needed elsewhere.
- Preserve existing command semantics (`/model`, `/file`, `/url`, `/smart`, `/series`, `/test`, `/json`, `/new`, `/exit`, etc.).
- Exit behavior: `Ctrl+C` and `/exit` should exit; `Esc` should never exit.
- Primary terminal for manual validation: Kitty on macOS.
- Avoid new dependencies unless clearly justified.
- TypeScript strict; **do not use `any`**.
- Keep changes minimal and phase-focused; don’t fix unrelated issues.

### Helpful Commands (reference)

- Build CLI: `npx nx build prompt-maker-cli`
- Run CLI: `npx nx serve prompt-maker-cli -- --help`
- Jest tests: `npx jest --runInBand`
- Run one test: `npx jest apps/prompt-maker-cli/src/__tests__/app-container-keymap.test.ts --runInBand`
- Lint: `npx nx lint prompt-maker-cli`
- Format: `npx prettier -w apps/prompt-maker-cli/src`

## Context (System + Code Map)

Primary areas (verify with repo search as needed):

- Global key handling / view switching:
  - `apps/prompt-maker-cli/src/tui/AppContainer.tsx`
  - `apps/prompt-maker-cli/src/tui/app-container-keymap.ts`
- Generate view orchestration:
  - `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`
- Input + paste handling:
  - `apps/prompt-maker-cli/src/tui/components/core/InputBar.tsx`
  - `apps/prompt-maker-cli/src/tui/components/core/MultilineTextInput.tsx`
  - `apps/prompt-maker-cli/src/tui/components/core/multiline-text-buffer.ts`
  - `apps/prompt-maker-cli/src/tui/paste-snippet.ts`
- Popups + popup state:
  - `apps/prompt-maker-cli/src/tui/components/popups/*`
  - `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`
- Help overlay:
  - `apps/prompt-maker-cli/src/tui/components/core/HelpOverlay.tsx`
  - `apps/prompt-maker-cli/src/tui/help-config.ts`
- File suggestions:
  - `apps/prompt-maker-cli/src/tui/file-suggestions.ts`
- Provider status + model options:
  - `apps/prompt-maker-cli/src/tui/provider-status.ts`
  - `apps/prompt-maker-cli/src/tui/model-options.ts`
  - `apps/prompt-maker-cli/src/tui/components/popups/ModelPopup.tsx`
- Test runner view:
  - `apps/prompt-maker-cli/src/tui/TestRunnerScreen.tsx`

Screenshots are used to confirm expected behavior.

UAT assets on this machine (canonical directory):

- `/Users/eroberts/Downloads/TUI UAT Images/`

Theming reference (Phase 12 inspiration only):

- `/Users/eroberts/Downloads/TUI UAT Images/OpenCode Themes Implementation Notes.md`

## Series Overview (Phases 0–12)

- Phase 0: Input + key handling primitives
- Phase 1: Modal/popup navigation + scrolling
- Phase 2: Command palette search behavior
- Phase 3: File context popup
- Phase 4: Smart context popup
- Phase 5: Intent sources + meta instructions
- Phase 6: Pasted snippet flow
- Phase 7: Session reset and reuse
- Phase 8: Model popup + provider status
- Phase 9: Generation UX messaging
- Phase 10: Test running UX
- Phase 11: Interactive transport mode
- Phase 12: Main screen visual polish

---

## Atomic Prompts

### Prompt 00 — Confirm Requirements + Locate UAT Assets

```md
# Task: Confirm TUI UAT execution requirements and locate screenshots

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Confirm the agreed requirements and locate the screenshot assets so later phases can reference exact file paths.

## Context

We are improving the Ink-based TUI at `apps/prompt-maker-cli`.

UAT assets are available at the following paths:

- `/Users/eroberts/Downloads/TUI UAT Images/OpenCode Themes Implementation Notes.md`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-main-screen-1.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-misc-cannot-backspace-intent.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-misc-cannot-backspace.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-misc-json-disabled-invisible.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-misc-refinement-prompt.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-misc-status-spinner.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-misc-why-error.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S01-03-help-closed.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S02-03-command-cancel.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S03-04-file-auto-add-b.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S03-04-file-auto-add.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S03-05-file-removed.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-01-smart-popup-open.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-02-smart-toggled.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-03-smart-root-set-b.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-03-smart-root-set-c.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-03-smart-root-set-d.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-03-smart-root-set.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-05-smart-progress.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-01-paste-card-visible.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-02-paste-cancelled.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-03-paste-submitted-b.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-03-paste-submitted-c.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-03-paste-submitted-d.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-03-paste-submitted.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S08-05-new-flag-reuse.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S15-03-model-need-fuzzy.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S15-03-model-no-models-shown.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S15-03-model-selected.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S17-02-test-run-progress.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S18-03-test-runner-results.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S19-03-transport-events.png`

## Constraints

- Do not change any code.
- Only gather info and propose assumptions.

## Work

1. Record the agreed requirements (no guessing):
   - Exit behavior: `Ctrl+C` and `/exit` exit.
   - `Esc` never exits; it only dismisses UI layers.
   - Primary terminal for manual validation: Kitty on macOS.
   - Phase 15 notifier: auto-dismiss toast.
   - Phase 33 theming: configurable theme system inspired by OpenCode.
2. Confirm the UAT asset directory and list the screenshot paths found there.
3. Search the repo for any existing UAT markdown/checklist references and list what you find.

## Output

- Provide: (a) confirmed requirements summary, (b) paths to screenshot directory/files, (c) any repo docs found.
- Stop and wait.

## Validation

- I can open at least 2 referenced screenshots by path.
- Assumptions list is explicit and short.
```

---

### Phase 0 — Input + key handling primitives

#### Prompt 01 — Phase 0.1 Global `Esc` Handling (Close UI First; Never Exit)

```md
# Task: Phase 0.1 — Global Esc handling closes UI, never exits

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Ensure `Esc` closes the topmost active UI layer (help/popup/snippet/etc.) and never exits the app. Exiting should happen via `Ctrl+C` and `/exit` only.

## Context

Key handling likely involves:

- `apps/prompt-maker-cli/src/tui/AppContainer.tsx`
- `apps/prompt-maker-cli/src/tui/app-container-keymap.ts`
- `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`

Screenshots to reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S01-03-help-closed.png` (and other “Esc closes overlay” examples)

## Constraints

- Preserve command semantics.
- Do not introduce new deps.

## Work

1. Reproduce current Esc behavior and map current decision flow.
2. Identify root cause of accidental exits (e.g. Ink default exit handling, keymap action mapping, or unhandled fallthrough).
3. Propose a minimal architecture for Esc routing priority:
   1. help overlay open → close
   2. popup open → close topmost
   3. snippet mode open → cancel
   4. otherwise → no-op (do not exit)
4. Add/adjust tests (likely around `resolveAppContainerKeyAction` and/or AppContainer key routing).

## Output

- First: present a short implementation plan (files + tests).
- Wait for approval before editing.
- After approval: implement, run targeted tests, and provide manual validation steps.

## Validation

- With help open, Esc closes help and app stays running.
- With a popup open, Esc closes popup and app stays running.
- With no overlays open, Esc does nothing and app stays running.
- No automated tests regress.
```

#### Prompt 02 — Phase 0.2 Backspace Works Everywhere

```md
# Task: Phase 0.2 — Backspace works in all text-entry surfaces

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Ensure Backspace reliably deletes characters in every text input surface:

- main input
- popup TextInput inputs
- multiline buffers
- pasted snippet editing flows

## Context

Likely relevant files:

- `apps/prompt-maker-cli/src/tui/components/core/InputBar.tsx`
- `apps/prompt-maker-cli/src/tui/components/core/MultilineTextInput.tsx`
- `apps/prompt-maker-cli/src/tui/components/core/multiline-text-buffer.ts`
- popup components under `apps/prompt-maker-cli/src/tui/components/popups/*`

Screenshot references:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-misc-cannot-backspace.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-misc-cannot-backspace-intent.png`

## Constraints

- Do not break non-TUI CLI behavior.
- Keep key handling consistent with Phase 0.1 routing.

## Work

1. Reproduce where backspace fails (identify which component(s)).
2. Identify root cause (e.g. key naming mismatch `backspace` vs `delete`, handler not attached, focus gating).
3. Implement fix at the lowest correct layer (prefer shared input primitives).
4. Add tests for buffer operations and at least one integration-ish key routing test if feasible.

## Output

- Present plan, wait for approval, then implement.

## Validation

- Backspace deletes in main input.
- Backspace deletes in at least one popup input.
- Backspace edits pasted snippet text.
- Jest targeted tests pass.
```

#### Prompt 03 — Phase 0.3 Strip Bracketed Paste Artifacts (`[200~` / `[201~`)

```md
# Task: Phase 0.3 — Fix bracketed paste artifacts

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Ensure pasted text never includes bracketed paste control sequences (e.g. `[200~`, `[201~`) in any submitted text or intermediate buffers.

## Context

Likely relevant:

- `apps/prompt-maker-cli/src/tui/paste-snippet.ts`
- `apps/prompt-maker-cli/src/tui/components/core/multiline-text-buffer.ts`
- any “paste detection” logic in input components

Screenshots to reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-03-paste-submitted.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-03-paste-submitted-b.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-03-paste-submitted-c.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-03-paste-submitted-d.png`

## Constraints

- Keep behavior consistent across terminals.

## Work

1. Reproduce paste behavior in at least one supported terminal.
2. Locate where bracketed sequences enter the system.
3. Implement stripping at the lowest common layer so all flows benefit.
4. Add unit tests for bracketed paste parsing/stripping.

## Output

- Plan → approval → implementation.

## Validation

- Pasting multiline text never yields `[200~`/`[201~` in buffers or submissions.
- Tests cover parsing and pass.
```

#### Prompt 04 — Phase 0.4 Command Keys Don’t Type Into Inputs

```md
# Task: Phase 0.4 — Command keybindings do not type into inputs

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Keys used as global commands (e.g. `?` for help, `t` for smart toggle, etc.) must be “consumed” and must not be inserted into any focused text input.

## Context

Likely relevant:

- `apps/prompt-maker-cli/src/tui/AppContainer.tsx`
- `apps/prompt-maker-cli/src/tui/app-container-keymap.ts`
- input primitives and focus flags

Screenshot references:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-02-smart-toggled.png` (stray characters typed example)

## Constraints

- Preserve ability to type literal characters when appropriate (e.g. `t` should type if the input expects normal typing and no global toggle should fire in that context).

## Work

1. Identify existing keybinding set and how it interacts with focused inputs.
2. Define a clear rule: when a text field is focused, only a limited set of keys should be treated as global (Esc, maybe Ctrl+something), while plain characters should go to the input.
3. Implement key consumption so command keys don’t leak into text buffers.
4. Add tests for key routing in focused vs unfocused contexts.

## Output

- Plan → approval → implementation.

## Validation

- Pressing `?` opens help and does not insert `?`.
- Toggling smart context does not insert `t` anywhere.
- Normal typing still works in text inputs.
```

---

### Phase 1 — Modal/popup navigation + scrolling

#### Prompt 05 — Phase 1.5 Help Overlay Scroll Keys Work

```md
# Task: Phase 1.5 — Help overlay scroll keys actually scroll

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Make help overlay scrollable using PgUp/PgDn/↑/↓ (and any existing intended bindings). Ensure the scroll position updates and is visible.

## Context

Likely relevant:

- `apps/prompt-maker-cli/src/tui/components/core/HelpOverlay.tsx`
- `apps/prompt-maker-cli/src/tui/help-config.ts`
- any shared scroll/list components

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S01-03-help-closed.png` (overlay existence; scroll screenshots if provided)

## Constraints

- Esc closes help (from Phase 0.1) and does not exit.

## Work

1. Reproduce current non-scrolling behavior.
2. Fix input handling and state updates for scroll.
3. Add tests if feasible (pure logic tests for scroll state; or component tests if present in repo).

## Output

- Plan → approval → implementation.

## Validation

- Open help, press ↓ several times: content scrolls.
- PgDn/PgUp changes scroll more quickly.
- Esc closes help without exiting.
```

#### Prompt 06 — Phase 1.6 Command Palette Navigation + Cancel

```md
# Task: Phase 1.6 — Command palette selection navigation + cancel behavior

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Fix command palette navigation (selection moves predictably) and ensure Esc cancels/closes the palette without exiting the app.

## Context

Likely relevant:

- palette popup component(s) under `apps/prompt-maker-cli/src/tui/components/popups/*`
- `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`
- global key routing in `AppContainer.tsx`

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S02-03-command-cancel.png`

## Constraints

- Follow Phase 0.1 Esc routing.

## Work

1. Reproduce selection and cancel issues.
2. Identify root cause (focus, list index, scroll window, or key routing).
3. Implement fix with minimal behavior changes.
4. Add tests for key navigation logic.

## Output

- Plan → approval → implementation.

## Validation

- Open palette, navigate with arrow keys, selection updates.
- Esc closes palette and app remains running.
```

---

### Phase 2 — Command palette search behavior consistency

#### Prompt 07 — Phase 2.7 Unify Filtering Between `Ctrl+G` and `/`

```md
# Task: Phase 2.7 — Unify filtering/search semantics between Ctrl+G and /

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Ensure the command palette opened via `Ctrl+G` and via `/` uses the same filtering logic and yields consistent results.

## Context

Likely relevant:

- `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`
- palette components under `apps/prompt-maker-cli/src/tui/components/popups/*`
- any shared search/filter helper

## Constraints

- Preserve command semantics.
- Avoid new deps.

## Work

1. Identify current code paths for Ctrl+G vs `/`.
2. Determine why filtering differs (different matchers, different data sets, different normalization).
3. Consolidate to one shared matcher/normalization function.
4. Add unit tests for filtering logic across both entry points.

## Output

- Plan → approval → implementation.

## Validation

- Same query string yields the same visible matches in both modes.
- Tests cover representative queries.
```

---

### Phase 3 — File context popup

#### Prompt 08 — Phase 3.8 Absolute Path Auto-Add Works With Clean Paste

```md
# Task: Phase 3.8 — Absolute-path auto-add works with clean paste

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

When an absolute path is pasted into the file context flow, it is auto-detected and added correctly, without bracketed paste artifacts.

## Context

Likely relevant:

- `apps/prompt-maker-cli/src/tui/file-suggestions.ts`
- file popup component(s)
- paste handling from Phase 0.3

Screenshots:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S03-04-file-auto-add.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S03-04-file-auto-add-b.png`

## Constraints

- Don’t break existing file suggestion behavior.

## Work

1. Reproduce failure using the screenshot scenario.
2. Ensure paste stripping is applied before path detection.
3. Fix detection/auto-add logic.
4. Add tests for path normalization and auto-add trigger.

## Output

- Plan → approval → implementation.

## Validation

- Pasting `/abs/path/file.ts` auto-adds it.
- No `[200~` artifacts.
- Tests pass.
```

#### Prompt 09 — Phase 3.9 Selected File List Scrolls Across All Entries

```md
# Task: Phase 3.9 — File list supports scrolling + selection across all entries

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

In the file context popup, the selected-file list supports scrolling and selection for all entries (not just the visible window).

## Context

Likely relevant:

- file popup component(s) under `apps/prompt-maker-cli/src/tui/components/popups/*`
- any list/scroll helpers used by other popups

## Constraints

- Maintain consistent keybinds with other list-based popups.

## Work

1. Reproduce with enough selected files to overflow.
2. Implement proper selection index + scroll window mapping.
3. Add tests for list windowing logic (pure helper tests preferred).

## Output

- Plan → approval → implementation.

## Validation

- Add many files; navigate down beyond visible region.
- Selection follows and list scrolls.
```

#### Prompt 10 — Phase 3.10 Delete Removes the Selected Entry

```md
# Task: Phase 3.10 — Delete removes the selected entry (not just top)

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

In the selected-file list, delete/remove should remove the currently selected entry, not always the first/top.

## Context

Likely relevant:

- file popup component
- selection state logic

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S03-05-file-removed.png`

## Constraints

- Keep selection stable after deletion (reasonable UX: select previous item if last removed).

## Work

1. Reproduce current wrong deletion behavior.
2. Fix delete handler to use selected index/id.
3. Add unit tests for deletion semantics.

## Output

- Plan → approval → implementation.

## Validation

- Select a middle item; delete; that item disappears.
- Selection updates sensibly.
```

---

### Phase 4 — Smart context popup

#### Prompt 11 — Phase 4.11 Smart Popup Open Is Stable

```md
# Task: Phase 4.11 — Smart popup open is stable (prefill root, focus, no stray chars)

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Opening the smart context popup should be stable and predictable: root prefilled as expected, focus set correctly, and no stray characters inserted.

## Context

Likely relevant:

- smart popup component under `apps/prompt-maker-cli/src/tui/components/popups/*`
- `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`
- global key consumption from Phase 0.4

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-01-smart-popup-open.png`

## Constraints

- Avoid introducing conflicting keybindings.

## Work

1. Reproduce unstable open behavior.
2. Identify focus and initialization order problems.
3. Ensure open action sets initial state exactly once.
4. Add tests for initialization/idempotency if feasible.

## Output

- Plan → approval → implementation.

## Validation

- Open smart popup repeatedly; same prefill, correct focus.
- No stray characters appear.
```

#### Prompt 12 — Phase 4.12 Toggle Smart Context Without Writing `t`

```md
# Task: Phase 4.12 — Toggle smart context without writing 't' into inputs

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Toggling smart context should never insert the literal `t` character into any input field.

## Context

Likely relevant:

- global key handling
- smart popup

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-02-smart-toggled.png`

## Constraints

- If `t` must still be typeable in some contexts, ensure toggling only happens in the intended global context.

## Work

1. Reproduce `t` leakage.
2. Implement key consumption/routing fix.
3. Add tests for focused input vs global toggle.

## Output

- Plan → approval → implementation.

## Validation

- Press toggle key; smart toggles; input remains unchanged.
```

#### Prompt 13 — Phase 4.13 Root Override Submit Is Idempotent

```md
# Task: Phase 4.13 — Root override submit is idempotent (no stacking)

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Submitting the smart root override should be idempotent: repeated Enter should not stack repeated overrides/history notices.

## Context

Likely relevant:

- smart popup component
- state store for smart context root override

Screenshot references:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-03-smart-root-set.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-03-smart-root-set-b.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-03-smart-root-set-c.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-03-smart-root-set-d.png`

## Constraints

- Preserve existing history semantics where possible.

## Work

1. Reproduce stacking behavior.
2. Fix to only apply change when value changes.
3. Add tests around reducer/state transitions.

## Output

- Plan → approval → implementation.

## Validation

- Enter repeatedly on same root does not create repeated history entries.
```

#### Prompt 14 — Phase 4.14 Toggle Key Should Not Conflict With Typing Root Text

```md
# Task: Phase 4.14 — Toggle key does not conflict with typing root text

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

When typing into the smart root text input, the toggle key should not fire global actions or disrupt typing.

## Context

Likely relevant:

- input focus gating
- global keybinding routing

## Constraints

- Must work with Phase 0.4 command-key consumption rules.

## Work

1. Reproduce conflict while typing.
2. Adjust key routing based on focus + active popup.
3. Add tests for focus-conditional key behavior.

## Output

- Plan → approval → implementation.

## Validation

- In smart popup root field, type the toggle character; it appears as text, no toggle fires.
```

#### Prompt 15 — Phase 4.15 Replace Stacked History Notices With Temporary Toast/Notifier

```md
# Task: Phase 4.15 — Replace stacked notices with a temporary toast/notifier

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Replace stacked history notices for smart context changes with a clearer, temporary notifier: an auto-dismiss toast (per Prompt 00).

## Context

Likely relevant:

- smart context UI components
- any existing status line / footer area

## Constraints

- No new deps.
- Keep rendering performant and avoid excessive re-renders.

## Work

1. Identify where notices are currently produced.
2. Implement a notifier mechanism (time-based auto-dismiss OR status area update).
3. Add tests for notifier reducer/state and dismissal behavior.

## Output

- Plan → approval → implementation.

## Validation

- Trigger smart changes repeatedly; notices do not stack.
- Notifier clears itself or updates in place.
```

#### Prompt 16 — Phase 4.16 Smart-Context Progress Visible During Generation

```md
# Task: Phase 4.16 — Smart-context progress stays visible during generation

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

During generation, smart-context progress/status remains visible (not hidden behind other UI states).

## Context

Likely relevant:

- `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`
- smart context UI status components

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S05-05-smart-progress.png`

## Constraints

- Keep UI layout stable.

## Work

1. Reproduce progress disappearing.
2. Ensure generation view renders smart progress in a consistent location.
3. Add tests if feasible (state-level tests).

## Output

- Plan → approval → implementation.

## Validation

- Start generation with smart enabled; progress indicator remains visible.
```

---

### Phase 5 — Intent sources + meta instructions

#### Prompt 17 — Phase 5.18 Intent File Input Fuzzy Search + Editing

```md
# Task: Phase 5.18 — Intent file input supports fuzzy search and editing

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Improve intent file input UX:

- add fuzzy search for intent files
- ensure editing works reliably (including backspace)

## Context

Likely relevant:

- intent source selection UI in `apps/prompt-maker-cli/src/tui/*`
- any existing fuzzy matcher used elsewhere

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-misc-cannot-backspace-intent.png`

## Constraints

- Avoid new deps; reuse existing matchers if present.

## Work

1. Find current intent input component and behavior.
2. Implement fuzzy search (consistent with Phase 2 matcher semantics if possible).
3. Ensure backspace/editing works (build on Phase 0.2).
4. Add tests for matching + editing.

## Output

- Plan → approval → implementation.

## Validation

- Type partial intent name; list filters fuzzily.
- Backspace edits correctly.
```

---

### Phase 6 — Pasted snippet flow

#### Prompt 18 — Phase 6.19 Pasted Snippet Mode Reliably Triggers and Displays

```md
# Task: Phase 6.19 — Pasted snippet mode reliably triggers and displays

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Ensure pasted snippet mode triggers reliably for large/multiline pastes and shows the expected UI.

## Context

Likely relevant:

- `apps/prompt-maker-cli/src/tui/paste-snippet.ts`
- input components that detect paste thresholds

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-01-paste-card-visible.png`

## Constraints

- Keep paste behavior consistent across terminals.

## Work

1. Reproduce non-triggering cases.
2. Tune thresholds/heuristics with minimal behavior change.
3. Add tests for snippet triggering logic.

## Output

- Plan → approval → implementation.

## Validation

- Paste large text: snippet UI appears consistently.
```

#### Prompt 19 — Phase 6.20 Cancel Snippet With Esc Without Exiting

```md
# Task: Phase 6.20 — Esc cancels snippet mode and never exits app

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

When in pasted snippet mode, pressing Esc cancels snippet mode and returns to prior UI without exiting.

## Context

- Builds on Phase 0.1 Esc routing.

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-02-paste-cancelled.png`

## Constraints

- Esc priority: snippet cancel should happen before any other Esc behavior.

## Work

1. Reproduce Esc behavior in snippet mode.
2. Fix routing so snippet cancellation is handled.
3. Add tests for Esc behavior.

## Output

- Plan → approval → implementation.

## Validation

- Enter snippet mode; Esc exits snippet mode only.
```

#### Prompt 20 — Phase 6.21 Submit Snippet With Enter (Correct Text + Line Count)

```md
# Task: Phase 6.21 — Enter submits snippet correctly (clean text, correct line count)

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Submitting a snippet with Enter must:

- use the correct edited text
- include correct line count
- never include `[200~` prefix
- allow editing before submit

## Context

Likely relevant:

- `apps/prompt-maker-cli/src/tui/paste-snippet.ts`
- multiline buffer

Screenshot references:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-03-paste-submitted.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-03-paste-submitted-b.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-03-paste-submitted-c.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S07-03-paste-submitted-d.png`

## Constraints

- Preserve existing snippet UX unless clearly broken.

## Work

1. Reproduce incorrect submission.
2. Fix parsing/normalization and submission path.
3. Add unit tests for snippet payload + line count.

## Output

- Plan → approval → implementation.

## Validation

- Paste, edit, submit: resulting text matches edited snippet and line count is correct.
```

---

### Phase 7 — Session reset and reuse semantics

#### Prompt 21 — Phase 7.22 Replace `/new --reuse` with `/reuse`

```md
# Task: Phase 7.22 — Replace /new --reuse with /reuse

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Reduce confusion by simplifying session commands:

- `/new` always resets session state
- `/reuse` resets session state and loads the last generated prompt into meta instructions

## Context

Likely relevant:

- command parsing/handling for `/new` and `/reuse`
- any session state store used by the TUI

## Constraints

- Preserve `/new` reset semantics.

## Work

1. Remove the `--reuse` flag from `/new`.
2. Add a new `/reuse` command implementing the old reuse behavior.
3. Update UX copy so the user can tell what happened.
4. Add/adjust tests.

## Output

- Plan → approval → implementation.

## Validation

- Run `/new` and confirm it only resets.
- Run `/reuse` and confirm it loads meta instructions.
```

---

### Phase 8 — Model popup + provider status chips

#### Prompt 22 — Phase 8.23 Model List Shows By Default

```md
# Task: Phase 8.23 — Model list shows by default

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

In the model popup, show the model list by default (without requiring an initial search query). Fuzzy search can remain optional.

## Context

Likely relevant:

- `apps/prompt-maker-cli/src/tui/components/popups/ModelPopup.tsx`
- `apps/prompt-maker-cli/src/tui/model-options.ts`

Screenshot references:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S15-03-model-no-models-shown.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S15-03-model-need-fuzzy.png`

## Constraints

- Avoid performance regressions if model list is long.

## Work

1. Reproduce current blank/empty default state.
2. Implement default list rendering.
3. Add tests for default rendering logic.

## Output

- Plan → approval → implementation.

## Validation

- Open model popup: models are visible immediately.
```

#### Prompt 23 — Phase 8.24 Model Selection Updates State + Chip Reliably

```md
# Task: Phase 8.24 — Model selection updates state and provider chip reliably

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Selecting a model updates the underlying state and the provider status chip reliably reflects the selected model/provider.

## Context

Likely relevant:

- `apps/prompt-maker-cli/src/tui/provider-status.ts`
- `apps/prompt-maker-cli/src/tui/components/popups/ModelPopup.tsx`
- any app state container for selected model

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S15-03-model-selected.png`

## Constraints

- Preserve existing provider/model resolution rules.

## Work

1. Reproduce selection mismatch.
2. Fix data flow (single source of truth).
3. Add unit tests for selection → state → chip rendering mapping.

## Output

- Plan → approval → implementation.

## Validation

- Select a model; chip updates immediately and remains correct.
```

---

### Phase 9 — Generation UX messaging and visibility

#### Prompt 24 — Phase 9.26 Make Refinement Prompt More Prominent

```md
# Task: Phase 9.26 — Make refinement prompt more prominent

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

During generation/refinement, make the refinement prompt visually prominent so users understand what input is expected.

## Context

Likely relevant:

- `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`
- any refinement UI component

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-misc-refinement-prompt.png`

## Constraints

- Phase 12 will handle deeper theming; keep this change minimal.

## Work

1. Identify refinement prompt rendering.
2. Improve emphasis (layout, labels, minimal styling).
3. Add a snapshot/logic test if the project uses those patterns.

## Output

- Plan → approval → implementation.

## Validation

- Enter refinement state: prompt stands out clearly.
```

#### Prompt 25 — Phase 9.27 Make Important Indicators Stand Out (e.g. `JSON disabled`)

```md
# Task: Phase 9.27 — Make key indicators stand out (JSON disabled)

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Important status indicators like `JSON disabled` are more noticeable and harder to miss.

## Context

Likely relevant:

- UI components in `apps/prompt-maker-cli/src/tui/*`

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-misc-json-disabled-invisible.png`

## Constraints

- Don’t implement full theme system here.

## Work

1. Identify indicator render location.
2. Adjust styling/placement to increase salience.
3. Add tests for indicator presence in relevant states.

## Output

- Plan → approval → implementation.

## Validation

- When JSON disabled, indicator is obvious at a glance.
```

#### Prompt 26 — Phase 9.28 Clarify “Why Do I See This Error?” Message

```md
# Task: Phase 9.28 — Clarify history JSON parse error message

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Improve the UX copy explaining the history JSON parse error (“why do I see this error?”) to be clear and actionable.

## Context

Likely relevant:

- where history is parsed and errors are displayed in the TUI

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-misc-why-error.png`

## Constraints

- Keep copy concise; do not change parsing behavior unless needed.

## Work

1. Locate error message.
2. Update wording and include likely remediation.
3. Add test to lock the new message or behavior.

## Output

- Plan → approval → implementation.

## Validation

- Trigger error: message clearly explains cause and remedy.
```

---

### Phase 10 — Test running UX

#### Prompt 27 — Phase 10.29 Generate-View `/test` Shows Obvious Progress

```md
# Task: Phase 10.29 — /test run shows obvious progress in generate view

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

When `/test` is run from the generate view, the UI shows clear progress (spinner/status) until completion.

## Context

Likely relevant:

- `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`
- test execution wiring

Screenshot references:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-misc-status-spinner.png`
- `/Users/eroberts/Downloads/TUI UAT Images/uat-S17-02-test-run-progress.png`

## Constraints

- Keep progress rendering performant.

## Work

1. Reproduce “no progress” behavior.
2. Add a progress indicator connected to test-running state.
3. Add tests for state transitions.

## Output

- Plan → approval → implementation.

## Validation

- Run `/test`: progress indicator visible until results.
```

#### Prompt 28 — Phase 10.30 Test Runner View Redesign (No Main Input Above)

```md
# Task: Phase 10.30 — Redesign Test Runner view for clearer progress/results

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Improve `TestRunnerScreen` to show clearer progress/results and avoid showing the main input above it.

## Context

Likely relevant:

- `apps/prompt-maker-cli/src/tui/TestRunnerScreen.tsx`
- `apps/prompt-maker-cli/src/tui/AppContainer.tsx` (view layout)

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S18-03-test-runner-results.png`

## Constraints

- Keep navigation consistent with other views.

## Work

1. Review current layout and identify why main input appears.
2. Update layout so Test Runner is the primary/only interactive surface.
3. Add tests around view switching/layout if feasible.

## Output

- Plan → approval → implementation.

## Validation

- Enter Test Runner: main input is not visible above it.
- Progress/results are readable and obvious.
```

---

### Phase 11 — Interactive transport mode

#### Prompt 29 — Phase 11.31 Avoid “Silent Halt” Waiting for Transport Input

```md
# Task: Phase 11.31 — Show clear waiting state for interactive transport

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

When interactive transport mode is waiting for input, avoid a “silent halt” by showing a clear waiting/blocked state.

## Context

Likely relevant:

- transport mode handling in `apps/prompt-maker-cli/src/tui/*`

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-S19-03-transport-events.png`

## Constraints

- Don’t alter transport protocol, only UX.

## Work

1. Identify where the app waits.
2. Render a waiting indicator with a short explanation.
3. Add tests for the waiting state display if possible.

## Output

- Plan → approval → implementation.

## Validation

- When waiting, UI clearly explains what it’s waiting for.
```

---

### Phase 12 — Main screen visual polish

#### Prompt 30 — Phase 12.33 Increase Contrast / Apply Theming Inspiration

```md
# Task: Phase 12.33 — Increase overall contrast / apply theming inspiration

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Improve overall contrast of the main screen using the OpenCode theming notes as inspiration. Implement a configurable theme system (per Prompt 00), similar in spirit to OpenCode’s approach.

## Context

Theming reference:

- `/Users/eroberts/Downloads/TUI UAT Images/OpenCode Themes Implementation Notes.md`

Screenshot reference:

- `/Users/eroberts/Downloads/TUI UAT Images/uat-main-screen-1.png`

Likely relevant:

- Ink UI components in `apps/prompt-maker-cli/src/tui/*`

## Constraints

- Keep it incremental; do not do large refactors unless required.
- Avoid copying external implementations blindly.

## Work

1. Identify current color/style tokens and the components that define them.
2. Implement the chosen approach.
3. Add tests where feasible (token mapping/pure functions).

## Output

- Plan → approval → implementation.

## Validation

- Main UI is visibly higher contrast in screenshots/terminal.
- No regressions in key UI states.
```

#### Prompt 31 — Phase 12.34 Re-organize Header to Use Less Space

```md
# Task: Phase 12.34 — Re-organize header to use less space

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Reduce header vertical space without losing key information.

## Context

Likely relevant:

- main screen layout components in `apps/prompt-maker-cli/src/tui/*`

## Constraints

- Preserve important status indicators.

## Work

1. Identify header components.
2. Re-layout to compress vertical space.
3. Add tests if feasible.

## Output

- Plan → approval → implementation.

## Validation

- Header is shorter; main content has more room.
```

#### Prompt 32 — Phase 12.35 Responsive, Less Busy Param/Value Indicators

```md
# Task: Phase 12.35 — Make param/value indicators responsive and less busy

## Requirements Snapshot

- Exit: `Ctrl+C` and `/exit` exit
- `Esc` never exits; only dismisses UI
- Primary terminal: Kitty (macOS)
- Phase 15 notifier: auto-dismiss toast
- Phase 33 theming: configurable theme system (OpenCode-inspired)

## Goal

Improve readability of parameter/value indicators: responsive layout and less visual noise.

## Context

Likely relevant:

- provider/model/status indicator components

## Constraints

- Keep semantics; only adjust presentation.

## Work

1. Identify indicator components.
2. Adjust spacing/labels/formatting.
3. Add tests for presence and basic rendering.

## Output

- Plan → approval → implementation.

## Validation

- Indicators read clearly in narrow and wide terminal widths.
```

---

## Notes / Gaps from Source Plan

- The source plan includes Phase 4 items 11–16 but skips item 17, and Phase 5 starts at item 18. This document preserves your numbering.
- If you provide additional backlog items (or the missing #17), I can append corresponding atomic prompts.
