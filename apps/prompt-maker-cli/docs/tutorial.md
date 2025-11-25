# Prompt Maker CLI Tutorial

This guide walks through every major capability of the `prompt-maker-cli` so you can comfortably iterate on prompts directly from a terminal or editor integration. It closes with a spec sheet you can hand to an AI agent (e.g., NeoVim plugin helper) to automate the workflow.

## 1. Prerequisites

- Node.js 18+ and npm installed locally.
- Repository dependencies installed (`npm install`).
- `OPENAI_API_KEY` in your shell (or a config file referenced by `PROMPT_MAKER_CLI_CONFIG`) to unlock both the polish pass _and_ the AI Prompt Generation flow.
- Familiarity with shell piping and JSON tooling such as `jq` helps when scripting.

## 2. Anatomy of the CLI

`prompt-maker-cli` is exposed via Nx:

```bash
npx nx run prompt-maker-cli:serve -- [flags]
```

Once bundled (or globally installed), you get two entry points:

- **Default (improve) command** – run `prompt-maker-cli [flags]` to diagnose, clarify, and improve an existing draft prompt.
- **AI Prompt Generation command** – run `prompt-maker-cli generate <intent> [flags]` (alias: `expand`) to feed fuzzy intent notes into an LLM-powered meta-prompt that returns a structured contract from scratch.

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

| Flag / Command                                    | Description                                                |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `-p, --prompt <text>`                             | Inline prompt text for the improve command.                |
| `-f, --prompt-file <path>`                        | Read prompt (improve) or intent (generate) from a file.    |
| `--answers-json <json>` / `--answers-file <path>` | Provide clarifying answers as JSON (improve flow).         |
| `-q, --max-questions <n>`                         | Limit clarifying questions (default 4).                    |
| `--json`                                          | Emit machine-readable JSON for automation.                 |
| `--no-interactive`                                | Skip TTY questions even if stdin/stdout are interactive.   |
| `--polish`                                        | Run the OpenAI finishing pass (requires `OPENAI_API_KEY`). |
| `--model <name>`                                  | Override the OpenAI model (polish or generate).            |
| `generate <intent>`                               | New subcommand for AI Prompt Generation.                   |
| `--intent-file <path>`                            | Provide fuzzy intent from a file (generate flow).          |
| `-i, --interactive`                               | Enable iterative regenerate/refine loop for generate.      |
| `--copy`                                          | Copy the generated prompt to the clipboard automatically.  |
| `--open-chatgpt`                                  | URL-encode the output and open `https://chatgpt.com/?q=…`. |
| `--help`                                          | Show usage for the current command.                        |

The CLI always produces:

1. A diagnosis of the draft prompt.
2. Clarifying questions (with hints/options).
3. An improved contract-style prompt (and optional polished variant).

## 3. Quick-Start Example

```bash
npx nx run prompt-maker-cli:build
cat apps/prompt-maker-cli/draft.txt \
  | node apps/prompt-maker-cli/dist/index.js --json \
  > apps/prompt-maker-cli/result.json
```

- Build the CLI bundle once so the Node entry stays current.
- Provide the prompt via stdin and request JSON output for automation.
- Store the payload in `apps/prompt-maker-cli/result.json` for inspection.

> [!NOTE]
> When you redirect output to a file, running the CLI through `npx nx run ...:serve`
> prepends Nx task logs ahead of the JSON payload. Running the built bundle via
> `node apps/prompt-maker-cli/dist/index.js` avoids that noise while still letting
> you pipe prompts from stdin.
>
> **Automation boosters:**
>
> - Pass `--no-interactive --json` when wrapping the CLI in scripts or CI to keep runs non-blocking and machine-readable.
> - Capture the improved prompt in one line with `jq`: `... --json | jq -r '.result.improvedPrompt' > improved.md`.
> - Feed canned answers without touching files: `ANSWERS=$(jq '{outcome:"..."}' run.json); node ... --answers-json "$ANSWERS"`.
> - Set `NX_CACHE=false` (or `--skip-nx-cache`) whenever you need to force a rebuild before publishing or re-installing the global binary.

### 3.1 Step-by-step: Diagnose → Answer → Improve

Follow this exact path the first time you work on a prompt. It creates predictable folders, captures every artifact, and produces a final contract without guesswork.

