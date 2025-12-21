# Prompt Maker CLI TUI — Comprehensive Walkthrough & Screenshot Checklist for UAT

## 1. Overview

This document is a human-executable UAT walkthrough for the `prompt-maker-cli` TUI (command-palette preview). Follow it top-to-bottom, capturing screenshots at each checkpoint so an engineer can verify every screen, command, popup, mode, edge case, and meaningful combination.

The TUI has two main views:

- **Generate view** (default): command palette + generation + history + popups.
- **Test Runner view**: run `prompt-tests.yaml` suites with a focused UI.

Navigation + overlays are global:

- `Ctrl+G` opens the command palette (Generate view).
- `Ctrl+T` switches to the Test Runner.
- `?` toggles the help overlay.
- `Esc` / `Ctrl+C` exits (with exceptions when popups are open).

(See `apps/prompt-maker-cli/src/tui/AppContainer.tsx`, `apps/prompt-maker-cli/src/tui/app-container-keymap.ts`, `apps/prompt-maker-cli/src/tui/help-config.ts`.)

## 2. Assumptions & Questions

**Assumptions**

- You will run the TUI locally (TTY terminal) via the CLI entrypoint described in `apps/prompt-maker-cli/src/index.ts` and `apps/prompt-maker-cli/src/tui/index.tsx`.
- Network access is available for URL context and GitHub context (used by `apps/prompt-maker-cli/src/url-context.ts` and `apps/prompt-maker-cli/src/github-context.ts`).
- You can safely create small, disposable local files for intent/context.
- You can temporarily set/unset environment variables to simulate missing credentials.

**Important product-note (media commands)**

- The TUI command list includes `/image` and `/video` (see `apps/prompt-maker-cli/src/tui/config.ts`), and the generation pipeline supports `images` and `video` arrays (see `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`, `apps/prompt-maker-cli/src/generate-command.ts`, `apps/prompt-maker-cli/src/prompt-generator-service.ts`).
- However, the current TUI command handler (`apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`) does not implement `image`/`video` handling; selecting those commands currently falls through the default case (it only logs `Selected image`/`Selected video`). This checklist treats that as a feature gap to explicitly confirm during UAT.

**Questions (answer to tailor UAT outcomes)**

1. Which providers should be “OK” in UAT screenshots: OpenAI only, Gemini only, both?
2. Do you want the UAT run to include _successful_ prompt generation, or is “abort due to missing credentials” acceptable as long as it’s clearly captured?
3. For GitHub URL context, should we avoid hitting private repos and only use public URLs?
4. Should `open-chatgpt` behavior be validated (it may open a browser window), or should we leave it disabled and only confirm the toggle state chip?

## 3. Prerequisites / Setup

### Environment variables

Provider credentials are resolved from env vars first, otherwise from a local config file:

- OpenAI:
  - `OPENAI_API_KEY` (required for OpenAI models)
  - `OPENAI_BASE_URL` (optional)
  - Source: `apps/prompt-maker-cli/src/config.ts`
- Gemini:
  - `GEMINI_API_KEY` (required for Gemini models)
  - `GEMINI_BASE_URL` (optional)
  - Source: `apps/prompt-maker-cli/src/config.ts`
- GitHub context (optional but helpful for rate limits):
  - `GITHUB_TOKEN`
  - Source: `apps/prompt-maker-cli/src/github-context.ts`

Optional debug:

- `PROMPT_MAKER_DEBUG_KEYS=1` enables a debug line in the Generate view input bar (see `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`).

### Local config file (optional alternative to env vars)

If you don’t want to export env vars, you can create:

- `~/.config/prompt-maker-cli/config.json`
- Source: `apps/prompt-maker-cli/src/config.ts`

Example (DO NOT commit this):

```json
{
  "openaiApiKey": "...",
  "geminiApiKey": "...",
  "promptGenerator": {
    "defaultModel": "gpt-4o-mini",
    "defaultGeminiModel": "gemini-3-pro-preview"
  }
}
```

### Sample files to create (fixtures)

Create a small folder anywhere convenient (e.g., `./tmp-uat/`) and add:

1. `tmp-uat/intent-basic.md`

```md
# Title

UAT intent file

Write a 5-bullet checklist for verifying a CLI UI.
```

2. `tmp-uat/context-a.txt`

```txt
This is context file A.
It exists to test file glob ingestion.
```

3. `tmp-uat/context-b.md`

```md
# Context B

- Bullet 1
- Bullet 2
```

4. A large pasted snippet to trigger “pasted snippet mode”:

