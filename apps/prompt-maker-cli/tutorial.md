# Prompt Maker CLI Tutorial

## Overview

Prompt Maker CLI converts free-form intent into production-ready prompts, with optional interactive refinement, polishing, and automated testing to keep prompt contracts consistent (`apps/prompt-maker-cli/src/index.ts:6`, `apps/prompt-maker-cli/src/prompt-generator-service.ts:8`). It orchestrates OpenAI or Gemini models, attaches structured context (files, images, video), and can judge prompts against YAML-defined expectations.

## Installation

```bash
npm install -g prompt-maker-cli
```

The binary is exposed as `prompt-maker-cli`; calling it without a subcommand runs the `generate` workflow (alias `expand`) while `prompt-maker-cli test` drives the test runner (`apps/prompt-maker-cli/src/index.ts:6`). Use any modern Node.js (18+) runtime that supports ES modules.

## Configuration

Prompt Maker reads credentials and defaults from environment variables first, then from `~/.config/prompt-maker-cli/config.json` (or `~/.prompt-maker-cli.json`), and finally from a custom path supplied via `PROMPT_MAKER_CLI_CONFIG` (`apps/prompt-maker-cli/src/config.ts:20`). Supported keys:

```json
{
  "openaiApiKey": "sk-...",
  "openaiBaseUrl": "https://api.openai.com/v1",
  "geminiApiKey": "xxx",
  "geminiBaseUrl": "https://generativelanguage.googleapis.com",
  "promptGenerator": {
    "defaultModel": "gpt-4o-mini",
    "defaultGeminiModel": "gemini-3-pro-preview"
  }
}
```

Credential resolution order:

- `OPENAI_API_KEY` / `OPENAI_BASE_URL`
- `GEMINI_API_KEY` / `GEMINI_BASE_URL`
- Matching keys inside the config file (`apps/prompt-maker-cli/src/config.ts:57`).

Model selection:

- Generation defaults to `promptGenerator.defaultModel`, then `PROMPT_MAKER_GENERATE_MODEL`, then `gpt-4o-mini` (`apps/prompt-maker-cli/src/prompt-generator-service.ts:106`).
- Polishing defaults to the generation model unless `PROMPT_MAKER_POLISH_MODEL` or `--polish-model` overrides it (`apps/prompt-maker-cli/src/generate-command.ts:169`).
- Video automatically switches to `promptGenerator.defaultGeminiModel` or `gemini-3-pro-preview` if a non-Gemini model was chosen (`apps/prompt-maker-cli/src/generate-command.ts:131` and `:354`).

## Basic Usage: Generating a Prompt

```bash
prompt-maker-cli "Summarize customer support tickets into bullet points"
```

- `generate`/`expand` is the default command; use `prompt-maker-cli generate ...` explicitly if you prefer (`apps/prompt-maker-cli/src/index.ts:24`).
- Each run sends your intent (plus context/media) through a meta-prompt that asks the LLM to return JSON with `reasoning` and `prompt`; the CLI prints only the final prompt but logs reasoning when `DEBUG` or `VERBOSE` is set (`apps/prompt-maker-cli/src/prompt-generator-service.ts:8` and `:86`).
- Token estimates for intent + context are printed before the prompt, with severity labels such as “Medium” or “High” based on thresholds defined in `formatTokenCount` (`apps/prompt-maker-cli/src/generate-command.ts:488` and `apps/prompt-maker-cli/src/token-counter.ts:23`).
- A spinner tracks progress unless you disable it via `--progress=false` or enter interactive mode (`apps/prompt-maker-cli/src/generate-command.ts:147` and `:259`).

## Providing Intent

You must choose exactly one input source (`apps/prompt-maker-cli/src/generate-command.ts:363`).

| Method         | Command                                             | Notes                                                                                                                         |
| -------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Positional arg | `prompt-maker-cli "Draft a release note"`           | Fastest path.                                                                                                                 |
| File           | `prompt-maker-cli --intent-file intents/support.md` | Files larger than 512 KB or binary (null bytes) are rejected (`apps/prompt-maker-cli/src/generate-command.ts:30` and `:370`). |
| Stdin          | `cat intents/support.md \| prompt-maker-cli`        | Used when no arg or `--intent-file` is provided (`apps/prompt-maker-cli/src/io.ts:1`).                                        |