1. **Prep directories + raw draft.**

   ```bash
   mkdir -p drafts prompts runs
   cat <<'EOF' > drafts/onboarding-bot.md
   Draft a spec for documenting our onboarding bot.
   - Highlight every customer touchpoint after signup
   - Explain telemetry we need to collect for each step
   - Keep the tone instructional so Ops can run it without engineering
   EOF
   ```

2. **Build once so the bundle is fresh.**

   ```bash
   npx nx run prompt-maker-cli:build --skip-nx-cache
   ```

3. **Diagnose interactively to gather answers.**

   ```bash
   node apps/prompt-maker-cli/dist/index.js \
     --prompt-file drafts/onboarding-bot.md \
     --max-questions 3
   ```

   - Answer with numbers (`2` or `1,3`) to reuse stock options in the order shown.
   - Type custom text when you need something specific (“Context, Deliverable, Acceptance Criteria…”).
   - Press **Enter** on a blank line to keep an existing answer and move on.
   - The CLI prints the “Improved prompt” template immediately so you can sanity-check what changed.

4. **Capture answers for repeatable runs.** Take the responses you gave interactively and freeze them in JSON (file or env var). Example inline env var:

   ````bash
   ANSWERS='{
     "outcome": "One ```ts``` block + tests",
     "outputFormat": "Context, Deliverable, Acceptance Criteria. Include ```ts``` fences for code.",
     "constraints": "Functional TypeScript; No classes; No any",
     "context": "Bot greets users after signup and must describe edge cases + telemetry."
   }'
   ````

   > [!TIP]
   > Prefer storing the same structure in `answers/onboarding-bot.json` so teammates can rerun the flow without copying shell history.

5. **Improve non-interactively and write the contract.** Running with `--json --no-interactive` ensures deterministic output that can be piped into `jq` or files.

   ```bash
   node apps/prompt-maker-cli/dist/index.js \
     --prompt-file drafts/onboarding-bot.md \
     --answers-json "$ANSWERS" \
     --json --no-interactive \
     | tee runs/onboarding-bot-improve.json \
     | jq -r '.result.improvedPrompt' > prompts/onboarding-bot.md
   ```

   - `runs/*.json` keeps the full history (scores, questions, answers).
   - `prompts/*.md` contains only the polished contract you’ll paste into another tool.

6. **Optional polish pass.** Once the structure looks right, add `--polish --model gpt-4o-mini` and capture `.result.polishedPrompt` the same way. If polishing fails, the CLI records the error in `polishError` without stopping the run.

> [!IMPORTANT]
> The “Improved prompt” block replaces your original draft—it does not append to it. Add any required context or requirements via the interactive answers (or the `--answers-*` flags) so the final contract contains the details you care about.

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

Sample clarifying round:

````text
Answer the clarifying questions below. Leave blank to keep existing answers.

What single observable deliverable do you want (e.g., 'one Markdown page', 'a JSON schema', 'a ```ts``` function') and any length limits?
Options:
  1. One Markdown page ≤ 350 words
  2. One ```ts``` block + tests
  3. JSON object matching a schema
Enter number(s) or custom response (blank line to skip):
> 2

How should the output be structured—exact sections/keys and their order?
Hint: Specify headings or JSON keys; include code fences where applicable.
Enter response (blank line to skip):
> Context, Deliverable, Acceptance Criteria. Include ```ts``` fences for code.
````

- Typing `2` selects the second option verbatim (“One `ts` block + tests”).
- Enter comma-separated numbers like `1,3` to merge multiple options in order.
- Provide free-form text whenever the stock options do not fit.
- Press **Enter** on an empty line to keep the previous answer and continue.

After you answer the last question the CLI always prints results in this order:

1. **Scores** – baseline versus improved percentages so you can see progress.
2. **Clarifying questions** – echoes your answers for auditing.
3. **Improved prompt** – the contract to copy or pipe into `jq`.
4. **Polished prompt** – only present when `--polish` succeeds; otherwise `polishError` explains why it failed.

If the improved prompt looks too generic, inject more detail through the answers (`context`, `constraints`, `outputFormat`, etc.) and re-run with `--answers-json` + `--json --no-interactive`. That pass replaces the boilerplate with your actual requirements.

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

### AI Prompt Generation (Hey Presto style)

Use the `generate` subcommand when you only have fuzzy intent notes and want the CLI + LLM to fabricate a full contract in one shot. Unlike the improve flow, generate never asks clarifying questions—it expects your intent notes (plus optional refinements) to contain the entire brief.

#### 4.1 Step-by-step: Intent → Generate → Capture