- Any 10–20 lines of text, or a single line > ~400 chars.
- Source behavior: `apps/prompt-maker-cli/src/tui/paste-snippet.ts` and `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.

### Suggested terminal settings (for consistent screenshots)

- Window size: **at least 100 columns × 30 rows**.
- Fixed-width font.
- Disable terminal transparency.
- Keep the same theme for all screenshots.

### How to launch the TUI (reference commands)

The CLI routes commands as:

- default (no args) → `ui`
- `ui` → TUI
- `test` → non-TUI test command
- otherwise → generate-only CLI

Source: `apps/prompt-maker-cli/src/index.ts`.

Suggested launch patterns for UAT:

- Normal TUI:
  - `prompt-maker-cli ui`
- Interactive transport TUI (socket path required):
  - `prompt-maker-cli ui --interactive-transport /tmp/prompt-maker-cli.sock`
  - Source: `apps/prompt-maker-cli/src/tui/index.tsx`, `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`.

## 4. Feature Inventory (Traceable)

### TUI entrypoint, routing, and views

- CLI command routing: default `ui`, `test`, `generate` (also accepts `expand`) in `apps/prompt-maker-cli/src/index.ts`.
- TUI argument parsing for interactive transport: `--interactive-transport <path>` in `apps/prompt-maker-cli/src/tui/index.tsx`.
- Views:
  - Generate view: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
  - Test Runner view: `apps/prompt-maker-cli/src/tui/TestRunnerScreen.tsx`.
  - View switching + overlay mounting: `apps/prompt-maker-cli/src/tui/AppContainer.tsx`.

### Global keybindings and help overlay

- Global keys and view switching rules:
  - `Ctrl+G` open command palette (or switch to Generate + open).
  - `Ctrl+T` switch to tests.
  - `?` toggle help.
  - `Esc` dismisses UI; never exits.
  - `Ctrl+C` exits.
  - Source: `apps/prompt-maker-cli/src/tui/app-container-keymap.ts`, `apps/prompt-maker-cli/src/tui/AppContainer.tsx`.
- Help overlay scroll + close:
  - scroll with ↑/↓ and PgUp/PgDn, close with `Esc` or `?`.
  - Source: `apps/prompt-maker-cli/src/tui/components/core/HelpOverlay.tsx`.
- Help text content (includes command list and popup hints): `apps/prompt-maker-cli/src/tui/help-config.ts`.

### Command palette commands and descriptors

Commands shown in the command menu are defined in `apps/prompt-maker-cli/src/tui/config.ts`:

- `/model`, `/intent`, `/instructions` (alias `/meta`), `/new`, `/reuse`, `/file`, `/url`, `/smart`, `/image`, `/video`, `/polish`, `/series`, `/copy`, `/chatgpt`, `/json`, `/tokens`, `/reasoning` (alias `/why`), `/history`, `/test`, `/exit`.
- Toggle labels: `polish`, `copy`, `chatgpt`, `json`.
- Popup height map (`POPUP_HEIGHTS`): model/toggle/file/url/history/smart/tokens/reasoning/test/intent/instructions/series.

### Generate view input behaviors

- Command mode detection (`/` prefix), with special handling for absolute paths so “/Users/...” isn’t treated as a command:
  - `apps/prompt-maker-cli/src/tui/drag-drop-path.ts` and its use in `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- Command menu filtering and selection:
  - filters by `id`, label prefix, and aliases; fallback to full list.
  - navigate with ↑/↓; `Esc` clears the input.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- History viewport:
  - scroll with ↑/↓ and PgUp/PgDn when command menu + popups are closed.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`, `apps/prompt-maker-cli/src/tui/hooks/useCommandHistory.ts`.
- Pasted snippet detection:
  - bracketed paste mode enabled; large paste becomes a “snippet card” requiring `Enter` to submit or `Esc` to cancel.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`, `apps/prompt-maker-cli/src/tui/paste-snippet.ts`.
