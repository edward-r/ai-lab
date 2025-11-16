# Prompt Maker CLI Tutorial

This guide walks through every major capability of the `prompt-maker-cli` so you can comfortably iterate on prompts directly from a terminal or editor integration. It closes with a spec sheet you can hand to an AI agent (e.g., NeoVim plugin helper) to automate the workflow.

## 1. Prerequisites

- Node.js 18+ and npm installed locally.
- Repository dependencies installed (`npm install`).
- Optional: `OPENAI_API_KEY` if you plan to use the polish pass.
- Familiarity with shell piping and JSON tooling such as `jq` helps when scripting.

## 2. Anatomy of the CLI

`prompt-maker-cli` is exposed via Nx:

```bash
npx nx run prompt-maker-cli:serve -- [flags]
```

Key flags:

| Flag                                              | Description                                                |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `-p, --prompt <text>`                             | Inline prompt text.                                        |
| `-f, --prompt-file <path>`                        | Read prompt from file.                                     |
| `--answers-json <json>` / `--answers-file <path>` | Provide clarifying answers as JSON.                        |
| `-q, --max-questions <n>`                         | Limit clarifying questions (default 4).                    |
| `--json`                                          | Emit machine-readable JSON.                                |
| `--no-interactive`                                | Skip TTY questions even if stdin/stdout are interactive.   |
| `--polish`                                        | Run the OpenAI finishing pass (requires `OPENAI_API_KEY`). |
| `--model <name>`                                  | Override polish model (defaults to `gpt-4o-mini`).         |
| `--help`                                          | Show usage.                                                |

The CLI always produces:

1. A diagnosis of the draft prompt.
2. Clarifying questions (with hints/options).
3. An improved contract-style prompt (and optional polished variant).

## 3. Quick-Start Example

```bash
cat draft.txt | npx nx run prompt-maker-cli:serve -- --json > result.json
```

- Provide the prompt via stdin.
- Request JSON output for downstream parsing.
- Store the payload in `result.json` for inspection.

## 4. Interactive Walkthrough

Use the CLI in a terminal to experience the full question/answer loop:

```bash
npx nx run prompt-maker-cli:serve -- \
  --prompt "Draft a spec for documenting our onboarding bot" \
  --max-questions 3
```

Flow:

1. CLI diagnoses the draft and displays baseline scores.
2. For each missing criterion it prompts you inline with hints/options.
3. Answers are merged with sensible defaults (functional TS, no classes/`any`, etc.).
4. Improved prompt plus score deltas are printed.

Tip: Press **Enter** on an empty line to keep an existing answer and move to the next question.

## 5. Non-Interactive / Batch Mode

When running from scripts or CI, disable interactive prompts and feed pre-baked answers:

```bash
npx nx run prompt-maker-cli:serve -- \
  --prompt-file prompt.txt \
  --answers-json '{"outcome":"One Markdown report ≤500 words"}' \
  --no-interactive \
  --json
```

- `--no-interactive` ensures the command never waits for user input.
- Answers JSON must map criterion keys (`outcome`, `outputFormat`, `constraints`, etc.) to strings.

## 6. Using `--answers-file`

Store clarifying answers in version control and reference them:

```json
// answers.json
{
  "constraints": "Functional TypeScript, no dependencies beyond stdlib",
  "outputFormat": "Sections: Context, Steps, Final Prompt"
}
```

```bash
npx nx run prompt-maker-cli:serve -- \
  --prompt-file prompt.txt \
  --answers-file answers.json
```

Files can contain a subset of keys—the CLI keeps blanks for the rest.

## 7. Customizing Defaults

Override the base contract template (role, rubric, etc.) via `--defaults-file`:

```json
// defaults.json
{
  "role": "LLM coach for backend migrations",
  "process": ["Assumptions", "Plan", "Parallel tasks", "Risks", "Final deliverable"],
  "rubric": ["Must mention idempotent migrations", "Fail if code samples omit TS types"]
}
```

Command:

```bash
npx nx run prompt-maker-cli:serve -- \
  --prompt-file prompt.txt \
  --defaults-file defaults.json
```

## 8. JSON Output + `jq`

Parse the CLI’s JSON to integrate with other tools:

```bash
npx nx run prompt-maker-cli:serve -- --prompt-file prompt.txt --json \
  | jq -r '.result.improvedPrompt' > improved.txt
```

Or capture the questions for UI rendering:

```bash
npx nx run prompt-maker-cli:serve -- --prompt-file prompt.txt --json \
  | jq '.questions[] | {key, question, hint}'
```

## 9. Enabling the Polish Pass

```bash
export OPENAI_API_KEY=sk-...
npx nx run prompt-maker-cli:serve -- \
  --prompt-file prompt.txt \
  --polish \
  --model gpt-4o-mini
```

