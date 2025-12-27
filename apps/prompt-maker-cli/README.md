# Prompt Maker CLI

Terminal-first interface for converting rough intent notes (and optional file/image context) into structured prompt contracts. The CLI now focuses exclusively on high-quality generation with optional polishing, JSON reasoning output, and built-in context tracking. A full Opencode-style TUI is available via `prompt-maker-cli ui`.

- **Stateful refinement** – interactive runs feed the previous draft + your latest instruction back to the model so it can edit the existing prompt.
- **Context injection** – attach additional files with `-c/--context` (glob-aware), mix in remote docs with `--url`, and images with `--image` (PNG/JPG/WEBP/GIF, up to 20 MB each). Use `--show-context` to dump the resolved `<file path="…">…</file>` blocks for easy copy/paste.
- **Token telemetry** – every run logs estimated input tokens and the size of each generated draft.
- **History logging** – each command appends a JSONL record to `~/.config/prompt-maker-cli/history.jsonl` so you never lose a run.
- **Separated reasoning** – models return `{ "reasoning": string, "prompt": string }`; set `DEBUG=1` (or `VERBOSE=1`) to stream the model’s reasoning to stderr.

## TUI theming

Inside the TUI (`prompt-maker-cli ui`):

- `/theme` opens the theme picker (↑/↓ previews, Enter confirms, Esc cancels).
- `/theme-mode` switches the appearance mode (`dark`, `light`, or `system`).

### Custom themes

Theme files are plain JSON. The theme name is the filename without `.json`.

- **Global** (per-user): `~/.config/prompt-maker-cli/themes/*.json`
- **Project-local**: `.prompt-maker-cli/themes/*.json` in your repo
  - Any parent directories are also scanned (walking up from the current working directory).

Quick start:

```bash
# Global install
mkdir -p ~/.config/prompt-maker-cli/themes
cp apps/prompt-maker-cli/src/tui/theme/examples/ocean-example.json ~/.config/prompt-maker-cli/themes/ocean.json

# Or project-local
mkdir -p .prompt-maker-cli/themes
cp apps/prompt-maker-cli/src/tui/theme/examples/ocean-example.json .prompt-maker-cli/themes/ocean.json
```

Restart the TUI, then run `/theme` and select `ocean`.

### Precedence

If multiple themes share the same name:

1. Project-local themes in the _nearest_ directory to your CWD (highest precedence)
2. Project-local themes in ancestor directories
3. Global themes (`~/.config/prompt-maker-cli/themes`)
4. Built-in themes (lowest precedence)

If you override a built-in theme by reusing its name, the built-in label is kept.

### Theme mode (`system`)

`system` is intentionally pragmatic:

- If `TERM_BACKGROUND` is set to `light`/`dark`, it is used.
- Else, we try to infer from `COLORFGBG`.
- If no reliable signal is present, we deterministically fall back to `dark`.
- Config also accepts `themeMode: "auto"` as an alias for `"system"`.

### Theme JSON format

A theme file has two top-level keys:

- `defs` (optional): named colors
- `theme`: the actual theme slots

An example you can copy is in:

- `apps/prompt-maker-cli/src/tui/theme/examples/ocean-example.json`

#### Slots

The TUI expects these slots (see `apps/prompt-maker-cli/src/tui/theme/theme-types.ts`):

- `background`, `text`, `mutedText`, `border`
- `accent`, `accentText`
- `warning`, `error`, `success`
- `panelBackground`, `popupBackground`
- `selectionBackground`, `selectionText`
- `chipBackground`, `chipText`, `chipMutedText`

#### Color value types

Each entry in `defs` and `theme` can be:

- **Hex:** `"#RRGGBB"`
- **Hex with alpha:** `"#RRGGBBAA"` (only `AA == "00"` becomes transparent; any other alpha is treated as opaque)
- **ANSI 0–255:** `42`
- **Reference:** `"someDef"` (resolves against `defs.someDef`, then `theme.someDef`)
- **Variant:** `{ "dark": <color>, "light": <color> }`
- **Special strings:** `"none"` / `"transparent"` (treated as “no color”)