- Drag & drop file path hint:
  - if an absolute file path is detected, shows a hint “Press Tab to add ... to context”; pressing `Tab` adds it to file context.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`, `apps/prompt-maker-cli/src/tui/drag-drop-path.ts`.

### Popup behaviors and keyboard interactions

Popup state and command dispatch:

- `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts` and `apps/prompt-maker-cli/src/tui/types.ts`.

Popup keyboard patterns (implemented in `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`):

- `Esc` closes popups.
- Toggle popup uses ←/→/↑/↓ to switch On/Off, `Enter` confirms.
- List popups:
  - File popup supports suggestions focus via `Tab` and selection with `Enter`; `Del` removes selected existing entries.
  - URL/history popups use ↑/↓ selection; `Del` removes selected entries (url), `Enter` reuses/inputs (history).
- Reasoning popup scrolls with ↑/↓ and PgUp/PgDn.

Popup UI components:

- Model: `apps/prompt-maker-cli/src/tui/components/popups/ModelPopup.tsx`.
- List: `apps/prompt-maker-cli/src/tui/components/popups/ListPopup.tsx`.
- Tokens: `apps/prompt-maker-cli/src/tui/components/popups/TokenUsagePopup.tsx`.
- Reasoning: `apps/prompt-maker-cli/src/tui/components/popups/ReasoningPopup.tsx`.
- Others: Toggle/Test/Smart/Intent/Instructions/Series popups in `apps/prompt-maker-cli/src/tui/components/popups/*`.

### Generation pipeline behaviors (incl. interactive + transport + JSON constraints)

- TUI generation pipeline orchestrator + UI stream mapping: `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`.
- CLI pipeline used underneath:
  - interactive vs JSON restriction: `--json` cannot be combined with `--interactive` in `apps/prompt-maker-cli/src/generate-command.ts`.
  - stream events and transport lifecycle: `apps/prompt-maker-cli/src/generate-command.ts`.
- TUI interactive refinement:
  - When **no interactive transport** and **JSON is off**, the TUI uses an interactive delegate prompting refinements in the input bar (`isAwaitingRefinement`).
  - Source: `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`.
- Transport interactive:
  - When started with `--interactive-transport`, interactive refinement is driven by socket commands (JSON lines such as `{ "type": "refine", "instruction": "..." }`).
  - Source: `apps/prompt-maker-cli/src/generate-command.ts` and `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`.
- JSON toggle constraint:
  - JSON output is blocked while interactive transport is enabled in TUI (`JSON_INTERACTIVE_ERROR`).
  - Source: `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`.

### Context resolution (files, URLs, GitHub, smart context)

- File context glob resolution: `apps/prompt-maker-cli/src/file-context.ts` (used by pipeline).
- URL context:
  - generic URL: download + html-to-text; size limits; protocol restrictions.
  - GitHub URL path parsing, tree/blob support, max file count and size.
  - Sources: `apps/prompt-maker-cli/src/url-context.ts`, `apps/prompt-maker-cli/src/github-context.ts`.
- Smart context:
  - scans patterns, ignores common dirs, size cap, embedding index/search, optional root override.
  - Source: `apps/prompt-maker-cli/src/smart-context-service.ts`.

### Provider status chips and model availability

- Provider status resolution & caching:
  - `checkProviderStatus` / `checkModelProviderStatus` derives `ok` / `missing` / `error`.
  - Source: `apps/prompt-maker-cli/src/tui/provider-status.ts`, `apps/prompt-maker-cli/src/config.ts`.
- Generate view renders provider status chips like `[openai:ok]`/`[gemini:missing-key]`:
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- Model popup annotates options with provider label + status message:
  - Source: `apps/prompt-maker-cli/src/tui/components/popups/ModelPopup.tsx`.

### Test runner flows

- Generate-view test command:
  - `/test <file>` runs suite and logs progress into history.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`, `apps/prompt-maker-cli/src/test-command.ts`.
- Dedicated Test Runner view:
  - focusable input + actions; shows per-test status and summary.
  - Source: `apps/prompt-maker-cli/src/tui/TestRunnerScreen.tsx`.

## 5. Scenario Matrix

This matrix is **coverage-driven (pairwise-ish)**: it ensures every toggle/state/flow is exercised at least once without enumerating every redundant Cartesian combination.

Rationale for reduction:

- Many toggles are orthogonal (e.g., `/copy` and `/chatgpt` don’t change generation logic, they only add post-actions). We test each both ON and OFF across different scenarios, but we do not test every ON/OFF permutation.
- The biggest coupling is **Interactive vs JSON vs Interactive Transport**; that matrix is explicitly covered (see `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts` and `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`).

| Scenario ID | Description                                                               | Preconditions (toggles/context/model)               | Steps reference |
| ----------- | ------------------------------------------------------------------------- | --------------------------------------------------- | --------------- |
| S00         | Launch + baseline Generate view                                           | No help, no popup, any model                        | 6.1             |
| S01         | Help overlay open/close + scroll                                          | Any view                                            | 6.2             |
| S02         | Command palette open (Ctrl+G) + filtering + cancel                        | Generate view                                       | 6.3             |
| S03         | File context popup incl. suggestions + remove                             | Generate view; some local files exist               | 6.4             |
| S04         | URL context popup + GitHub/tree/blob coverage                             | Generate view; network                              | 6.5             |
| S05         | Smart context toggle + root override; run generation to see progress      | Generate view; smart on/off                         | 6.6             |
| S06         | Intent sources: typed, intent file, meta instructions                     | Generate view; provider OK or accept abort          | 6.7             |
| S07         | Pasted snippet flow (submit + cancel)                                     | Generate view                                       | 6.8             |
| S08         | `/new` reset + reuse prompt y/n                                           | Need prior generated prompt (or accept “no prompt”) | 6.9             |
| S09         | Interactive refinement loop (TUI delegate)                                | JSON OFF; no transport                              | 6.10            |
| S10         | Toggles: polish/copy/chatgpt ON; confirm messages                         | Provider OK recommended                             | 6.11            |
| S11         | JSON mode: enable JSON, run generation, see payload                       | JSON ON; no transport                               | 6.12            |
| S12         | Token usage popup before/after generation                                 | At least one run attempted                          | 6.13            |
| S13         | Reasoning popup before/after generation + scroll                          | At least one run attempted                          | 6.14            |
| S14         | Persistent history popup search + reuse                                   | Some history exists                                 | 6.15            |
| S15         | Model popup + provider status chips (ok/missing/error)                    | Manipulate env/config                               | 6.16            |
| S16         | `/series` popup (Tab + /series), artifact writing + validation extraction | Provider OK recommended                             | 6.17            |
| S17         | Generate-view `/test` command popup + run                                 | `prompt-tests.yaml` exists                          | 6.18            |
| S18         | Dedicated Test Runner view run + failure handling                         | `prompt-tests.yaml` exists                          | 6.19            |
| S19         | Interactive transport mode + JSON restriction                             | Launch with `--interactive-transport`               | 6.20            |
| S20         | Media commands visible but not implemented (confirm no-op)                | Generate view                                       | 6.21            |

## 6. Step-by-Step Walkthrough Checklist

### Screenshot naming convention

Use a consistent scheme so the engineering agent can cross-reference quickly:

- `uat-<ScenarioID>-<Step#>-<short-slug>.png`
- Example: `uat-S03-02-file-popup-suggestions.png`

### 6.1 S00 — Launch + baseline Generate view

- [ ] **Action:** Launch the TUI in a clean terminal.
  - Preconditions: none.
  - Keys/typing: run `prompt-maker-cli ui`.
- **Expected Result:**
  - Header includes `Prompt Maker · Command Palette Preview`.
  - Subtitle shows `Ctrl+G → Command Palette · Ctrl+T → Test Runner · ? → Help · Ctrl+C/Esc to exit.`
  - Welcome lines appear in history.
  - Source: `apps/prompt-maker-cli/src/tui/AppContainer.tsx`, `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-S00-01-launch-generate.png` (full screen).

### 6.2 S01 — Help overlay open/close + scroll

- [ ] **Action:** Open help overlay.
  - Preconditions: Generate view visible.
  - Keys: press `?`.
- **Expected Result:** Help overlay appears with sections Global/Generate/Test Runner/Popups.
  - Source: `apps/prompt-maker-cli/src/tui/components/core/HelpOverlay.tsx`, `apps/prompt-maker-cli/src/tui/help-config.ts`.
- **Screenshot:** `uat-S01-01-help-open.png`.

- [ ] **Action:** Scroll help overlay.
  - Keys: press `PgDn` twice, then `PgUp` once; also test ↑/↓ single-line scroll.
- **Expected Result:** Help content scroll offset changes; bottom-right hint updates with line range.
  - Source: `apps/prompt-maker-cli/src/tui/components/core/HelpOverlay.tsx`.
- **Screenshot:** `uat-S01-02-help-scrolled.png`.

- [ ] **Action:** Close help overlay (two ways).
  - Keys: press `Esc` to close; open again with `?`, then close with `?`.
- **Expected Result:** Overlay disappears; input returns.
  - Source: `apps/prompt-maker-cli/src/tui/app-container-keymap.ts`.
- **Screenshot:** `uat-S01-03-help-closed.png`.

### 6.3 S02 — Command palette open (Ctrl+G), filtering, selection, cancel

- [ ] **Action:** Open command palette.
  - Keys: press `Ctrl+G`.
- **Expected Result:** Input becomes `/` and command menu is visible.
  - Source: `apps/prompt-maker-cli/src/tui/AppContainer.tsx`, `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-S02-01-command-palette-open.png`.

- [ ] **Action:** Filter commands by typing.
  - Keys/typing: type `rea` after `/` (so the input shows `/rea`).
- **Expected Result:** Command list filters to match `reasoning` (and/or others that prefix-match).
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-S02-02-command-filtered.png`.

- [ ] **Action:** Navigate command selection and cancel.
  - Keys: press `↓` then `↑` then `Esc`.
- **Expected Result:** Selection index changes with arrows; `Esc` clears the input and dismisses the command menu.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-S02-03-command-cancel.png`.

### 6.4 S03 — File context popup (add/remove, suggestions, path auto-add)

- [ ] **Action:** Open the file context popup.
  - Preconditions: create `tmp-uat/context-a.txt` and `tmp-uat/context-b.md`.
  - Keys/typing: `Ctrl+G`, type `file`, press `Enter`.
- **Expected Result:** “File Context” popup appears with instructions including `Tab/↓ suggestions`.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` (ListPopup props), `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts` (workspace scan for suggestions).
- **Screenshot:** `uat-S03-01-file-popup-open.png`.

- [ ] **Action:** Use suggestions focus.
  - Keys: press `Tab` to focus suggestions; use `↓` to change suggestion selection; press `Enter`.
- **Expected Result:** Selected suggestion copies into the draft input; suggestions focus exits.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` and `apps/prompt-maker-cli/src/tui/components/popups/ListPopup.tsx`.
- **Screenshot:** `uat-S03-02-file-popup-suggestions.png`.

- [ ] **Action:** Add a glob and verify it appears in the list.
  - Keys/typing: type `tmp-uat/**/*.md` in the draft area, press `Enter`.
- **Expected Result:** History logs `Context file added: tmp-uat/**/*.md` and the popup list includes it.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-S03-03-file-added.png`.

