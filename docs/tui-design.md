# Prompt Maker CLI → Opencode-Style TUI Design

## Goals & Constraints

- Preserve existing CLI entrypoints (`generate`, `expand`, `test`) and every documented flag, output format, and side effect (JSON/JSONL streaming, clipboard copy, ChatGPT launch, history logging, etc.).
- Offer a guided terminal UI that mirrors Opencodes interaction model: multi-pane layout, command palette, keybind layer, contextual toasts/dialogs, and session-based navigation.
- Keep business logic (intent resolution, context assembly, generation/test workflows) reusable so both the legacy CLI and the new TUI invoke the same services.
- Support non-interactive automation by falling back to current behavior whenever the TUI layer is bypassed.

## Current CLI UX Summary

### Entry & Routing (`apps/prompt-maker-cli/src/index.ts`)

- Shebang entry dispatches to `runGenerateCommand` by default; `test` switch routes to `runTestCommand`.
- `generate` accepts positional intent or `--intent-file`, with aliases (`expand`).
- `test` expects an optional YAML file path (defaults to `prompt-tests.yaml`).

### Generate Command Overview (`generate-command.ts`)

1. **Argument parsing** (≈30 options)
   - Intent sources: positional, `--intent-file`, stdin, or inline file detection after `-i`.
   - Context inputs: `--context` globs, `--url`, `--image`, `--video`, `--smart-context`, `--smart-context-root`.
   - Output behavior: `--json`, `--stream jsonl`, `--quiet`, `--progress`, `--show-context`, `--context-format`, `--context-file`, `--context-template`.
   - Workflow toggles: `--interactive`, `--interactive-transport`, `--polish`, `--polish-model`, `--copy`, `--open-chatgpt`.
2. **Intent + context resolution**
   - Validates exclusivity (`intent` vs `--intent-file`).
   - Reads stdin fallback, enforces max file size, warns when inline intent looks like a path after `-i`.
   - Resolves globbed files, URL fetches (with progress callbacks), smart-context embeddings, and optional template rendering.
3. **Telemetry & state**
   - Builds token table (intent vs files) with `boxen` + `cli-table3`.
   - Emits structured events via `--stream jsonl` (context telemetry, progress, uploads, iterations, interactive milestones, transport lifecycle, final payload).
4. **Generation loop**
   - Calls `PromptGeneratorService.generatePrompt`, optionally iterating via interactive TTY prompts or socket transport.
   - Handles uploads for images/video with per-file events.
5. **Post-processing**
   - Optional polish pass via `callLLM` with dedicated system prompt.
   - Optional clipboard copy (`clipboardy`) and ChatGPT launch (`open`).
   - History logging via `appendToHistory`.
   - JSON payload includes intent, model, refinements, iterations, context metadata, rendered template, etc.
6. **Interactive refinement UX**
   - `enquirer` confirm/input prompts loop, or remote commands piped through `InteractiveTransport` (named pipe/socket with lifecycle hooks, event taps, and cancellation handling).
   - Progress spinners suppressed in JSON/quiet modes; streaming integrations piggyback on `StreamDispatcher` taps.

### Test Command Overview (`test-command.ts`)

1. **Argument parsing** – single optional file path.
2. **Suite loading** – YAML parse, schema validation via `parsePromptTestSuite`.
3. **Execution flow**
   - For each test: resolve file context + optional smart context, assemble `PromptGenerationRequest`, call generator, then judge via `evaluatePrompt`.
   - Progress reporter adapts to TTY vs non-TTY (progress bar vs line logs).
4. **Results** – Prints PASS/FAIL per test and sets `process.exitCode` on failures.

### Supporting Utilities (selected)

- `file-context.ts`: globbing + formatting for prompt inclusion.
- `url-context.ts`: fetch URLs with streaming progress updates.
- `smart-context-service.ts`: local embedding search and progress callbacks.
- `history-logger.ts`: appends JSON payloads for auditing.
- `token-counter.ts`: shared token math for telemetry + display.
- `image-loader.ts` / `media-loader.ts`: convert image paths to OpenAI refs, upload Gemini videos with progress hooks.