#### Opencode compatibility

Some Opencode theme JSON files can be used directly: the loader will adapt common Opencode keys like `backgroundPanel`, `backgroundElement`, `textMuted`, and `primary` into Prompt Maker slots.

### Limitations vs Opencode

- Prompt Maker uses Ink, which cannot paint true “rectangular” backgrounds. Background colors only appear where characters are drawn, so popups/panels pad lines to create a filled look.
- Partial alpha blending (Opencode’s RGBA overlays) is not supported. Only fully transparent (`#RRGGBB00`) is treated as “no color”.

### Troubleshooting

- **My theme doesn’t show up in `/theme`**
  - Ensure the file ends in `.json` and is placed in `~/.config/prompt-maker-cli/themes/` or `.prompt-maker-cli/themes/`.
  - Restart the TUI after adding or editing theme files.
  - Remember the theme name is the filename (e.g. `ocean.json` → `ocean`).

- **Theme shows up but selecting it does nothing / falls back**
  - The JSON is likely failing validation or resolution (missing required slots, invalid hex, unknown reference, reference cycle).
  - Check for typos in slot names (must match the slots listed above).

- **I expected project-local to override global but it doesn’t**
  - Precedence is based on the nearest `.prompt-maker-cli/themes` directory to your current working directory.
  - If you launch the TUI from a different folder, the “nearest” project-local theme directory may change.

- **`system` mode doesn’t match my terminal appearance**
  - `system` only uses `TERM_BACKGROUND=light|dark` or a `COLORFGBG` heuristic.
  - If neither is present (or your terminal sets something unexpected), Prompt Maker falls back to `dark`.
  - Workaround: use `/theme-mode` and explicitly choose `dark` or `light`.

- **Backgrounds look “incomplete” compared to Opencode**
  - Ink can’t paint a true background layer behind empty cells; only drawn characters carry background color.
  - Popups/panels pad lines to create a filled look, but you may still see terminal background in areas we don’t draw.

## Build + global install

All commands assume you are at repo root (`/Users/eroberts/Projects/ai-lab`).

```bash
# 1) Build the CLI bundle (dist lives under apps/prompt-maker-cli/dist)
npx nx build prompt-maker-cli --skip-nx-cache

# 2) Install the freshly built package globally
npm uninstall -g @perceptron/prompt-maker-cli   # safe even if not installed
npm install -g apps/prompt-maker-cli/dist

# 3) Use the binary (or alias) anywhere
prompt-maker-cli "write a haiku about TypeScript" --model gpt-4o-mini
```

During development you can skip the global install and run directly:

```bash
node apps/prompt-maker-cli/dist/index.js "Draft a confident onboarding-bot spec" --model gemini-1.5-flash
```

> **Tip:** If you rely on an alias like `pmc`, make sure it resolves to `prompt-maker-cli` _after_ reinstalling. `which prompt-maker-cli` should point to your global npm prefix (e.g., `~/.nvm/versions/node/v22.15.0/bin`).

## Usage (CLI)

```bash
# Inline intent, token telemetry + clipboard handoff
prompt-maker-cli "Draft a confident onboarding-bot spec" \
  --model gpt-4o-mini \
  --context docs/spec/**/*.md \
  --image assets/wireframe.png \
  --copy

# Mix local files with remote docs/GitHub context
prompt-maker-cli "Summarize the Example docs" \
  --url https://example.com/docs \
  --url https://github.com/example/repo/tree/main/docs

# File-based generation with JSON capture and history logging
echo "Need travel app brief" > drafts/travel.md
prompt-maker-cli --intent-file drafts/travel.md --json > runs/travel.json
```

Key flags and behaviors:

| Flag / Input                                | Purpose                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `<intent>` / `--intent-file <path>` / stdin | Provide the rough intent text. Pipe stdin when automating.                                                        |
| `--context <glob>` (repeatable)             | Attach additional file(s) to the request; globs are resolved via `fast-glob`.                                     |
| `--url <https://...>` (repeatable)          | Download remote pages or GitHub repos/files and attach them as virtual context (`url:`/`github:` paths).          |
| `--show-context`                            | Print the resolved context files (same `<file …>` format) before generation for manual review/copying.            |
| `--context-file <path>`                     | Write the resolved context to disk (text by default, or JSON via `--context-format`).                             |
| `--context-format text\|json`               | Choose how `--show-context` and `--context-file` render the context payloads.                                     |
| `--smart-context-root <path>`               | Limit smart-context scanning to a specific directory (defaults to the current working directory).                 |
| `--image <path>` (repeatable)               | Inline images (PNG/JPG/WEBP/GIF ≤ 20 MB) as Base64 so vision-capable models can reference them.                   |
| `--model <name>`                            | Override the _generation_ model used by the CLI (OpenAI GPT or Gemini). Defaults can be set via config/env.       |
| `--target <name>`                           | Target/runtime model used for optimization (recorded in JSON/history, not included in the generated prompt text). |
| `-i, --interactive`                         | Enable the refine loop (TTY only). Each new note becomes a stateful edit of the previous prompt.                  |
| `--polish`, `--polish-model <name>`         | Run the finishing pass and optionally choose a different model for it.                                            |
| `--json`                                    | Emit machine-readable JSON (non-interactive). Includes `prompt`, optional `polishedPrompt`, iteration count, etc. |
| `--quiet`                                   | Suppress UI banners/spinners while still emitting JSON/stream events (ideal for editor integrations).             |
| `--stream none\|jsonl`                      | Emit newline-delimited JSON events describing context, uploads, iterations, and interactive states.               |
| `--context-template <name>`                 | Wrap the final prompt using a named template (supports built-ins like `nvim` or custom config entries).           |
| `--interactive-transport <path>`            | Listen on a Unix socket/Windows named pipe for refine/finish commands while streaming events to the client.       |
| `--copy`, `--open-chatgpt`                  | Copy/open the final (possibly polished) artifact for quick sharing.                                               |
| `--no-progress`                             | Disable the stderr spinner (useful when `--json` is scripted).                                                    |
| `--help`                                    | Show the auto-generated Yargs help text.                                                                          |

Additional behaviors:

- Every run prints **Context Size** (approximate input tokens) and each draft shows `Generated prompt [N tokens]`.
- Interactive sessions reuse the latest prompt by passing it as `previousPrompt` plus your newest `Refinement Instruction`, so edits feel consistent.
- Setting `DEBUG=1` or `VERBOSE=1` prints the model’s reasoning (from the `reasoning` JSON field) to stderr after each call.
- Each completed run is saved to `~/.config/prompt-maker-cli/history.jsonl` with a timestamp, so you can reconstruct past prompts or feed them into analytics.
- `--show-context` dumps the resolved `<file …>` blocks to stdout (or stderr when `--json`) so you can copy the exact context into another assistant, while `--context-file` + `--context-format` capture the same payload for tooling; add `--smart-context-root <path>` when your embeddings should start from a different directory.
- Styled telemetry banners, progress spinners, and Enquirer-powered refinement prompts make interactive mode easier to scan and drive.
- `--quiet` suppresses purely cosmetic output (boxes, success ticks, clipboard/browser confirmations) while still surfacing warnings, errors, JSON payloads, and streaming events—perfect for editor integrations.

## Context templates

Use `--context-template <name>` to wrap the final prompt with editor-specific guidance. Templates can include the placeholder `{{prompt}}`; if it’s missing, the CLI appends the generated prompt after the template body with a blank line. Built-ins currently include:

- `nvim` – prepends a scratch-buffer header so you can paste straight back into a NeoVim split.

Add your own templates under `contextTemplates` in `~/.config/prompt-maker-cli/config.json` (or any supported config path):

