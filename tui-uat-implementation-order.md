# TUI UAT — Implementation Order (dependency-safe)

This document re-orders the tasks from `/Users/eroberts/Downloads/TUI UAT.md` into a practical implementation sequence so each change builds on earlier foundations and avoids regressions.

Notes:

- This is **not** addressing/fixing the items; it’s just an ordered backlog.
- Screenshots referenced in the source doc live under `/Users/eroberts/Downloads/TUI UAT Images/`.

---

## Phase 0 — Input + key handling primitives (unblocks everything)

1. **Global `Esc` handling: close UI first, never exit accidentally**
   - From: S02 command palette cancel, S07 pasted snippet cancel, plus multiple comments.
   - Goal: `Esc` closes the active popup/card first; app exit only when appropriate.
   - Screenshot(s): `uat-S02-03-command-cancel.png`, `uat-S07-02-paste-cancelled.png`

2. **Backspace must work in every text-entry surface**
   - From: S03 file path draft, S07 paste flow, misc “cannot backspace”, intent file popup.
   - Screenshot(s):
     - `uat-S03-04-file-auto-add-b.png`
     - `uat-S07-03-paste-submitted-b.png`
     - `uat-misc-cannot-backspace.png`
     - `uat-misc-cannot-backspace-intent.png`

3. **Fix bracketed paste / `[200~` artifacts (paste should be clean text)**
   - From: S03 file path paste and S07 pasted snippet submit.
   - Screenshot(s):
     - `uat-S03-04-file-auto-add.png`
     - `uat-S07-03-paste-submitted.png`

4. **Keybinding “command keys” shouldn’t type into inputs**
   - From: S01 `?` appearing in input, S05 `t` appending to popup drafts.
   - Screenshot(s): `uat-S01-03-help-closed.png`, `uat-S05-02-smart-toggled.png`

---

## Phase 1 — Modal/popup navigation + scrolling (basic usability)

5. **Help overlay scroll keys (PgUp/PgDn/↑/↓) actually scroll**
   - From: S01 help overlay scroll.
   - Screenshot(s): `uat-S01-02-help-scrolled.png`

6. **Command palette selection navigation + cancel behavior**
   - From: S02 arrow navigation + `Esc` cancels (without exiting app).
   - Screenshot(s): `uat-S02-03-command-cancel.png`

---

## Phase 2 — Command palette search behavior consistency

7. **Unify filtering/search semantics between `Ctrl+G` and `/`**
   - From: S05 note: `Ctrl+G` can’t fuzzy-find but `/` can.
   - Screenshot(s): `uat-S05-01-smart-popup-open.png`

---

## Phase 3 — File context popup (depends on paste + backspace + scrolling)

8. **Absolute-path auto-add works with clean paste**
   - From: S03 auto-add absolute existing file path.
   - Screenshot(s): `uat-S03-04-file-auto-add.png`, `uat-S03-04-file-auto-add-b.png`

9. **Selected-file list supports scrolling + selection across all entries**
   - From: S03 can’t scroll list; can only delete top item.
   - Screenshot(s): `uat-S03-05-file-removed.png`

10. **Delete removes the selected entry (not just top)**

- From: S03 remove a file entry via `Del`.
- Screenshot(s): `uat-S03-05-file-removed.png`

---

## Phase 4 — Smart context popup (depends on key handling + command palette)

11. **Smart popup open is stable (prefill root, focus, no stray characters)**

- From: S05 open smart context popup.
- Screenshot(s): `uat-S05-01-smart-popup-open.png`

12. **Toggle smart context without writing `t` into inputs**

- From: S05 `t` appends into input line.
- Screenshot(s): `uat-S05-02-smart-toggled.png`

13. **Root override submit is idempotent (no repeated stacking on Enter)**

- From: S05 “keeps adding the context root”.
- Screenshot(s): `uat-S05-03-smart-root-set.png`, `uat-S05-03-smart-root-set-b.png`

14. **Toggle key should not conflict with typing root text**

- From: S05 root contains `t` triggers toggle.
- Screenshot(s): `uat-S05-03-smart-root-set-c.png`

15. **Replace stacked history notices with a temporary toast/notifier**

- From: S05 “no reason to stack these messages; use a temporary notifier toast”.
- Screenshot(s): `uat-S05-03-smart-root-set-d.png`

16. **Smart-context progress stays visible during generation**

- From: S05 history scrolls out of view; user can’t see progress.
- Screenshot(s): `uat-S05-05-smart-progress.png`