## UX Pain Points (Today)

- Discoverability: dozens of flags buried in `--help`; no visual grouping of intent, context, or output settings.
- Context inspection requires `--show-context` or manually opening saved files.
- Interactive refinement relies on modal prompts lacking history, diffing, or keyboard shortcuts.
- Progress info (spinners, console logs) competes with prompt outputs; JSONL consumers must parse raw lines.
- Test runs provide minimal navigation—no way to drill into failing prompts without re-running verbose logs.

## Proposed Opencode-Style TUI Architecture

1. **Process model**
   - New `prompt-maker-cli ui` (or `--ui`) command spawns a TUI loop.
   - CLI thread boots core services (config, generator) and hands them to a renderer layer (likely `ink`, `react-blessed`, or `@opentui/core` analog) inspired by Opencodes provider stack: routing, keybinds, toasts, dialogs, history, SDK-style event bus.
   - Legacy CLI path continues to call `runGenerateCommand`/`runTestCommand` directly.

2. **State & service separation**
   - Extract reusable domain services (intent resolver, context assemblers, generation/test orchestrators) so TUI screens can call them via async handlers while the CLI wrappers keep backwards compatibility.
   - Mirror Opencode contexts: `ArgsProvider` → CLI args, `SessionProvider` → active generation/test session, `KeybindProvider` → customizable shortcuts, `ToastProvider` → status messages, `DialogProvider` → modal prompts.

3. **Screen map**
   - **Home / Launcher**: Quick actions (Generate Prompt, Run Tests, View History). Displays current config, model defaults, and hints (similar to Opencode home route with animated header + prompt entry).
   - **Intent Composer Screen**: Center textarea with pastable intent, file picker sidebar showing drop targets for `--intent-file` or stdin detection. Keybinds: `Ctrl+Enter` submit, `Esc` to return home, `Cmd+O` open file.
   - **Context Board**: Split panes for Files, URLs, Smart Context suggestions, and Media (images/video). Each pane lists items with badges for source type; toggles map to CLI flags. Keybinds: `c` focus files, `u` URLs, `s` smart context, `m` media.
   - **Model & Options Drawer**: Right-side sheet listing model selection, polish toggle, streaming/JSON output, context templates, clipboard/ChatGPT toggles. Use command palette (`⌘K` / `Ctrl+K`) to search flags.
   - **Telemetry & Progress Panel**: Inspired by Opencode session sidebar header—shows token counts, upload queue, current scope (URL fetch, smart context, generate, polish). Streams events to log view for `--stream jsonl` parity.
   - **Interactive Refinement Workspace**: Timeline view (like Opencode session) showing iterations vertically: each card contains prompt diff, refinement instruction, tokens. Inline controls to add refinement (`r`), accept prompt (`Enter`), open command palette for advanced actions (copy, template render, share, open ChatGPT).
   - **Output Inspector**: Tabbed view for Raw Prompt, Polished Prompt, Context Template Render, JSON payload. Supports copy, export, open-in-editor with dedicated keybinds.
   - **History & Clipboard Screen**: Reads from `history-logger` store to show previous runs, searchable by intent/model.
   - **Test Runner Dashboard**: Table of suites on left, test list with pass/fail chips, detail panel for selected test (intent, context, expectation, last run result). Live progress bar matches Opencode session footer conventions; failures surface toasts and allow rerun (`r`) or open generated prompt (`o`).

4. **Navigation & Keybinds (Opencode-inspired)**
   - `Ctrl+K` / `Cmd+K`: Command palette listing every flag/flow.
   - `Tab` / `Shift+Tab`: Cycle focus across panes (Intent → Context → Options → Telemetry).
   - `g` then `r`: Quick generate run (mirroring leader-based combos).
   - `t` then `r`: Jump to Test Runner.
   - `?`: Open help dialog summarizing shortcuts and equivalent CLI flags.
   - `:`: Open action prompt (enter `stream on`, `json off`, etc.) to toggle advanced flags without leaving the screen.
   - `Esc`: Dismiss dialogs/toasts, back navigation consistent with Opencodes `ExitProvider` semantics.

