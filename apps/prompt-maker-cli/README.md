# Prompt Maker CLI

Terminal-first interface for the prompt-maker workflow. Feed it a rough draft, review diagnosis scores, answer clarifying questions, and emit an improved (optionally polished) contract without leaving your shell or editor.

## Usage

```bash
npx nx run prompt-maker-cli:serve -- --prompt-file prompt.txt --polish
```

Key flags:

- `--prompt` / `--prompt-file` / stdin – provide the initial draft.
- `--answers-json` / `--answers-file` – seed clarifying answers (JSON object keyed by criterion).
- `--max-questions` – cap the number of questions (default: 4).
- `--json` – emit machine-readable output for editor integrations.
- `--no-interactive` – skip interactive prompts even when running in a TTY.
- `--polish` / `--model` – enable the OpenAI finishing pass (requires `OPENAI_API_KEY`).

When run in an interactive terminal the CLI will ask any missing clarifying questions inline. In non-interactive contexts (e.g., piping input or calling from another program) these prompts are skipped so you can fully automate the flow.

## JSON Automation

Combine `--json` with scripted answers to drive the CLI from tools like NeoVim:

```bash
node dist/apps/prompt-maker-cli/index.js \
  --prompt-file prompt.txt \
  --answers-json '{"constraints":"Functional TypeScript only"}' \
  --json > result.json
```

The JSON payload includes the original diagnosis, clarifying questions, collected answers, and the improved/polished prompt text so you can render it however you like.
