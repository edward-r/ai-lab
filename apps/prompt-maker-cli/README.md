# Prompt Maker CLI

Terminal-first interface for converting rough intent notes (and optional file/image context) into structured prompt contracts. The CLI now focuses exclusively on high-quality generation with optional polishing, JSON reasoning output, and built-in context tracking.

- **Stateful refinement** – interactive runs feed the previous draft + your latest instruction back to the model so it can edit the existing prompt.
- **Context injection** – attach additional files with `-c/--context` (glob-aware), mix in remote docs with `--url`, and images with `--image` (PNG/JPG/WEBP/GIF, up to 20 MB each). Use `--show-context` to dump the resolved `<file path="…">…</file>` blocks for easy copy/paste.
- **Token telemetry** – every run logs estimated input tokens and the size of each generated draft.
- **History logging** – each command appends a JSONL record to `~/.config/prompt-maker-cli/history.jsonl` so you never lose a run.
- **Separated reasoning** – models return `{ "reasoning": string, "prompt": string }`; set `DEBUG=1` (or `VERBOSE=1`) to stream the model’s reasoning to stderr.

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

## Usage

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
| `--model <name>`                            | Override the generation model (OpenAI GPT or Gemini). Defaults can be set via config/env.                         |
| `-i, --interactive`                         | Enable the refine loop (TTY only). Each new note becomes a stateful edit of the previous prompt.                  |
| `--polish`, `--polish-model <name>`         | Run the finishing pass and optionally choose a different model for it.                                            |
| `--json`                                    | Emit machine-readable JSON (non-interactive). Includes `prompt`, optional `polishedPrompt`, iteration count, etc. |
| `--quiet`                                   | Suppress UI banners/spinners while still emitting JSON/stream events (ideal for editor integrations).             |
| `--context-template <name>`                 | Wrap the final prompt using a named template (supports built-ins like `nvim` or custom config entries).           |
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

## JSON payload example

```json
{
  "intent": "Draft a confident onboarding-bot spec",
  "model": "gpt-4o-mini",
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

| Pattern                                                             | Command                                                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------- |
| Stdin → JSON artifact                                               | `cat drafts/intent.md \                                                       |
| prompt-maker-cli --model gpt-4o-mini --json > runs/intent-001.json` |
| Clipboard-only                                                      | `prompt-maker-cli "Draft H1 spec" --copy > /dev/null`                         |
| Globals with images                                                 | `prompt-maker-cli --intent-file briefs/app.md --image assets/wire.png --json` |
| Silence spinner                                                     | `prompt-maker-cli ... --json --no-progress`                                   |
| Analyze history                                                     | `tail -n 20 ~/.config/prompt-maker-cli/history.jsonl                          | jq .intent` |

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
