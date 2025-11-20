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

For a portable install, build once and register the package globally:

```bash
npx nx build prompt-maker-cli
cd apps/prompt-maker-cli
npm install -g .
```

> [!TIP] Here’s how to force a fresh bundle so the global install matches the new behavior:
>
> 1. From the repo root run `npx nx reset` (or `node node_modules/nx/bin/nx.js reset`) to stop the daemon and clear the cache.
> 2. Run `npx nx build prompt-maker-cli --skip-nx-cache` (or set `NX_CACHE=false`) so Nx actually rebundles instead of replaying the cached artifact.
> 3. Inside `apps/prompt-maker-cli`, reinstall globally: `npm install -g .`.

That command adds a `prompt-maker-cli` executable to your PATH so editor integrations can run it without repo-relative paths.

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
cat draft.txt | npx nx run prompt-maker-cli:serve --json > result.json
```

- Provide the prompt via stdin.
- Request JSON output for downstream parsing.
- Store the payload in `result.json` for inspection.

## 4. Interactive Walkthrough

Use the CLI in a terminal to experience the full question/answer loop:

```bash
npx nx run prompt-maker-cli:serve \
  --prompt "Draft a spec for documenting our onboarding bot" \
  --max-questions 3
```

Flow:

1. CLI diagnoses the draft and displays baseline scores.
2. For each missing criterion it prompts you inline with hints/options.
3. Answers are merged with sensible defaults (functional TS, no classes/`any`, etc.).
4. Improved prompt plus score deltas are printed.

Tip: Press **Enter** on an empty line to keep an existing answer and move to the next question.

Interactive prompts number each option—enter `1` (or `1,3` for multiples) to pick from the list, or type a custom response if none of the suggestions fit.

### Mental Model: Diagnose → Align → Improve → Polish

Treat the CLI as a tight feedback loop:

1. **Diagnose** – run the CLI with only your raw draft to gather scores and clarifying questions. This is your prompt “bloodwork.”
2. **Align** – answer the questions (either interactively or by editing `answers.json`). Each answer locks a criterion (outcome, output format, constraints, context, process, uncertainty).
3. **Improve** – re-run with the updated answers to produce a structured contract. Iterate until the questions list comes back empty.
4. **Polish** (optional) – once satisfied with the structure, add `--polish` to get the OpenAI finishing pass. Keep the improved prompt as your source of truth; the polish layer is a thin rewrite for tone/fluency.

Key cadence:

- **When drafting from scratch**: Diagnose → answer questions inline → immediately see the upgraded contract.
- **When editing an existing prompt**: Feed the last improved prompt back through `--prompt-file` and only answer the criteria you want to change; previous answers stay in place.
- **When automating**: Cache `run.json`, edit the `answers` object, and rerun with `--answers-json "$UPDATED"`.

### End-to-End Iteration Example

1. **Baseline diagnosis**

   ```bash
   npx nx run prompt-maker-cli:serve \
     --prompt-file prompts/rough-spec.md \
     --json \
     | tee runs/001-diagnose.json
   ```

   Review `.questions` to see which criteria need detail.

2. **Answer + improve**

   ```bash
   ANSWERS=$(jq '{
     outcome: "One Markdown spec ≤400 words",
     constraints: "Functional TS, no services",
     context: "Portal users accept T&C once"
   }' runs/001-diagnose.json)
   npx nx run prompt-maker-cli:serve \
     --prompt-file prompts/rough-spec.md \
     --answers-json "$ANSWERS" \
     --json \
     | tee runs/002-improve.json
   ```

   The new `.result.improvedPrompt` captures the clarified contract and the `.questions` array should be shorter.

3. **Optional polish**
   ```bash
   OPENAI_API_KEY=... npx nx run prompt-maker-cli:serve \
     --prompt-file prompts/rough-spec.md \
     --answers-json "$ANSWERS" \
     --polish \
     --json \
     | jq -r '.result.polishedPrompt' > prompts/final.md
   ```

Use this pattern whenever you need to “tighten” prompts in stages while keeping the CLI output traceable.

## 5. Non-Interactive / Batch Mode

When running from scripts or CI, disable interactive prompts and feed pre-baked answers:

```bash
npx nx run prompt-maker-cli:serve \
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
npx nx run prompt-maker-cli:serve \
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
npx nx run prompt-maker-cli:serve \
  --prompt-file prompt.txt \
  --defaults-file defaults.json