1. **Set up folders + intent.**

   ```bash
   mkdir -p intents prompts runs
   cat <<'EOF' > intents/onboarding-notes.md
   Need a documentation prompt for our onboarding bot project.
   Highlight every user touchpoint after signup, required telemetry/events, and approval workflow.
   Prefer Functional TypeScript and markdown tables for checklists.
   EOF
   ```

2. **export credentials + build once.**

   ```bash
   export OPENAI_API_KEY=sk-...
   npx nx run prompt-maker-cli:build --skip-nx-cache
   ```

   > [!NOTE]
   > The generate command uses OpenAI by default. Either export `OPENAI_API_KEY` (as above) or create `~/.config/prompt-maker-cli/config.json` with the key and default model.

3. **Run a non-interactive generation and capture artifacts.**

   ```bash
   node apps/prompt-maker-cli/dist/index.js generate \
     --intent-file intents/onboarding-notes.md \
     --model gpt-4o-mini \
     --copy \
     | tee prompts/onboarding-generated.md
   ```

   - The CLI prints a titled block (“AI Prompt Generator… Generated prompt”) followed by the contract text.
   - `tee` writes the exact stdout into `prompts/onboarding-generated.md` while still showing it in your terminal.
   - `--copy` mirrors the final prompt into your clipboard for immediate pasting.

4. **Record metadata for traceability.** Capture the same output (plus timestamps, refinements, etc.) under `runs/` so you can diff changes later.

   ```bash
   node apps/prompt-maker-cli/dist/index.js generate \
     --intent-file intents/onboarding-notes.md \
     --model gpt-4o-mini \
     | awk 'BEGIN{print "# " strftime("%Y-%m-%d %H:%M:%S") "\n"}1' \
     > runs/onboarding-generate-001.txt
   ```

   (Any tooling is fine; the key is to keep the raw console transcript.)

5. **Feed the generated prompt into the improve pipeline (optional but recommended).** This surfaces clarifying questions in case the LLM hallucinated gaps.
   ```bash
   node apps/prompt-maker-cli/dist/index.js \
     --prompt-file prompts/onboarding-generated.md \
     --json --no-interactive \
     | tee runs/onboarding-generated-diagnosed.json
   ```
   You now have a deterministic JSON artifact plus the polished prompt stored under `prompts/`.

#### 4.2 Interactive refinement walkthrough

Add `--interactive` (or `-i`) when you want to iterate inside the terminal. The CLI keeps asking whether to refine and appends each instruction to the LLM context.

```bash
node apps/prompt-maker-cli/dist/index.js generate \
  --intent-file intents/onboarding-notes.md \
  --interactive \
  --model gpt-4o-mini \
  --open-chatgpt
```

Sample transcript:

```text
AI Prompt Generator
────────────────────
Generated prompt:
(complete contract …)

Refine? (y/n): y
Describe the refinement. Submit an empty line to finish.
> Require a timeline table and highlight data-retention rules.
>
AI Prompt Generator
────────────────────
Generated prompt (iteration 2):
(updated contract …)
Refine? (y/n): n
```

- Press **Enter** on an empty line when you are done typing the refinement note.
- Each refinement becomes part of the context, so iteration 3 sees everything from iteration 1 + 2.
- `--open-chatgpt` launches your browser with the final text so you can hand it off immediately.

#### 4.3 Automation + shortcuts

- **stdin everywhere:** `cat intents/onboarding-notes.md | node ... generate --model gpt-4o-mini > prompts/...` works the same as `--intent-file`.
- **Clipboard only:** `... generate --copy >/dev/null` keeps your terminal clean when you only care about pasting into another tool.
- **Concurrent capture:** `... generate | tee prompts/foo.md | pbcopy` lets you log to disk and populate your clipboard simultaneously.
- **Defaults file:** place model preferences in `~/.config/prompt-maker-cli/config.json` so you can omit `--model` entirely.
- **Improve handoff:** `node ... generate > prompts/foo.md && node ... --prompt-file prompts/foo.md --json --no-interactive` keeps generate + diagnose in one shell chain.

> [!TIP]
> When scripting in CI, prefer `node apps/prompt-maker-cli/dist/index.js generate ...` plus `tee runs/*.txt` so you always have the raw console output for auditing. The generate command does not emit JSON, so capturing stdout verbatim is the safest way to persist results.

### Generator recipe pack (copy/paste tests)

Use these commands verbatim to smoke-test the generator or to demo it for teammates:

1. **Cover letter coach**

   ```bash
   prompt-maker-cli generate "Write a confident cover letter for a Staff Product Manager role at Linear. Mention AI planning systems and quantified GTM wins." \
     --model gpt-4o-mini
   ```

   Expected behavior: prompt includes Role (Expert Cover Letter Coach), Context about company/role, Constraints (tone, word count), Output Format (sections like Greeting, Story, Close), and recommends a tech stack/file structure only if you add follow-up requests involving code.

2. **Scraper scaffold**

   ```bash
   prompt-maker-cli generate "Need a Bun + TypeScript CLI that scrapes Hacker News front page hourly and posts deltas to Slack. Deploy on Fly.io." \
     --model gpt-4o-mini --copy
   ```

   Expected behavior: output proposes a Bun/TypeScript stack, outlines directories (`src/client.ts`, `scripts/deploy.sh`), and specifies output sections such as Role, Context, Constraints, Output Format.

3. **Data science experiment brief**

   ```bash
   prompt-maker-cli generate "Design an A/B test to compare personalized onboarding tooltips vs control. Include telemetry requirements and success metrics." \
     --model gpt-4o-mini
   ```

   Expected behavior: structured prompt with experiment objectives, metric definitions, required instrumentation, and a recommended analysis checklist.

4. **LOBE-style creative brief**

   ```bash
   prompt-maker-cli generate "Create a LOBE design brief for a mobile habit tracker with AR streak visualizations." --model gpt-4o-mini --open-chatgpt
   ```

   Expected behavior: sections for Role (Creative Director), Context (target audience, AR concept), Constraints (platform, tone), and Output Format (Deliverables, Visual Language, Assets), followed by an auto-opened ChatGPT tab for continued exploration.

5. **Follow-up refinement test**

   ```bash
   prompt-maker-cli generate "Summarize all TypeScript migration tasks for a monorepo" --interactive
   ```

   - First pass should describe the Role (Senior Migration Strategist) and baseline plan.
   - When prompted to refine, enter something like `Prioritize Nx + Vite workspaces and mention lint fixes` to confirm iteration support.

6. **Travel app build brief from notes (file-based)**

   ```bash
   cat <<'EOF' > intents/travel-app-notes.md
   Please help me craft a prompt to build code for my travel app.
   Notes:
   - Must support itinerary planning, hotel search, and GPT-powered chat.
   - Mobile-first React Native + Expo.
   - API gateway already exists; integrate with /trips and /deals endpoints.
   - Budget reminders and offline cache are non-negotiable.
   - Deliverables should include suggested folder structure and CI steps.
   EOF

   prompt-maker-cli generate --intent-file intents/travel-app-notes.md --model gpt-4o-mini
   ```

   Expected behavior: output lists Role (Lead Travel App Engineer), Context (features + constraints), explicit Constraints (React Native, Expo, offline cache, API usage), Output Format (sections such as Tech Stack, File Tree, CI Tasks, Acceptance Criteria), and it proposes a file/folder layout because the notes mention “build code.”

Keep these snippets in `docs/examples/generator-tests.sh` (or run them manually) whenever you upgrade dependencies or tweak the meta-prompt.

### Case Study: HUD-Line-Driven Required Fees

Use this real incident as a template for turning a customer report into a production-ready prompt.

1. **Capture the raw report**

   ```bash
   cat <<'EOF' > prompts/hud-required-fees.md
   Currently in the portal app, in the costs manager, in the master costs allow
   the users to set which master costs are optional and which are required.
   We need to change this such that required fees are designated by product line,
   and not allow the users to change this.
   What I'm thinking is that we would need a new table,
   possibly called required_product_lines, where we have a column
   for product line, a column for the associated sector,
   and a column for whether it is required.
   And then wherever we have logic that determines which costs are automatically
   added to a new Costing Set, that logic would be modified to look at this table
   to determine which master costs would be added to a costing set.
   The logic would get all master costs
   for the current user, then look in this new table and filter to
   include all master costs that match the vertical and whose product
   lines match the required product lines.
   Please just provide me your suggested plan for this, and also a series of
   directed prompts that I can use for whatever agent
   I will be using to assist me when the time comes.
   EOF
   ```