- [ ] **Action:** Add a file path by pasting an absolute path into the popup draft.
  - Keys/typing: paste an absolute path to `tmp-uat/context-a.txt` (e.g., `/Users/.../tmp-uat/context-a.txt`).
- **Expected Result:** The file is auto-added to context when a valid absolute path to an existing file is detected.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` (effect that calls `handleAddFile(candidate)` when draft is an absolute file).
- **Screenshot:** `uat-S03-04-file-auto-add.png`.

- [ ] **Action:** Remove a file entry.
  - Keys: use ↑/↓ to select an entry, press `Del`.
- **Expected Result:** Entry removed and history logs `Context file removed: ...`.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-S03-05-file-removed.png`.

- [ ] **Action:** Close popup.
  - Keys: press `Esc`.
- **Expected Result:** Popup closes and returns to Generate input.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-S03-06-file-popup-closed.png`.

### 6.5 S04 — URL context popup + generic + GitHub (tree/blob)

- [ ] **Action:** Open URL context popup.
  - Keys: `Ctrl+G`, type `url`, press `Enter`.
- **Expected Result:** “URL Context” popup appears, with instructions mentioning `Del to remove`.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-S04-01-url-popup-open.png`.

- [ ] **Action:** Add a generic HTTPS URL.
  - Keys/typing: enter a stable URL like `https://example.com` and press `Enter`.
- **Expected Result:** History logs `Context URL added: https://example.com`.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-S04-02-url-added-generic.png`.

- [ ] **Action:** Add a GitHub tree URL (repo or folder).
  - Keys/typing: add something like `https://github.com/openai/openai-node` or a `/tree/<ref>/<path>` URL.
- **Expected Result:** URL is added to the list; later, during generation, the pipeline resolves it via GitHub context.
  - Source: `apps/prompt-maker-cli/src/url-context.ts` (GitHub host routing), `apps/prompt-maker-cli/src/github-context.ts`.
- **Screenshot:** `uat-S04-03-url-added-github-tree.png`.

- [ ] **Action:** Add a GitHub blob URL (single file).
  - Keys/typing: add something like `https://github.com/openai/openai-node/blob/main/README.md`.
- **Expected Result:** URL is added; later, during generation, it resolves as a single `github:` context file.
  - Source: `apps/prompt-maker-cli/src/github-context.ts` (`blob` parsing and `raw.githubusercontent.com` fetch).
- **Screenshot:** `uat-S04-04-url-added-github-blob.png`.

- [ ] **Action:** Remove one URL.
  - Keys: select a URL with ↑/↓ and press `Del`.
- **Expected Result:** URL removed and history logs `Context URL removed: ...`.
- **Screenshot:** `uat-S04-05-url-removed.png`.

- [ ] **Action:** Close URL popup.
  - Keys: `Esc`.
- **Expected Result:** Popup closes.
- **Screenshot:** `uat-S04-06-url-popup-closed.png`.

### 6.6 S05 — Smart context toggle + root override + generation progress

- [ ] **Action:** Open Smart Context popup.
  - Keys: `Ctrl+G`, type `smart`, press `Enter`.
- **Expected Result:** Smart popup appears (root draft prefilled from current root).
  - Source: `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`.
- **Screenshot:** `uat-S05-01-smart-popup-open.png`.

- [ ] **Action:** Toggle smart context inside the popup.
  - Keys: press `t`.
- **Expected Result:** History logs `Smart context enabled` or `Smart context disabled`.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` (smart toggle handler).
- **Screenshot:** `uat-S05-02-smart-toggled.png`.

- [ ] **Action:** Set a root override and apply.
  - Keys/typing: type `tmp-uat` (or another directory) into the root input and press `Enter`.
- **Expected Result:** History logs `Smart context root set to ...` and status chips include `[root:tmp-uat]`.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` (smart root submit), `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts` (passes `smartContextRoot`).
- **Screenshot:** `uat-S05-03-smart-root-set.png`.

- [ ] **Action:** Close popup.
  - Keys: `Esc`.
- **Expected Result:** Popup closes.
- **Screenshot:** `uat-S05-04-smart-popup-closed.png`.

- [ ] **Action:** Run a generation to force smart-context progress events.
  - Preconditions: smart context enabled; provider credentials OK recommended.
  - Keys/typing: type a short intent like `Summarize the repo` and press `Enter`. When prompted for refinement, press `Enter` on an empty line to finish.
- **Expected Result:** History shows progress events like `Preparing smart context ...` and/or `Smart context ready` (from the underlying service).
  - Source: `apps/prompt-maker-cli/src/smart-context-service.ts`, `apps/prompt-maker-cli/src/generate-command.ts` progress events, surfaced by `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`.
- **Screenshot:** `uat-S05-05-smart-progress.png` (capture progress lines and status chips).

### 6.7 S06 — Intent sources (typed vs intent file) + meta instructions

- [ ] **Action:** Set an intent file.
  - Preconditions: create `tmp-uat/intent-basic.md`.
  - Keys: `Ctrl+G`, type `intent`, press `Enter`.
  - In popup: enter `tmp-uat/intent-basic.md` and press `Enter`.
- **Expected Result:** History logs `Intent file set to tmp-uat/intent-basic.md` and status chips include `[intent:file]` and `[file:intent-basic.md]`.
  - Source: `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`, `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` (intent chips).
- **Screenshot:** `uat-S06-01-intent-file-set.png`.