```json
{
  "promptGenerator": { "defaultModel": "gemini-1.5-flash" },
  "contextTemplates": {
    "scratch": "Paste into scratch buffer for teammates",
    "obsidian": "# Prompt Vault\n\n{{prompt}}"
  }
}
```

When a template is active the CLI still emits the raw `prompt`, but also records the rendered text plus template name in both `--json` output and `history.jsonl`. Combine this with `--quiet` + `--stream jsonl` to keep editor buffers tidy while still tracking progress.

## Structured streaming & transports

- `--stream jsonl` writes newline-delimited JSON events to stdout covering context telemetry, URL/smart-context progress, upload state changes, iteration boundaries, interactive states, and the final summary payload.
- `--interactive-transport /tmp/pmc.sock` (or a Windows named pipe) turns the CLI into a socket server: the client sends `{"type":"refine","instruction":"..."}` or `{"type":"finish"}` messages and receives the same JSONL event stream over the connection. Transport lifecycle events (`transport.listening`, `transport.client.connected`, `transport.client.disconnected`) mirror socket activity.
- Pairing the two lets editors follow progress in a scratch buffer while driving refinements without hijacking stdin/stdout.

## TUI mode (Opencode-style)

Launch the guided terminal UI instead of the classic flag-only workflow:

```bash
# Default generate view
prompt-maker-cli ui

# Launch with an interactive transport socket
prompt-maker-cli ui --interactive-transport /tmp/pmc.sock
```

Key concepts:

- **Views & navigation** – use `Ctrl+G` for the Generate workspace and `Ctrl+T` for the Test Runner. Inside the Generate view, `Tab`/`Shift+Tab` moves across Intent, Model, Context panes, Media attachments, and Actions.
- **Intent & model entry** – the left column mirrors Opencode’s editable panels. Type intent/model, then press `g` or `Enter` from the Actions section to run.
- **Context & media management** – right-side panels let you add/remove file globs, URLs (including GitHub paths), smart context toggles/root, images, and videos. Keyboard shortcuts (`f`, `u`, `s`, `e`, `v`) focus each pane.
- **Interactive refinement** – toggle local refinement with `r` (or provide `--interactive-transport` to accept remote commands). The refinement timeline shows each iteration, remote transport status, and inline prompts for instructions. Remote runs stream events to both the TUI and the connected socket.
- **Target model command** – type `/target` to pick the runtime model the generated prompt should be optimized for (distinct from the generation `/model`).
- **JSON command** – type `/json on` (or select JSON from the command menu) to emit the same machine-readable payload as `--json` without leaving the TUI; the payload is also rendered in the history panel for copy/paste. `/json off` restores standard output, and JSON mode is disabled automatically when an interactive transport is active.
- **Telemetry & logs** – upload/progress lines, smart-context warnings, and transport status appear under Actions. Errors (missing credentials, URL failures, etc.) surface in-place and continue to emit console warnings for automation.
- **Test Runner** – switch to the Test view (Ctrl+T) to enter a YAML file, run suites, and watch test rows update live. Recent warnings and failures are mirrored in the log panel to keep Opencode-style feedback consistent.

All JSON/JSONL outputs, history logging, and clipboard/ChatGPT behaviors remain identical to the CLI. The TUI is optional: scripts and automations can continue calling `prompt-maker-cli` directly.

## JSON payload example

```json
{
  "intent": "Draft a confident onboarding-bot spec",
  "model": "gpt-4o-mini",
  "targetModel": "gpt-4o-mini",
  "prompt": "(Role/Context/Constraints...)",
  "polishedPrompt": "(tightened version)",
  "refinements": [],
  "iterations": 1,
  "interactive": false,
  "timestamp": "2025-11-30T22:10:07.123Z"
}
```

When `--context-template` is active the payload also includes `contextTemplate` and `renderedPrompt` fields, allowing editor clients to consume the wrapped output while still preserving the base prompt.

When `DEBUG` is set the CLI also logs:

```
--- AI Reasoning ---
1. Read context files …
2. Emphasize TypeScript lint rules …
--------------------
```