5. **Eventing & Output Preservation**
   - Stream dispatcher reused inside TUI; events feed a log pane and optionally emit JSONL to stdout when `--stream jsonl` enabled, ensuring automation compatibility.
   - Clipboard/ChatGPT actions become command palette entries and footer buttons, still invoking `maybeCopyToClipboard` / `maybeOpenChatGpt` under the hood.
   - Context template rendering previewed inline while still writing to files when `--context-file` is set.

6. **Testing Integration**
   - Running suites shows per-test progress in sidebar, aggregated stats in header, and detailed failure dialogs akin to Opencode session dialog components.
   - Support rerun-with-changes by opening a mini intent/context editor for the failing test before rerunning.

## CLI → TUI Mapping

| Existing CLI Flow / Flag                                   | TUI Surface                                 | Proposed Interaction / Keybind                                             | Notes                                                                                                            |
| ---------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Positional intent / `--intent-file` / stdin                | Intent Composer screen                      | File picker (`o`), paste buffer (`Ctrl+V`), detect piped input auto-insert | Keep validation + file size checks via shared service.                                                           |
| `--context` globs & `--show-context`                       | Context Board (Files pane) + preview modal  | `c` to focus files, space to toggle inclusion, `Enter` to preview          | `--context-file` save exposed as footer action.                                                                  |
| `--url` context                                            | Context Board (URLs pane) with fetch status | `u` to add URL, showing progress badges                                    | Maintains progress callbacks + event stream.                                                                     |
| `--smart-context` (+ root)                                 | Smart Suggestions pane                      | `s` toggles smart context; panel lists candidates with similarity scores   | Allows selective inclusion before run.                                                                           |
| `--image` / `--video`                                      | Media pane with thumbnails/status           | `m` to add attachments, show upload progress                               | Upload state events feed telemetry panel.                                                                        |
| `--interactive` loop                                       | Iteration timeline workspace                | `r` to add refinement, `Shift+Enter` to accept final                       | Transport mode (`--interactive-transport`) surfaces as connection status widget; same event bus feeds timeline.  |
| `--json`, `--stream jsonl`, `--quiet`, `--progress`        | Options drawer & command palette toggles    | Quick switches (e.g., type `json on`)                                      | Respect existing output semantics; when JSON mode enabled, UI warns that only machine-readable output will emit. |
| `--context-template`, `--context-format`, `--context-file` | Template tab + export button                | `Ctrl+E` to export, dropdown to pick template                              | Shows built-in/custom templates with preview before render.                                                      |
| `--polish`, `--polish-model`                               | Options drawer                              | `p` toggles polish, model selector in command palette                      | Polished output tab updates when run completes.                                                                  |
| `--copy`, `--open-chatgpt`                                 | Footer quick actions                        | Buttons & keybinds (`y` copy, `o` open)                                    | Reuse existing helpers.                                                                                          |
| `prompt-maker-cli test [file]`                             | Test Runner dashboard                       | `t` from home to open, `r` rerun suite, `Enter` inspect test               | Maintains YAML parsing + exit codes.                                                                             |
| History logging (`appendToHistory`)                        | History screen                              | `h` to open, filter by intent/model                                        | Reads same storage to avoid duplication.                                                                         |
| JSON payload output                                        | Output Inspector (JSON tab)                 | `j` to toggle JSON view, `Cmd+S` export                                    | Mirrors CLI structure for tooling parity.                                                                        |
| Streaming events                                           | Event log pane                              | Shows context telemetry, progress, uploads, iteration start/complete       | When `--stream jsonl`, still write to stdout while UI pane mirrors data.                                         |

## Implementation Outlook

- Short term: create `docs/tui-design.md` (this document), refactor argument parsing + workflows into reusable services, scaffold a TUI entry mode that mounts these screens progressively.
- Long term: align with Opencodes provider stack (args, route, sdk, sync, keybind, dialog, toast) to ensure deterministic, keyboard-first UX and easy maintenance.
