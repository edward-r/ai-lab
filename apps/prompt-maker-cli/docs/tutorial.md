# Prompt Maker CLI Tutorial (Generate Edition)

The CLI now revolves around a single **Generate** workflow enhanced with stateful refinements, image/file context, token telemetry, and automatic history logging. This guide walks you through installation, day-to-day usage, and automation patterns.

## 1. Prerequisites

- Node.js 18+ (the repo uses `nvm`—`nvm use` / `nvm install` if needed).
- `npm install` at repo root to pull workspace deps.
- Provider credentials via env or config:
  - `OPENAI_API_KEY` (and optional `OPENAI_BASE_URL`).
  - `GEMINI_API_KEY` (and optional `GEMINI_BASE_URL`).
- Optional config file at `~/.config/prompt-maker-cli/config.json` (see §8).
- Familiarity with piping/redirecting output (`jq`, `tee`, etc.) helps when automating.

## 2. Build + install flow

```bash
# From repo root
npx nx build prompt-maker-cli --skip-nx-cache
npm uninstall -g @perceptron/prompt-maker-cli   # safe if missing
npm install -g apps/prompt-maker-cli/dist

# Or run locally without global install
node apps/prompt-maker-cli/dist/index.js "Draft onboarding bot spec" --model gpt-4o-mini
```

Because the global binary is named `prompt-maker-cli`, many users add `alias pmc=prompt-maker-cli` to their shell config. Re-run the commands above whenever you modify the CLI.

## 3. CLI anatomy at a glance

`prompt-maker-cli` exposes one entry point with an optional polish pass:

| Flag / Input                                | Description                                                       |
| ------------------------------------------- | ----------------------------------------------------------------- |
| `<intent>` / `--intent-file <path>` / stdin | Provide the rough intent text.                                    |
| `-c, --context <glob>`                      | Attach file context (globs resolved via `fast-glob`). Repeatable. |
| `--image <path>`                            | Attach PNG/JPG/JPEG/WEBP/GIF (≤ 20 MB). Repeatable.               |
| `--model <name>`                            | Override the generation model (OpenAI/Gemini).                    |
| `-i, --interactive`                         | Enable stateful refinement loop (TTY).                            |
| `--polish`, `--polish-model <name>`         | Run an optional finishing pass.                                   |
| `--json`                                    | Emit JSON payload (non-interactive).                              |
| `--copy`, `--open-chatgpt`                  | Copy/open the final artifact.                                     |
| `--no-progress`                             | Silence the spinner when `--json` is set.                         |
| `--help`                                    | Show auto-generated help.                                         |

Every run prints estimated input tokens (`Context Size`) and the size of each generated prompt (`Generated prompt [N tokens]`). All invocations append a JSONL record to `~/.config/prompt-maker-cli/history.jsonl` with timestamps, intent, iterations, etc.

## 4. Quick-start pipeline

```bash
# 1) Build (once per change)
npx nx build prompt-maker-cli --skip-nx-cache

# 2) Run generator with context + JSON capture
cat docs/intent.md \
  | prompt-maker-cli --model gemini-1.5-flash \
      --context src/**/*.{ts,tsx} \
      --image assets/wireframe.png \
      --json \
  > runs/intent-001.json

# 3) Extract final prompt
jq -r '.polishedPrompt // .prompt' runs/intent-001.json > prompts/intent.md
```

During JSON runs the CLI writes a spinner to stderr; add `--no-progress` if you require silent stderr.

## 5. Statefully refining prompts

Interactive mode keeps the latest prompt and feeds it back as `previousPrompt`, plus your new instruction:

```bash
prompt-maker-cli --intent-file drafts/onboarding-notes.md --interactive --model gpt-4o-mini
```

Transcript excerpt:

```
AI Prompt Generator
────────────────────
Generated prompt [43 tokens]:
(...)
Refine? (y/n): y
Describe the refinement. Submit an empty line to finish.
> Emphasize telemetry + TypeScript strict mode.
>
Generated prompt (iteration 2) [58 tokens]:
(... updated contract ...)
Refine? (y/n): n
```

- New instructions stack; iteration 3 sees iterations 1–2 plus your latest notes.
- `DEBUG=1` or `VERBOSE=1` prints the model’s JSON `reasoning` to stderr.
- `--copy` / `--open-chatgpt` trigger only once the session ends (polished prompt if available).

## 6. Working with context + images

```bash
prompt-maker-cli \
  "Create onboarding bot spec" \
  --context drafts/spec.md \
  --context src/**/*.ts \
  --image assets/ui-flow.png \
  --model gemini-1.5-flash
```

- File globs respect hidden files (`dot: true`). Each resolved path becomes a `<file path="…">…</file>` block in the user message.
- Images are checked for extension + size, converted to Base64, and sent via provider-specific multimodal payloads (OpenAI `image_url`, Gemini `inlineData`). Unsupported or oversize files log a warning and are skipped.

## 7. Token telemetry + history

- The CLI logs `Context Size` (intent + files) before generation and appends `[NN tokens]` to each prompt.
- Every invocation (regardless of `--json`) writes a JSONL record to `~/.config/prompt-maker-cli/history.jsonl`. Each entry matches the `--json` schema (intent, model, iterations, timestamps, optional `polishedPrompt`).
- Tail or import that file to audit past prompts:
  ```bash
  tail -n 20 ~/.config/prompt-maker-cli/history.jsonl | jq '.intent'
  ```

## 8. Polish pass + JSON structure

`--polish` reuses the generated contract and passes it through a constrained “tighten wording” prompt. Default behavior uses the same model as generation, but you can override it:

```bash
prompt-maker-cli --intent-file drafts/onboarding-notes.md \
  --model gemini-1.5-flash \
  --polish --polish-model gpt-4o-mini \
  --json \
  | jq -r '.polishedPrompt // .prompt'
```

All generation responses are valid JSON objects with two keys:

```json
{
  "reasoning": "Step-by-step analysis …",
  "prompt": "Final prompt text …"
}
```

If parsing fails (e.g., a provider hiccup), the CLI logs a warning and returns the raw text so you are never blocked.

## 9. Provider configuration

`~/.config/prompt-maker-cli/config.json` allows you to store credentials and defaults:

```json
{
  "openaiApiKey": "sk-...",
  "geminiApiKey": "gk-...",
  "promptGenerator": {
    "defaultModel": "gemini-1.5-flash"
  }
}
```

Env vars override config values. You can also set `PROMPT_MAKER_CLI_CONFIG=/path/custom.json` to point elsewhere.

## 10. Automation + editor notes

- **JSON-to-Markdown:** `prompt-maker-cli --json … | jq -r '.polishedPrompt // .prompt' > prompts/final.md`
- **Clipboard-only:** `prompt-maker-cli "Draft H1 spec" --copy > /dev/null`
- **Silence spinner:** append `--no-progress` when scripting with `--json`.
- **NeoVim integration:** run `prompt-maker-cli --json` inside a job, pipe `.prompt`/`.polishedPrompt` into buffers, or keep `history.jsonl` open for “recent prompts” pickers.

With context ingestion, multimodal support, token telemetry, and automatic logging, you can safely rely on `prompt-maker-cli` for repeatable prompt contracts across terminals, scripts, and editors. Build from repo root, install globally from `apps/prompt-maker-cli/dist`, and you’re ready to go.