## Working with context + images

```bash
prompt-maker-cli \
  "Create onboarding bot spec" \
  --context drafts/spec.md \
  --context src/**/*.ts \
  --image assets/ui-flow.png \
  --model gemini-1.5-flash
```

- Context globs are resolved with `fast-glob` (`dot: true`) so you can pass `src/**/*.{ts,tsx}` etc.
- Each matching file is embedded as `<file path="…">…</file>` for the model.
- Remote docs are supported via `--url`. Plain webpages are cleaned into readable text and mounted as `url:https://…` files; GitHub `blob`, `tree`, and root URLs expand into `github:owner/repo/...` entries while respecting lockfile/node_modules ignores and 64 KB-per-file caps.
- Images are Base64 encoded and sent using the provider’s native multimodal format (OpenAI `image_url`, Gemini `inlineData`). Files over 20 MB or unsupported extensions are skipped with a warning.

## Interactive refinement snapshot

```
AI Prompt Generator
────────────────────
Generated prompt [42 tokens]:
(...)
Refine? (y/n): y
Describe the refinement. Submit an empty line to finish.
> Add telemetry and mention TypeScript strict mode.
>
AI Prompt Generator
────────────────────
Generated prompt (iteration 2) [57 tokens]:
(... updated contract ...)
Refine? (y/n): n
```

Behind the scenes iteration 2 passed `previousPrompt` + `Refinement Instruction` through the Chain-of-Thought JSON prompt so the model edits the earlier draft rather than regenerating from scratch.

## Global history + auditing

- `~/.config/prompt-maker-cli/history.jsonl` receives one line per run (the same structure as `--json`).
- If an entry fails to parse, the CLI warns but still prints the prompt; you can replay runs by feeding the JSONL back into your tooling.
- Combine with `jq` or `sqlite-utils insert` to analyze past prompts.

## Provider configuration

Put defaults and secrets in `~/.config/prompt-maker-cli/config.json`:

```json
{
  "openaiApiKey": "sk-...",
  "geminiApiKey": "gk-...",
  "promptGenerator": {
    "defaultModel": "gemini-1.5-flash"
  }
}
```

Env vars (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `GEMINI_API_KEY`, `GEMINI_BASE_URL`) override the config file.

## Automation recipes

| Pattern               | Command                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Stdin → JSON artifact | <code>cat drafts/intent.md \<br>prompt-maker-cli --model gpt-4o-mini --json > runs/intent-001.json</code> |
| Clipboard-only        | `prompt-maker-cli "Draft H1 spec" --copy > /dev/null`                                                     |
| Globals with images   | `prompt-maker-cli --intent-file briefs/app.md --image assets/wire.png --json`                             |
| Silence spinner       | `prompt-maker-cli ... --json --no-progress`                                                               |
| Analyze history       | `tail -n 20 ~/.config/prompt-maker-cli/history.jsonl \| jq .intent`                                       |

## NeoVim / editor integrations

- Prefer `--json` + `jq -r '.polishedPrompt // .prompt'` when populating buffers.
- Launch `--interactive` inside terminal splits to drive refinements; only the final artifact is copied/opened.
- Keep `history.jsonl` synced (e.g., `tail -f`) to provide “recent prompts” pickers.
- For a command-only transport channel (zero extra stdout noise), run the CLI via:

  ```bash
  prompt-maker-cli "Draft README polish" \
    --quiet \
    --stream jsonl \
    --context-template nvim \
    --context-file /tmp/pmc-context.json \
    --interactive-transport /tmp/pmc.sock
  ```

  The plugin can tail the JSONL stream (or socket) for progress while reading the rendered prompt from `/tmp/pmc-context.json` or the final JSON payload.

With context ingestion, image support, token telemetry, and JSON reasoning, `prompt-maker-cli` is ready for both terminal workflows and editor integrations. Build + install from repo root, run via `prompt-maker-cli` (or your alias), and enjoy reliable prompt contracts with full audit trails.