> [!TIP] You can start surprisingly small—think of it as
> “enough signal for the first diagnosis.” In practice:
>
> - **Absolute minimum**: one or two sentences capturing the core problem
>   (“Fee Manager must derive required
>   fees from HUD lines instead of user toggles;
>   users can’t override required status anymore”).
>   That’s enough for Prompt Maker to warn you that outcome,
>   format, constraints, and context are missing.
> - **Slightly better**: add one concrete detail per dimension
>   you care about—e.g., mention the new table idea,
>   say which parts of the workflow are affected
>   (fee-set creation, UI toggle removal),
>   and any stack constraints you already know (Postgres, TypeScript).
>   This makes the clarifying questions sharper and
>   reduces how much you need to answer later.
> - **Rule of thumb**: include the business objective plus
>   any “non-negotiables” (tech stack, data sources, compliance rules).
>   Let Prompt Maker surface everything else via clarifying questions;
>   you then answer those in `answers.json` or interactively.
>
> So you don’t have to paste the full incident report every
> time—start with the bare essentials, run `prompt-maker-cli`,
> and use the generated questions to fill in the missing pieces iteratively.

2. **Diagnose to expose the gaps**

   ```bash
   prompt-maker-cli \
     --prompt-file prompts/hud-required-fees.md \
     --json \
     | tee runs/hud/001-diagnose.json
   ```

   The CLI called out missing outcome, structure, constraints, and context via questions such as:
   - “What single observable deliverable do you want (e.g., ‘one Markdown page’ …)?”
   - “How should the output be structured—exact sections/keys and their order?”
   - “What constraints and non-goals should be enforced …?”
   - “What minimal domain facts are necessary …?”

3. **Answer once, reuse often**
   Create `answers/hud-required-fees.json` so anyone can rerun the flow deterministically:

   ```json
   {
     "outcome": "One RFC-style implementation plan ≤500 words covering schema, business logic, and UI impact.",
     "outputFormat": "Headings: Summary, Data Model, Fee-Set Logic Changes, UI/Permissions, Migration & Ops, Risks & Follow-Ups",
     "constraints": "Functional TypeScript only, Postgres migration via Prisma, reuse existing fee-manager services, remove user-facing overrides, table name tbl_required_fee_hud_lines.",
     "context": "Portal Fee Manager; master fees currently optional/required per user; need HUD-line-driven requirements per vertical; auto-add required fees when creating Fee Sets; vertical examples: Retail, Wholesale."
   }
   ```

4. **Improve using those answers**

   ```bash
   prompt-maker-cli \
     --prompt-file prompts/hud-required-fees.md \
     --answers-file answers/hud-required-fees.json \
     --json \
     | tee runs/hud/002-improve.json
   jq -r '.result.improvedPrompt' runs/hud/002-improve.json > prompts/hud-required-fees-improved.md
   ```

   The improved contract now demands an RFC-style plan with the exact sections, constraints (Functional TS + Prisma migration + UI removal), and business context the team needs.

5. **Iterate / polish**
   - Update the answers file whenever a constraint changes (e.g., new vertical name) and rerun.
   - Add `--polish` when sharing externally, but keep the improved prompt as the authoritative spec for engineers.

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
- **Command**: `:PromptMakerGenerate` — Run `prompt-maker-cli generate` on scratch intent notes, insert the AI-crafted contract, optionally offer refinement prompts within NeoVim.

### Inputs

- Prompt text sourced from:
  - Entire buffer.
  - Visual selection.
  - External file path (optional argument).
- Optional clarifying answers JSON (from user prompts or stored config).
- Optional defaults JSON (workspace config file).

### Required CLI Invocation

- Executable: `prompt-maker-cli` when installed globally (fallback: `node apps/prompt-maker-cli/dist/index.js` or `npx nx run prompt-maker-cli:serve --`).
- Improve flow: always pass `--json --no-interactive` for automation; present additional questions to the user if `.questions` returns entries with empty answers, then re-run with populated `--answers-json`.
- Generate flow: invoke `prompt-maker-cli generate --intent-file <temp>` (plus optional `--model`, `--copy`, `--open-chatgpt`). Capture stdout as plain text and, if you want in-editor refinements, prompt the user for another note chunk and re-run the command with the same intent file.

### Outputs to Capture

- `.diagnosis` → display overall score + per-criterion bars inside NeoVim.
- `.questions` → show list with hints/options; collect answers from user inputs.
- `.result.improvedPrompt` → insert into buffer or floating preview.
- `.result.polishedPrompt` → optional replacement when polish is enabled.
- `.result.polishError` → surface as a warning, fallback to improved prompt.
- `stdout` (generate command) → equals the final prompt text per iteration; capture the last block and split into lines when writing to a buffer.

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