---

## Phase 5 — Intent sources + meta instructions

17. **Implement `/meta` alias (open meta instructions popup)**

- From: S06 “There is no `/meta` command”.
- Screenshot(s): `uat-S06-03-meta-set.png`

18. **Intent file input: add fuzzy search + ensure editing works**

- From: S06 heading note + misc “can’t backspace in intent file popup”.
- Screenshot(s): `uat-misc-cannot-backspace-intent.png`

---

## Phase 6 — Pasted snippet flow (depends on paste + Esc)

19. **Pasted snippet mode reliably triggers and displays**

- From: S07 card visible + “popup doesn’t appear under 4 lines”.
- Screenshot(s): `uat-S07-01-paste-card-visible.png`, `uat-S07-03-paste-submitted-d.png`

20. **Cancel snippet with `Esc` (and don’t exit app)**

- From: S07 cancel doesn’t work.
- Screenshot(s): `uat-S07-02-paste-cancelled.png`

21. **Submit snippet with `Enter` using correct text and line count**

- From: S07 submit doesn’t work; `[200` prefix; wrong line count.
- Screenshot(s):
  - `uat-S07-03-paste-submitted.png`
  - `uat-S07-03-paste-submitted-b.png`
  - `uat-S07-03-paste-submitted-c.png`

---

## Phase 7 — Session reset and reuse semantics

22. **Make `/new --reuse` actually work and reduce confusion**

- From: S08 duplicate section + “doesn’t do anything at all”.
- Screenshot(s): `uat-S08-05-new-flag-reuse.png`

---

## Phase 8 — Model popup + provider status chips

23. **Model list shows by default (fuzzy search optional, not required)**

- From: S15 “No models listed” unless fuzzy searching.
- Screenshot(s): `uat-S15-03-model-no-models-shown.png`, `uat-S15-03-model-need-fuzzy.png`

24. **Model selection updates state + chip reliably**

- From: S15 selection “doesn’t work”.
- Screenshot(s): `uat-S15-03-model-selected.png`

25. **Provider missing/error status chips are accurate and understandable**

- From: S15 “simulate provider missing” notes + expected mapping.
- Screenshot(s): (none in source; relies on chip visibility)

---

## Phase 9 — Generation UX messaging and visibility

26. **Make refinement prompt more prominent**

- From: misc “refinement prompt instructional text”.
- Screenshot(s): `uat-misc-refinement-prompt.png`

27. **Make important indicators stand out (e.g. `JSON disabled`)**

- From: misc “printed into history get lost”.
- Screenshot(s): `uat-misc-json-disabled-invisible.png`

28. **Clarify the “why do I see this error?” message**

- From: misc “why error”.
- Screenshot(s): `uat-misc-why-error.png`

---

## Phase 10 — Test running UX (depends on baseline spinners/status)

29. **Generate-view `/test` run shows obvious progress (spinner/status)**

- From: S17 “no indication except history; status should be spinning”.
- Screenshot(s): `uat-S17-02-test-run-progress.png`, `uat-misc-status-spinner.png`

30. **Dedicated Test Runner view: clear progress + results + failure reasons**

- From: S18 “bad UX; no way to know what’s going on”.
- Screenshot(s): `uat-S18-03-test-runner-results.png`

---

## Phase 11 — Interactive transport mode (depends on clearer generation status)

31. **Avoid “silent halt” while waiting for transport input**

- From: S19 “It halts, apparently waiting for transport input”.
- Screenshot(s): `uat-S19-03-transport-events.png`

32. **Add in-app guidance for transport refine workflow**

- From: S19 “I need to understand it first”.
- Screenshot(s): `uat-S19-04-transport-refine.png`

---

## Phase 12 — Main screen visual polish (safe to do after behavior is solid)

33. **Increase overall contrast / adopt a theming approach**

- From: Main Screen “text too dim” + theme note.
- Screenshot(s): `uat-main-screen-1.png`

34. **Re-organize header so it uses less space**

- From: Main Screen heading consumes screen real estate.
- Screenshot(s): `uat-main-screen-1.png`

35. **Make param/value indicators responsive and less visually busy**

- From: Main Screen input section indicators wrap and clutter.
- Screenshot(s): `uat-main-screen-1.png`

---

## Deferred / blocked (needs prerequisites or more data)

- **S13 reasoning popup scroll**
  - Blocker: not enough reasoning text available to test in current flow.
  - Screenshot(s): `uat-S13-03-reasoning-scrolled.png`