```

## 8. JSON Output + `jq`

Parse the CLI’s JSON to integrate with other tools:

```bash
npx nx run prompt-maker-cli:serve --prompt-file prompt.txt --json \
  | jq -r '.result.improvedPrompt' > improved.txt
```

Or capture the questions for UI rendering:

```bash
npx nx run prompt-maker-cli:serve --prompt-file prompt.txt --json \
  | jq '.questions[] | {key, question, hint}'
```

## 9. Enabling the Polish Pass

```bash
export OPENAI_API_KEY=sk-...
npx nx run prompt-maker-cli:serve \
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

### A. Draft → Diagnose → Answer → Improve (Solo Sprint)

Use this loop when you have a rough idea but need a contract-quality spec within minutes.

1. **Capture the draft directly from your editor/clipboard**

   ```bash
   PROMPT=$(pbpaste)
   node apps/prompt-maker-cli/dist/index.js \
     --prompt "$PROMPT" \
     --json \
     | tee runs/solo-001.json
   ```

   The JSON snapshot freezes the diagnosis and clarifying questions in time.

2. **Answer the top gaps immediately**

   ```bash
   ANSWERS=$(jq '{
     outcome: "One Markdown SOP ≤350 words",
     outputFormat: "Headings: Context, Steps, Final Prompt"
   }' runs/solo-001.json)
   node apps/prompt-maker-cli/dist/index.js \
     --prompt "$PROMPT" \
     --answers-json "$ANSWERS" \
     --no-interactive \
     --json \
     | tee runs/solo-002.json
   ```

   Iterate until `.questions` is empty and `.result.diagnosisAfter.overall` hits your target.

3. **Hand the improved prompt back to your editor** (e.g., `jq -r '.result.improvedPrompt' runs/solo-002.json > improved.md`).

### B. Team Handoff & Traceability

When collaborating, keep the CLI outputs in version control so teammates can see what changed and why.

1. **Designer** runs the initial diagnosis and commits `runs/feature-x/diagnose.json`.
2. **Engineer** opens the JSON, fills the `answers` block (or records them in `answers.json`), and re-runs with `--no-interactive --answers-json`. This produces `runs/feature-x/improve.json`.
3. **Reviewer** diffs the two JSON files to see which criteria tightened up, then copies `.result.improvedPrompt` into the shared spec.

Because each JSON contains the original draft, questions, answers, and improved prompt, you gain a complete audit trail without extra tooling.

### C. Continuous Prompt Refinement Loop

Keep a watch running while you iterate on a prompt file. Every save re-diagnoses the draft and exports the improved suggestion.

```bash
while inotifywait prompt.txt; do
  npx nx run prompt-maker-cli:serve \
    --prompt-file prompt.txt \
    --json \
    | jq -r '.result.improvedPrompt' > improved.txt
done
```

Use this when pair-writing with someone else or when you expect to answer clarifying questions inside the file itself: edit `prompt.txt`, save, review `improved.txt`, repeat.

### D. Prompt Quality Gate (CI or Git Hooks)

Enforce minimum quality scores before prompts land in production or documentation repos.

```bash
#!/usr/bin/env bash
set -euo pipefail
SCORE=$(npx nx run prompt-maker-cli:serve \
  --prompt-file specs/prompt.md \
  --no-interactive \
  --json \
  | jq '.result.diagnosisAfter.overall')
awk -v score="$SCORE" 'BEGIN { exit(score >= 0.6 ? 0 : 1) }'
```

Extend this idea by inspecting individual criteria (e.g., fail if `constraints < 0.8`) or by writing the JSON artifact to your CI workspace for later review.

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

- Executable: `prompt-maker-cli` when installed globally (fallback: `node apps/prompt-maker-cli/dist/index.js` or `npx nx run prompt-maker-cli:serve --`).
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