- [ ] **Action:** Type a different intent and submit (to verify typed intent is ignored when intent file is active).
  - Keys/typing: type `This typed intent should be ignored` and press `Enter`.
- **Expected Result:** History includes:
  - `> [intent file] tmp-uat/intent-basic.md`
  - `Typed intent ignored because an intent file is active.`
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`, `apps/prompt-maker-cli/src/tui/intent-source.ts`.
- **Screenshot:** `uat-S06-02-intent-file-override.png`.

- [ ] **Action:** Set meta instructions via `/meta` alias.
  - Keys/typing: `Ctrl+G`, type `meta`, press `Enter`.
  - In popup: enter `Prefer numbered lists; keep it short.` and press `Enter`.
- **Expected Result:** History logs `[instr] Prefer numbered lists; keep it short.` and status chips include `[instr:on]`.
  - Source: `apps/prompt-maker-cli/src/tui/config.ts` (alias), `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`.
- **Screenshot:** `uat-S06-03-meta-set.png`.

- [ ] **Action:** Clear intent file.
  - Keys/typing: `Ctrl+G`, type `intent`, press `Enter`.
  - In popup: clear the input (empty string) and press `Enter`.
- **Expected Result:** History logs `Intent file cleared; using typed intent.` and status chips return to `[intent:text]`.
- **Screenshot:** `uat-S06-04-intent-file-cleared.png`.

### 6.8 S07 — Pasted snippet flow (submit + cancel)

- [ ] **Action:** Trigger pasted snippet mode.
  - Preconditions: have a multi-line chunk ready (10–20 lines).
  - Keys/typing: paste into the input bar.
- **Expected Result:** A “pasted snippet card” appears; the input bar is disabled and shows the snippet label like `[Pasted ~N lines]`.
  - Source: `apps/prompt-maker-cli/src/tui/paste-snippet.ts`, `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-S07-01-paste-card-visible.png`.

- [ ] **Action:** Cancel pasted snippet.
  - Keys: press `Esc`.
- **Expected Result:** Snippet card disappears; input returns to normal.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-S07-02-paste-cancelled.png`.

- [ ] **Action:** Trigger pasted snippet mode again, then submit it.
  - Keys: paste again; press `Enter`.
- **Expected Result:** Snippet is submitted as if it were typed intent; history includes `> ...` (user line) and generation begins (or aborts if provider missing).
- **Screenshot:** `uat-S07-03-paste-submitted.png`.

### 6.9 S08 — `/new` reset + `/reuse` last prompt

- [ ] **Action:** Run `/new`.
  - Keys: `Ctrl+G`, type `new`, press `Enter`.
- **Expected Result:** History logs `[new] Session reset.` and clears session context (files/urls/smart/meta).
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` (`handleNewCommand`).

- [ ] **Action:** After a generation run has produced a final prompt, run `/reuse`.
  - Preconditions: you have a `Final prompt ...` entry in history.
  - Keys: `Ctrl+G`, type `reuse`, press `Enter`.
- **Expected Result:** Session resets and immediately loads the last prompt into meta instructions; status chips include `[instr:on]`.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` (`handleReuseCommand`).

- [ ] **Action:** Run `/reuse` with no previous prompt.
  - Preconditions: fresh session OR ensure no prompt generated yet.
  - Keys: `Ctrl+G`, type `reuse`, press `Enter`.
- **Expected Result:** History logs `[reuse] Session reset · no previous prompt to reuse.`.

### 6.10 S09 — Interactive refinement loop (TUI delegate)

This validates the core loop: prompt → refine → prompt → finish.

- [ ] **Action:** Ensure JSON is OFF.
  - Keys: `Ctrl+G`, type `json off`, press `Enter`.
- **Expected Result:** History logs `JSON disabled`.
  - Source: `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`.
- **Screenshot:** `uat-S09-01-json-off.png`.

- [ ] **Action:** Run a generation and provide a non-empty refinement.
  - Preconditions: provider credentials OK recommended.
  - Keys/typing: enter an intent like `Create a short UAT checklist` and press `Enter`.
  - When prompted `Describe refinement ...`, type `Add a section for edge cases.` and press `Enter`.
- **Expected Result:**
  - History shows `Iteration 1 started`, `Iteration 1 complete`, then the “Refine the prompt above ...” message, then `> [refine] ...`, then `Iteration 2 ...`.
  - Source: `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts` (interactive delegate), `apps/prompt-maker-cli/src/generate-command.ts` (iteration events).
- **Screenshot:** `uat-S09-02-refine-nonempty.png`.

- [ ] **Action:** Finish interactive refinement with an empty submission.
  - Keys: when prompted again, press `Enter` on an empty line.
- **Expected Result:** History logs `Interactive refinement complete.` and a final prompt is printed.
- **Screenshot:** `uat-S09-03-refine-finish-empty.png`.

### 6.11 S10 — Toggles: polish/copy/chatgpt (ON) and confirmation messages

- [ ] **Action:** Enable polish, copy, and chatgpt.
  - Keys:
    - `Ctrl+G`, type `polish on`, `Enter`
    - `Ctrl+G`, type `copy on`, `Enter`
    - `Ctrl+G`, type `chatgpt on`, `Enter`
- **Expected Result:** History logs `Polish enabled`, `Copy enabled`, `ChatGPT enabled`; status chips show `[polish:on]`, `[copy:on]`, `[chatgpt:on]`.
  - Source: `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`, `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`.
- **Screenshot:** `uat-S10-01-toggles-enabled.png`.

- [ ] **Action:** Run a generation to trigger post-actions.
  - Preconditions: provider credentials OK recommended; clipboard/browser access may be needed.
  - Keys/typing: enter a simple intent and follow the refinement flow to completion.
- **Expected Result:** After final prompt:
  - If copy enabled: history logs `Copied prompt to clipboard.`
  - If chatgpt enabled: history logs `Opened ChatGPT with generated prompt.`
  - If polish enabled: generation includes a polish pass (progress events with scope `polish` may appear).
  - Source: `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`, `apps/prompt-maker-cli/src/generate-command.ts`.
- **Screenshot:** `uat-S10-02-post-actions.png`.

- [ ] **Action:** Disable copy and chatgpt (leave polish on).
  - Keys: `copy off`, `chatgpt off` via command palette.
