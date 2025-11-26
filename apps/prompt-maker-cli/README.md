# Prompt Maker CLI

Terminal-first interface for generating structured prompt contracts from fuzzy intent notes. The diagnose/improve flow has been removed—`prompt-maker-cli` now exposes a single `generate` entry point plus an optional polish pass.

## Usage

```bash
# Build once (repo-local)
npx nx run prompt-maker-cli:build --skip-nx-cache

# Run from the repo
node apps/prompt-maker-cli/dist/index.js \
  --intent-file drafts/onboarding-notes.md \
  --model gpt-4o-mini \
  --json --polish > runs/onboarding.json
```

Key flags:

- `<intent>` / `--intent-file` / stdin – provide the rough intent text.
- `--model <name>` – choose the generation model (OpenAI or Gemini).
- `-i, --interactive` – enable the iterative refine loop (TTY only).
- `--polish` / `--polish-model` – run the finishing pass (defaults to the generation model).
- `--json` – emit machine-readable JSON (non-interactive mode).
- `--no-progress` – silence the stderr spinner shown during `--json` runs.
- `--copy`, `--open-chatgpt` – copy/open the final artifact for immediate sharing.

When `--json` is active the CLI prints a spinner to stderr so you know it’s still working; add `--no-progress` if stderr must stay silent.

Environment requirements:

- Set `OPENAI_API_KEY` _or_ `GEMINI_API_KEY` (or place them inside `~/.config/prompt-maker-cli/config.json`).
- Optional config structure:
  ```json
  {
    "openaiApiKey": "sk-...",
    "geminiApiKey": "gk-...",
    "promptGenerator": {
      "defaultModel": "gemini-1.5-flash"
    }
  }
  ```

## Generator + polish examples

```bash
# One-shot generation with clipboard handoff
prompt-maker-cli "Draft a confident onboarding-bot spec" --model gpt-4o-mini --copy

# File-based generation + JSON capture
prompt-maker-cli --intent-file drafts/onboarding-notes.md --model gemini-1.5-flash --json > runs/onboarding.json

# Generate with Gemini, then polish with GPT
prompt-maker-cli --intent-file drafts/onboarding-notes.md \
  --model gemini-1.5-flash \
  --polish --polish-model gpt-4o-mini \
  | tee prompts/onboarding-polished.md
```

Interactive mode still works—set `--interactive` to append refinements inside the terminal. Each iteration prints a labeled block, and the CLI only copies/opens the _final_ prompt (polished if available).

## NeoVim / editor integrations

- Run non-interactive commands with `--json` so you can parse `.prompt` / `.polishedPrompt`.
- Save scratch intent buffers to a temp file and call `prompt-maker-cli --intent-file /tmp/intent.md --json` whenever the user triggers “Generate”.
- Offer a “Polish” toggle by appending `--polish [--polish-model <name>]` to the same command.
- For interactive refinement inside the editor, spawn the CLI with `--interactive` and stream stdout into a floating window; collect follow-up notes from the user and re-run when needed.

## Global install

```bash
npx nx build prompt-maker-cli
cd apps/prompt-maker-cli
npm install -g .

# Later…
prompt-maker-cli --intent-file drafts/onboarding-notes.md --json
```

Once published to npm you can skip the local build/install step with:

```bash
npm install -g @perceptron/prompt-maker-cli
```