Empty inputs trigger `Intent text is required...` (`apps/prompt-maker-cli/src/generate-command.ts:398`).

## Adding Context Files

Attach supporting files with `--context` / `-c`, repeating the flag or using glob patterns:

```bash
prompt-maker-cli -c "src/**/*.ts" -c README.md "Explain the SDK auth flow"
```

Each readable match is embedded as `<file path="...">...</file>` inside the prompt payload (`apps/prompt-maker-cli/src/file-context.ts:35`). Missing matches or unreadable files emit warnings but do not stop the run (`apps/prompt-maker-cli/src/file-context.ts:17` and `:25`).

## Using Images and Video

### Images

- Use `--image path/to/mock.png` (repeatable) to inline screenshots in the generation request (`apps/prompt-maker-cli/src/generate-command.ts:271`).
- Supported extensions: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`; max 20 MB each (`apps/prompt-maker-cli/src/image-loader.ts:6`).
- Files are base64-encoded and streamed to the target model; unsupported types or oversized files are skipped with warnings (`apps/prompt-maker-cli/src/image-loader.ts:19`).

### Video

- Add `--video walkthrough.mp4` for Gemini models that support video (`apps/prompt-maker-cli/src/generate-command.ts:278`).
- If you selected an OpenAI model, the CLI switches to `gemini-3-pro-preview` (or your configured Gemini default) and logs a notice (`apps/prompt-maker-cli/src/generate-command.ts:131`).
- Supported formats include `.mp4`, `.mov`, `.m4v`, `.webm`, `.avi`, `.mpeg`, `.mpg`, `.gif`; MIME detection lives in `inferVideoMimeType` (`apps/prompt-maker-cli/src/media-loader.ts:9`).
- Videos are uploaded to the Gemini Files API, and the CLI polls until processing reaches `ACTIVE`, updating the spinner with an “Uploading…” label while transfers are in flight (`apps/prompt-maker-cli/src/media-loader.ts:24` and `apps/prompt-maker-cli/src/generate-command.ts:788`).

## Smart Context

Enable `--smart-context` to auto-select relevant files via local embeddings:

```bash
prompt-maker-cli --smart-context "Explain how to add OAuth scopes"
```

Workflow:

1. Scans `**/*.{ts,tsx,js,jsx,py,md,json}` while ignoring `node_modules`, build artifacts, repos, and lockfiles (`apps/prompt-maker-cli/src/generate-command.ts:31`).
2. Limits indexing to files under ~25 KB to keep embeddings cheap (`apps/prompt-maker-cli/src/generate-command.ts:54`).
3. Embeds and caches results in `~/.config/prompt-maker-cli/embeddings_cache.json` keyed by file hash (`apps/prompt-maker-cli/src/rag/vector-store.ts:8`).
4. Searches for the top five matches to your intent and adds them as context, skipping files already attached manually (`apps/prompt-maker-cli/src/rag/vector-store.ts:52` and `apps/prompt-maker-cli/src/generate-command.ts:811`).
5. Displays warnings if indexing or search fails but continues without smart context.

Use this when you’re unsure which files matter—e.g., summarizing a large codebase.

## Interactive Refinement

Add `--interactive` (requires an interactive TTY) to loop on refinements:

```
$ prompt-maker-cli --interactive "Write a prompt for bug triage"
AI Prompt Generator
────────────────────
Generated prompt [...]

Refine? (y/n): y

Describe the refinement. Submit an empty line to finish.
> Stress reproducible steps.
> Emphasize log links.
>
```

- Each `y` captures multi-line instructions until you submit a blank line, then regenerates using the previous draft plus your guidance (`apps/prompt-maker-cli/src/generate-command.ts:526` and `:659`).
- Answer `n` or press Enter at the yes/no prompt to finish (`apps/prompt-maker-cli/src/generate-command.ts:532`).
- `--json` cannot be combined with `--interactive`; the CLI errors early (`apps/prompt-maker-cli/src/generate-command.ts:124`).
- If `--interactive` is set without a TTY (e.g., CI), the CLI falls back to batch mode and prints a warning (`apps/prompt-maker-cli/src/generate-command.ts:139`).

## Polishing Prompts

```bash
prompt-maker-cli --polish --polish-model gpt-4o "Draft an executive briefing prompt"
```

- When `--polish` is set, the CLI runs a second pass with a dedicated system prompt that tightens wording while preserving structure (`apps/prompt-maker-cli/src/generate-command.ts:113` and `:173`).
- The polishing LLM defaults to the generation model but can be overridden via `PROMPT_MAKER_POLISH_MODEL` or `--polish-model` (`apps/prompt-maker-cli/src/generate-command.ts:169`).
- The polished text is printed under “Polished prompt,” and JSON output includes `polishedPrompt` plus `polishModel` (`apps/prompt-maker-cli/src/generate-command.ts:207`).

## JSON Output and Automation

Use `--json` to emit machine-readable results:

```bash
prompt-maker-cli --json "Summarize weekly incidents" > prompt.json
jq '.prompt' prompt.json
```

Payload fields: `intent`, `model`, `prompt`, `refinements`, `iterations`, `interactive`, `timestamp`, plus optional `polishedPrompt` and `polishModel` (`apps/prompt-maker-cli/src/generate-command.ts:101`). The CLI still records the run in history (see below) when `--json` is used (`apps/prompt-maker-cli/src/generate-command.ts:211`). Avoid `--interactive` in JSON mode.

## Clipboard and ChatGPT Integration

- `--copy` writes the final prompt (polished if present) to your clipboard using `clipboardy`, logging a warning if the operation fails (`apps/prompt-maker-cli/src/generate-command.ts:676`).
- `--open-chatgpt` launches `https://chatgpt.com/?q=<prompt>` in your default browser via `open`; URL encoding is handled for you (`apps/prompt-maker-cli/src/generate-command.ts:695`).
- You can combine both flags for rapid iteration.

## Cookbook

### Quick inline draft

```bash
prompt-maker-cli "Draft an onboarding prompt for new SREs"
```

Great for fast experiments. Uses the default model, prints context/token info, and emits the generated prompt immediately.

### Intent file plus curated context

```bash
prompt-maker-cli --intent-file prompts/onboarding.md \
  --context "src/sre/*.md" --copy --open-chatgpt
```

Reads the intent from disk (with size/binary checks), embeds matching docs as `<file ...>` blocks, copies the result to your clipboard, and opens ChatGPT so you can start a conversation with the generated prompt.

### Automation-friendly JSON output

```bash
prompt-maker-cli --json --context docs/api/*.md \
  "Write a prompt for an API-change explainer" | jq '.prompt'
```

Keeps the run non-interactive, prints machine-readable metadata (intent, model, refinements, timestamps), and still appends the run to history. Perfect for CI jobs or custom tooling.

### Multimedia storyboard with smart context

```bash
prompt-maker-cli --smart-context \
  --image assets/wireframe.png --video walkthrough.mp4 \
  "Create a narrated demo prompt for the dashboard"
```

Auto-indexes relevant source files (under 25 KB), attaches the top matches, uploads the image/video. If you started on an OpenAI model, the CLI switches to a Gemini video model and keeps you informed.

### Interactive refinement with polishing

```bash
prompt-maker-cli --interactive --polish \
  --polish-model gpt-4o "Design a prompt for quarterly OKR reviews"
```

Walk through refinement loops in your terminal (TTY required). Once satisfied, enable the polish pass to tighten wording while preserving structure, then optionally `--copy` or `--open-chatgpt`.

### Regression testing with YAML suites

```bash
prompt-maker-cli test                      # prompt-tests.yaml
prompt-maker-cli test tests/okr-suite.yaml  # custom file
```

Parses your YAML suite, generates prompts per test, and asks the LLM judge (`PROMPT_MAKER_JUDGE_MODEL` or `gpt-4o`) whether each output meets its criteria. Use the exit code in CI pipelines.

## Prompt Testing

Run `prompt-maker-cli test` to validate prompts defined in YAML:

```yaml
# prompt-tests.yaml
tests:
  - name: Incident summaries stay concise
    intent: 'Summarize Sev-1 incidents for exec status'
    context:
      - docs/runbook.md
    expect:
      - 'Three paragraphs max'
      - 'Must mention mitigations'
```

Command usage:

```bash
prompt-maker-cli test            # uses prompt-tests.yaml
prompt-maker-cli test custom.yaml
```

Execution flow:

1. The CLI parses the suite with Zod, ensuring every test has `name`, `intent`, optional `context` globs, and at least one `expect` criterion (`apps/prompt-maker-cli/src/testing/test-schema.ts:1`).
2. For each test, it generates a prompt with your default model plus any matched context files, then evaluates the output using `evaluatePrompt`, which calls an LLM judge (default `gpt-4o`, overridable via `PROMPT_MAKER_JUDGE_MODEL`) to return `{ pass, reason }` JSON (`apps/prompt-maker-cli/src/test-command.ts:88` and `apps/prompt-maker-cli/src/testing/evaluator.ts:5`).
3. Progress is streamed:
   - TTY: a live bar `[████░░...] 3/5 Running test...` (`apps/prompt-maker-cli/src/test-command.ts:204`).
   - Non-TTY: plain “Running test X/Y” logs (`apps/prompt-maker-cli/src/test-command.ts:185`).
4. Results section prints `PASS`/`FAIL` with the judge’s reason, and `process.exitCode` is set to 1 if any test fails (useful for CI) (`apps/prompt-maker-cli/src/test-command.ts:45` and `:55`).

## History and Token Counting

- Each generation appends a JSON line to `~/.config/prompt-maker-cli/history.jsonl`, creating the directory if needed. You can inspect or tail this file to audit past prompts (`apps/prompt-maker-cli/src/history-logger.ts:5`).
- Token counts rely on `js-tiktoken` (`cl100k_base`) with fallbacks to a characters ÷ 4 heuristic if encoding fails (`apps/prompt-maker-cli/src/token-counter.ts:1`). Severity labels switch to “Medium” above ~30 k tokens and show a ⚠️ “High” above ~100 k (`apps/prompt-maker-cli/src/token-counter.ts:23`).

## Troubleshooting

- **Missing API keys** – Calls to OpenAI or Gemini fail with credential errors. Set `OPENAI_API_KEY` / `GEMINI_API_KEY`, or populate your config file (`apps/prompt-maker-cli/src/config.ts:57`).
- **Intent errors** – Providing both a positional intent and `--intent-file`, supplying binary data, or exceeding 512 KB leads to explicit validation errors (`apps/prompt-maker-cli/src/generate-command.ts:363`).
- **Context globs match nothing** – The CLI logs `Warning: No files matched...` but continues; double-check your patterns (`apps/prompt-maker-cli/src/file-context.ts:17`).
- **Smart context issues** – Indexing/search failures are logged while the run proceeds without extra context; ensure files are under 25 KB and not ignored (`apps/prompt-maker-cli/src/generate-command.ts:54` and `:825`).
- **Media problems** – Unsupported extensions or oversized files are skipped with warnings for images (`apps/prompt-maker-cli/src/image-loader.ts:19`) or errors for videos lacking Gemini credentials (`apps/prompt-maker-cli/src/media-loader.ts:65`).
- **Interactive/JSON conflict** – The CLI throws `--json cannot be combined with --interactive.` when both flags are set (`apps/prompt-maker-cli/src/generate-command.ts:124`).
- **Clipboard/ChatGPT failures** – Errors from the OS clipboard or default browser are caught and logged without failing the run (`apps/prompt-maker-cli/src/generate-command.ts:684` and `:700`).

With these workflows, you can turn raw intentions into rigorously tested, context-aware prompts while keeping a clear audit trail of every iteration.