- **Expected Result:** Chips update to `[copy:off]`, `[chatgpt:off]`.
- **Screenshot:** `uat-S10-03-toggles-disabled.png`.

### 6.12 S11 — JSON mode (payload shown in history)

- [ ] **Action:** Enable JSON output.
  - Preconditions: interactive transport must be OFF.
  - Keys: `Ctrl+G`, type `json on`, press `Enter`.
- **Expected Result:** History logs `JSON enabled (payload shown in history)` and status chip shows `[json:on]`.
  - Source: `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`.
- **Screenshot:** `uat-S11-01-json-enabled.png`.

- [ ] **Action:** Run generation in JSON mode.
  - Preconditions: provider credentials OK recommended.
  - Keys: enter an intent and press `Enter`.
- **Expected Result:**
  - Generation runs non-interactively (no refinement prompt from TUI delegate).
  - After final prompt, history prints `JSON payload:` followed by formatted JSON.
  - Source: `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts` (disables delegate when JSON on), `apps/prompt-maker-cli/src/generate-command.ts` (JSON + interactive restriction).
- **Screenshot:** `uat-S11-02-json-payload.png`.

- [ ] **Action:** Disable JSON.
  - Keys: `Ctrl+G`, type `json off`, press `Enter`.
- **Expected Result:** History logs `JSON disabled`.
- **Screenshot:** `uat-S11-03-json-disabled.png`.

### 6.13 S12 — Token usage popup (before/after)

- [ ] **Action:** Open token usage before any successful generation.
  - Keys: `Ctrl+G`, type `tokens`, press `Enter`.
- **Expected Result:** Popup shows `No token usage recorded yet. Run generation first.`
  - Source: `apps/prompt-maker-cli/src/tui/components/popups/TokenUsagePopup.tsx`.
- **Screenshot:** `uat-S12-01-tokens-empty.png`.

- [ ] **Action:** Close popup.
  - Keys: `Esc`.
- **Expected Result:** Returns to Generate.
- **Screenshot:** `uat-S12-02-tokens-closed.png`.

- [ ] **Action:** After a generation run completes, open `/tokens` again.
  - Preconditions: complete at least one generation run (any mode).
  - Keys: `Ctrl+G`, `tokens`, `Enter`.
- **Expected Result:** Token usage popup shows input/output totals and estimated cost (if model pricing is known).
  - Source: `apps/prompt-maker-cli/src/tui/token-usage-store.ts`, `apps/prompt-maker-cli/src/tui/components/popups/TokenUsagePopup.tsx`.
- **Screenshot:** `uat-S12-03-tokens-breakdown.png`.

### 6.14 S13 — Reasoning popup (before/after) + scroll

- [ ] **Action:** Open reasoning popup before any reasoning exists.
  - Keys: `Ctrl+G`, type `why`, press `Enter`.
- **Expected Result:** Popup shows `No reasoning recorded yet. Run generation first.`
  - Source: `apps/prompt-maker-cli/src/tui/components/popups/ReasoningPopup.tsx`, alias in `apps/prompt-maker-cli/src/tui/config.ts`.
- **Screenshot:** `uat-S13-01-reasoning-empty.png`.

- [ ] **Action:** After a generation run completes, open reasoning popup again.
  - Preconditions: complete a generation run that yields `result.reasoning`.
  - Keys: `Ctrl+G`, `reasoning`, `Enter`.
- **Expected Result:** Popup shows reasoning text, scrollable with ↑/↓ and PgUp/PgDn.
  - Source: `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts` (captures reasoning), `apps/prompt-maker-cli/src/tui/components/popups/ReasoningPopup.tsx`.
- **Screenshot:** `uat-S13-02-reasoning-filled.png`.

- [ ] **Action:** Scroll reasoning.
  - Keys: `PgDn`, `PgUp`, ↑, ↓.
- **Expected Result:** Content scrolls.
- **Screenshot:** `uat-S13-03-reasoning-scrolled.png`.

### 6.15 S14 — Persistent history popup: search + reuse

Persistent TUI history is stored at `~/.config/prompt-maker-cli/tui-history.json`.

- Source: `apps/prompt-maker-cli/src/tui/command-history.ts`.

- [ ] **Action:** Open history popup.
  - Keys: `Ctrl+G`, type `history`, press `Enter`.
- **Expected Result:** History popup shows saved entries (commands + intents) and a search draft box.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`, `apps/prompt-maker-cli/src/tui/hooks/usePersistentCommandHistory.ts`.
- **Screenshot:** `uat-S14-01-history-popup-open.png`.

- [ ] **Action:** Filter history by typing.
  - Keys/typing: type `series` into the history popup draft.
- **Expected Result:** List narrows to entries containing `series`.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` (history filtering).
- **Screenshot:** `uat-S14-02-history-filter.png`.

- [ ] **Action:** Reuse an entry into the input bar.
  - Keys: select an item with ↑/↓ and press `Enter`.
- **Expected Result:** Popup closes, input bar is populated with the selected command/intent.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` (`handleHistoryPopupSubmit`).
- **Screenshot:** `uat-S14-03-history-reused-into-input.png`.

### 6.16 S15 — Model popup + provider status chips (ok/missing/error)

- [ ] **Action:** Capture provider chips in the status bar.
  - Preconditions: restart TUI after changing env/config (provider status is cached).
  - Keys: none.
- **Expected Result:** Status chips include `[openai:<suffix>] [gemini:<suffix>]` where suffix is `ok`, `missing-key`, or `error`.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`, `apps/prompt-maker-cli/src/tui/provider-status.ts`.
- **Screenshot:** `uat-S15-01-provider-chips.png`.

- [ ] **Action:** Open model popup.
  - Keys: `Ctrl+G`, type `model`, press `Enter`.
- **Expected Result:** Model list shows provider annotations and status messages; selection row uses different colors based on status.
  - Source: `apps/prompt-maker-cli/src/tui/components/popups/ModelPopup.tsx`.
- **Screenshot:** `uat-S15-02-model-popup.png`.

- [ ] **Action:** Search models and select one.
  - Keys/typing: type `gemini` in the model search; use ↑/↓; press `Enter`.
- **Expected Result:** History logs `Model set to <id>`, status chip changes to `[<model>]`.
  - Source: `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`, `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-S15-03-model-selected.png`.