Behavior:

- CLI sends the original and improved prompt to `callLLM` with a constrained system prompt.
- Success: `result.polishedPrompt` populated, `result.model` shows the engine.
- Failure: `result.polishError` contains the error message so callers can handle gracefully.

## 10. Logging & Error Handling

- Validation errors (e.g., missing prompt source) exit with code `1` and an error message to stderr.
- JSON mode still writes errors to stderr; stdout only emits JSON when execution succeeds.
- Interactive runs preserve prior answers if you re-run diagnose/improve loops.

## 11. Embedding in NeoVim (High-Level Flow)

1. Collect prompt text from the current buffer or visual selection.
2. Optionally prompt the user for clarifying answers (or load stored defaults).
3. Execute the CLI with `--json --no-interactive` for automation.
4. Parse `.result.improvedPrompt` (and `.result.polishedPrompt` when available).
5. Display diagnostics/questions inline or inside a floating window.

## 12. Example Workflows

### A. Draft → Diagnose → Answer → Improve

```bash
PROMPT=$(pbpaste)
node dist/apps/prompt-maker-cli/index.js \
  --prompt "$PROMPT" \
  --max-questions 2 \
  --json \
  | tee run.json
```

Inspect `run.json` and feed answers back:

```bash
ANSWERS=$(jq '{outcome: .questions[0].options[0]}' run.json)
node dist/apps/prompt-maker-cli/index.js \
  --prompt "$PROMPT" \
  --answers-json "$ANSWERS" \
  --no-interactive
```

### B. Continuous Prompt Refinement

```bash
while inotifywait prompt.txt; do
  npx nx run prompt-maker-cli:serve -- \
    --prompt-file prompt.txt \
    --json \
    | jq -r '.result.improvedPrompt' > improved.txt
done
```

### C. Git Commit Hook Example

Add a script to validate prompt specs before committing:

```bash
#!/usr/bin/env bash
set -euo pipefail
npx nx run prompt-maker-cli:serve -- \
  --prompt-file specs/prompt.md \
  --no-interactive \
  --json \
  | jq '.result.diagnosisAfter.overall' \
  | awk '{ if ($1 < 0.6) exit 1 }'
```

## NeoVim Plugin Agent Spec Sheet

Use this section verbatim when briefing an AI agent that will implement the NeoVim plugin.

### Mission

Create a NeoVim plugin that invokes `prompt-maker-cli` to improve prompts inside the editor, offering both interactive (question answering) and automated workflows.

### Entry Points

- **Command**: `:PromptMakerDiagnose` — Diagnose current buffer/selection, show scores/questions.
- **Command**: `:PromptMakerImprove` — Run full improve flow, insert improved prompt in a split.
- **Command**: `:PromptMakerPolish` — Same as improve but adds `--polish` if env vars exist.

### Inputs

- Prompt text sourced from:
  - Entire buffer.
  - Visual selection.
  - External file path (optional argument).
- Optional clarifying answers JSON (from user prompts or stored config).
- Optional defaults JSON (workspace config file).

### Required CLI Invocation

- Executable: `node dist/apps/prompt-maker-cli/index.js` (or `npx nx run prompt-maker-cli:serve --`).
- Always pass `--json --no-interactive` for automation; present additional questions to the user if `.questions` returns entries with empty answers.
- Re-run CLI with populated `answers-json` when the user supplies missing data.

### Outputs to Capture

- `.diagnosis` → display overall score + per-criterion bars inside NeoVim.
- `.questions` → show list with hints/options; collect answers from user inputs.
- `.result.improvedPrompt` → insert into buffer or floating preview.
- `.result.polishedPrompt` → optional replacement when polish is enabled.
- `.result.polishError` → surface as a warning, fallback to improved prompt.

### Environment & Config

- Respect `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_BASE_URL` from the user’s shell.
- Allow users to configure paths for `answers-file` / `defaults-file` per project (e.g., via `.prompt-maker.toml`).
- Provide a toggle to disable interactive follow-ups entirely (just show questions and exit).

### Error Handling

- Non-zero exit → display stderr in NeoVim quickfix and stop.
- Malformed JSON → show parser error and raw output for debugging.
- Missing prompt text → remind the user to select text or pass a file.

### Performance Expectations

- Cache last CLI JSON payload to avoid re-running when only viewing results.
- Stream stdout as it arrives if possible; otherwise show a spinner/fidget until completion.

### Testing Hooks

- Provide a mock mode that feeds canned CLI JSON (stored under `tests/fixtures/*.json`) to enable automated plugin tests without running the real CLI.

With this tutorial and spec sheet you (and your AI assistant) should have everything needed to integrate `prompt-maker-cli` into NeoVim or any other terminal-driven workflow.