**How to simulate provider missing** (choose one):

- Remove `OPENAI_API_KEY` and ensure config has no `openaiApiKey`, then restart TUI.
- Remove `GEMINI_API_KEY` and ensure config has no `geminiApiKey`, then restart TUI.

Expected status:

- Missing credentials should show status `missing` and chip suffix `missing-key`.
- Source: `apps/prompt-maker-cli/src/config.ts` (error text contains “Missing ... credentials”), `apps/prompt-maker-cli/src/tui/provider-status.ts` (maps /missing/i to `missing`).

### 6.17 S16 — Series flow: Tab open + /series prefill + artifacts

- [ ] **Action:** Open series popup via `Tab` while typing.
  - Preconditions: ensure input is NOT in command mode; type a short intent like `Write a test plan` into the input.
  - Keys: press `Tab`.
- **Expected Result:** Series intent popup appears; history logs `[series] Using typed intent as draft.` and the popup hint matches whether an intent file is active.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` (Tab opens series), `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts` (prefill logic + hint).
- **Screenshot:** `uat-S16-01-series-popup-tab.png`.

- [ ] **Action:** Submit series intent.
  - Keys/typing: in popup, press `Enter`.
- **Expected Result:** Series generation begins; history logs `[series] Starting series generation…` and progress lines.
  - Source: `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts` (`runSeriesGeneration`).
- **Screenshot:** `uat-S16-02-series-progress.png`.

- [ ] **Action:** Confirm artifacts saved (if filesystem writes succeed).
  - Keys: none; wait for completion.
- **Expected Result:** History includes a line like `[Series] Saved X/Y prompts to generated/series/<timestamp>-<intent-slug>`.
  - Source: `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts` (writes to `generated/series/...`).
- **Screenshot:** `uat-S16-03-series-saved.png`.

- [ ] **Action:** Confirm validation-section extraction behavior.
  - Keys: none.
- **Expected Result:** For each atomic prompt, history prints either the `Validation` section or `(no Validation section found)`.
  - Source: `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts` (`extractValidationSection`).
- **Screenshot:** `uat-S16-04-series-validation-lines.png`.

### 6.18 S17 — Generate-view `/test` command popup + run

- [ ] **Action:** Open the test popup.
  - Preconditions: ensure `prompt-tests.yaml` exists in repo root.
  - Keys: `Ctrl+G`, type `test`, press `Enter`.
- **Expected Result:** Test popup opens with draft file path.
  - Source: `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`.
- **Screenshot:** `uat-S17-01-test-popup-open.png`.

- [ ] **Action:** Run tests from the popup.
  - Keys: press `Enter`.
- **Expected Result:** History logs `[tests] Running <resolved-path>` plus per-test progress and a summary.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx` (test runner in Generate view), `apps/prompt-maker-cli/src/test-command.ts`.
- **Screenshot:** `uat-S17-02-test-run-progress.png`.

### 6.19 S18 — Dedicated Test Runner view run + failure handling

- [ ] **Action:** Switch to Test Runner view.
  - Keys: `Ctrl+T`.
- **Expected Result:** Screen shows `Test File` input, Actions area, status, and empty test list.
  - Source: `apps/prompt-maker-cli/src/tui/AppContainer.tsx`, `apps/prompt-maker-cli/src/tui/TestRunnerScreen.tsx`.
- **Screenshot:** `uat-S18-01-test-runner-view.png`.

- [ ] **Action:** Navigate focus using Tab/Shift+Tab.
  - Keys: press `Tab` (focus moves to Actions), then `Shift+Tab` (back to File).
- **Expected Result:** Green header indicates focus.
  - Source: `apps/prompt-maker-cli/src/tui/TestRunnerScreen.tsx`.
- **Screenshot:** `uat-S18-02-test-runner-focus.png`.

- [ ] **Action:** Run tests.
  - Keys:
    - Ensure file path is `prompt-tests.yaml`.
    - Press `Enter` in the File field to move focus to Actions.
    - Press `Enter` in Actions to run.
- **Expected Result:**
  - Tests list shows up to 15 tests with `PENDING/RUNNING/PASS/FAIL`.
  - Summary shows passed/failed.
  - Recent logs display failure reasons when tests fail.
  - Source: `apps/prompt-maker-cli/src/tui/TestRunnerScreen.tsx`, `apps/prompt-maker-cli/src/test-command.ts`.
- **Screenshot:** `uat-S18-03-test-runner-results.png`.

### 6.20 S19 — Interactive transport mode + JSON restriction

- [ ] **Action:** Launch TUI with interactive transport enabled.
  - Preconditions: choose a socket path (e.g., `/tmp/prompt-maker-cli.sock`).
  - Keys/typing: exit TUI; relaunch using `prompt-maker-cli ui --interactive-transport /tmp/prompt-maker-cli.sock`.
- **Expected Result:** Generate view shows a banner `Interactive transport listening on ...`.
  - Source: `apps/prompt-maker-cli/src/tui/AppContainer.tsx`, `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-S19-01-transport-banner.png`.

- [ ] **Action:** Attempt to enable JSON (should be blocked).
  - Keys: `Ctrl+G`, type `json on`, press `Enter`.
- **Expected Result:** History logs `JSON output is unavailable while interactive transport is enabled.`
  - Source: `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts` (`JSON_INTERACTIVE_ERROR`).
- **Screenshot:** `uat-S19-02-json-blocked.png`.

- [ ] **Action:** Start a generation run (transport interactive path).
  - Preconditions: provider OK recommended.
  - Keys: type an intent and press `Enter`.
- **Expected Result:** History includes transport lifecycle events like `Transport listening on ...`, `Transport client connected/disconnected` (depending on a client connecting).
  - Source: `apps/prompt-maker-cli/src/generate-command.ts` (transport events), surfaced by `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts`.
- **Screenshot:** `uat-S19-03-transport-events.png`.

- [ ] **Action:** Send a remote refinement command.
  - Preconditions: a transport client tool available.
  - Action example (pick one):
    - `nc -U /tmp/prompt-maker-cli.sock` then paste a line:
      - `{ "type": "refine", "instruction": "Make it shorter and add validation" }`
    - Then send:
      - `{ "type": "finish" }`
  - (The transport protocol is defined in `apps/prompt-maker-cli/src/generate-command.ts`.)
- **Expected Result:** TUI history logs `Interactive refine (iteration ...)` and subsequent iterations.
- **Screenshot:** `uat-S19-04-transport-refine.png`.

### 6.21 S20 — Media commands present but currently no-op

- [ ] **Action:** Confirm `/image` and `/video` appear in command palette.
  - Keys: `Ctrl+G`, scroll command list or type `im` / `vid`.
- **Expected Result:** Menu shows `/image` and `/video` as commands.
  - Source: `apps/prompt-maker-cli/src/tui/config.ts`.
- **Screenshot:** `uat-S20-01-image-video-in-menu.png`.

- [ ] **Action:** Execute `/image` and `/video` commands.
  - Keys:
    - `Ctrl+G`, type `image tmp-uat/example.png`, press `Enter`.
    - `Ctrl+G`, type `video tmp-uat/example.mp4`, press `Enter`.
- **Expected Result:** The current handler does not attach media; it will fall through to the default command selection message (e.g., `Selected image`).
  - Source: `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts` (no `case 'image'`/`case 'video'`).
- **Screenshot:** `uat-S20-02-image-video-noop.png`.

## 7. Edge Cases / Negative Tests

Run these after the main walkthrough; capture screenshots for each failure state.

- [ ] **Action:** Provider missing abort.
  - Preconditions: unset `OPENAI_API_KEY` (and remove config `openaiApiKey`), restart TUI.
  - Keys: attempt a generation.
- **Expected Result:** History logs `Generation aborted: OpenAI unavailable (...)`.
  - Source: `apps/prompt-maker-cli/src/tui/hooks/useGenerationPipeline.ts` (`ensureProviderReady`).
- **Screenshot:** `uat-N01-provider-missing-abort.png`.

- [ ] **Action:** Invalid URL input.
  - Preconditions: add URL `not-a-url` or `ftp://example.com` via `/url` popup.
  - Keys: run generation or series.
- **Expected Result:** URL resolver skips invalid/unsupported protocols; you should see progress messages for valid URLs only.
  - Source: `apps/prompt-maker-cli/src/url-context.ts`.
- **Screenshot:** `uat-N02-invalid-url-skipped.png`.

- [ ] **Action:** JSON + interactive (transport) restriction.
  - Preconditions: launch with `--interactive-transport`.
  - Keys: `json on`.
- **Expected Result:** TUI shows `JSON output is unavailable while interactive transport is enabled.`
  - Source: `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`.
- **Screenshot:** `uat-N03-json-transport-restriction.png`.

- [ ] **Action:** File context duplicate add.
  - Preconditions: add the same file glob twice.
  - Keys: add `tmp-uat/**/*.md` twice.
- **Expected Result:** Second add should log `Context file already added: ...`.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-N04-duplicate-file-context.png`.

- [ ] **Action:** Series intent empty submission.
  - Preconditions: open Series popup.
  - Keys: clear draft to empty; press `Enter`.
- **Expected Result:** History logs `Series intent cannot be empty.` and popup remains open.
  - Source: `apps/prompt-maker-cli/src/tui/hooks/usePopupManager.ts`.
- **Screenshot:** `uat-N05-series-empty.png`.

- [ ] **Action:** `/new` prompt expects y/n.
  - Preconditions: `/new` asked the reuse question.
  - Keys: type `maybe` and press `Enter`.
- **Expected Result:** History logs `[new] Please answer "y" or "n".`.
  - Source: `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`.
- **Screenshot:** `uat-N06-new-invalid-response.png`.

- [ ] **Action:** History popup empty state.
  - Preconditions: move/rename `~/.config/prompt-maker-cli/tui-history.json` and restart TUI.
  - Keys: open `/history`.
- **Expected Result:** Popup shows `No history saved`.
  - Source: `apps/prompt-maker-cli/src/tui/components/popups/ListPopup.tsx`, `apps/prompt-maker-cli/src/tui/command-history.ts`.
- **Screenshot:** `uat-N07-history-empty.png`.

## 8. Coverage Checklist

Use this as the final “did we hit everything?” audit.

### Commands (from `apps/prompt-maker-cli/src/tui/config.ts`)

- [ ] `/model`
- [ ] `/intent`
- [ ] `/instructions` and alias `/meta`
- [ ] `/new` and `/reuse`
- [ ] `/file`
- [ ] `/url`
- [ ] `/smart`
- [ ] `/image` (currently no-op)
- [ ] `/video` (currently no-op)
- [ ] `/polish`
- [ ] `/series`
- [ ] `/copy`
- [ ] `/chatgpt`
- [ ] `/json`
- [ ] `/tokens`
- [ ] `/reasoning` and alias `/why`
- [ ] `/history`
- [ ] `/test`
- [ ] `/exit`

### Popup types (from `apps/prompt-maker-cli/src/tui/types.ts` and `apps/prompt-maker-cli/src/tui/config.ts`)

- [ ] `model`
- [ ] `toggle` (polish/copy/chatgpt/json)
- [ ] `file` (with suggestions focus)
- [ ] `url`
- [ ] `history`
- [ ] `smart`
- [ ] `tokens`
- [ ] `reasoning` (scroll)
- [ ] `test`
- [ ] `intent`
- [ ] `instructions`
- [ ] `series`

### Keybindings and overlay rules

- [ ] `Ctrl+G` opens command palette (and switches to Generate from Tests)
- [ ] `Ctrl+T` switches to Test Runner
- [ ] `?` opens/closes help; help scroll works (↑/↓/PgUp/PgDn)
- [ ] `Esc` exits when no popup; `Esc` does NOT exit when a popup is open in Generate
- [ ] `Ctrl+C` exits
- [ ] History scrolling works in Generate (↑/↓/PgUp/PgDn) when not in command menu/popup/help

### Stateful constraints / combinations

- [ ] JSON ON shows JSON payload and disables TUI interactive refinement
- [ ] Interactive transport enabled blocks JSON toggle
- [ ] `/new` reuse prompt y/n flow works
- [ ] Provider chip shows `ok` and `missing-key` cases for OpenAI and Gemini
- [ ] URL context covers generic + GitHub tree + GitHub blob
- [ ] Smart context covers enabled/disabled and root override

### Test runner

- [ ] Generate-view `/test` run shows progress and summary
- [ ] Test Runner view run shows per-test status + summary + logs
