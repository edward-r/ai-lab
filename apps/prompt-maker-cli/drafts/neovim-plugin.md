I need to create a Neovim plugin that integrates with the Prompt Maker CLI. The plugin should allow users to create, edit, and manage prompts directly from within Neovim. Here are the features I want to include:

- Command to generate a prompt based on selected text or a file.
- Command to polish an existing prompt using the CLI's polish feature.
- Keybindings for quick access to generate and polish commands.
- Display the generated or polished prompt in a new buffer for further editing.
- Error handling to notify users of any issues during prompt generation or polishing.
- Configuration options to set default models and other CLI parameters.
- Documentation on how to install and use the plugin.
- The ability to select which model to use for generation and polishing.

Here is information about the Prompt Maker CLI from the tutorial:

# Prompt Maker CLI Tutorial (Generate Edition)

This guide focuses on the **AI Prompt Generation** workflow. The improve/diagnose flow has been retired—every command now routes through the generator, and polishing is available as an optional second pass.

## 1. Prerequisites

- Node.js 18+ and npm installed.
- Workspace dependencies installed (`npm install`).
- At least one provider credential in your environment or config:
  - `OPENAI_API_KEY` for GPT models (optionally `OPENAI_BASE_URL`).
  - `GEMINI_API_KEY` for Google Gemini models (optionally `GEMINI_BASE_URL`).
- Optional config file at `~/.config/prompt-maker-cli/config.json` (see section 8).
- Familiarity with piping/redirecting shell output (`jq`, `tee`, etc.) helps when automating.

## 2. CLI anatomy

`prompt-maker-cli` exposes a single entry point. Run it via Nx while developing, or via the globally installed binary:

```bash
# Build the bundle
npx nx run prompt-maker-cli:build

# Run from the repo
node apps/prompt-maker-cli/dist/index.js "Draft an onboarding bot spec" --model gpt-4o-mini

# Or install globally after building once
cd apps/prompt-maker-cli && npm install -g .
prompt-maker-cli "Draft an onboarding bot spec" --model gemini-1.5-flash
```

Key flags (generator + polish):

| Flag / Command             | Description                                                               |
| -------------------------- | ------------------------------------------------------------------------- |
| `<intent>`                 | Inline rough intent text (quoted).                                        |
| `-f, --intent-file <path>` | Read intent from a file or heredoc.                                       |
| `--model <name>`           | Override the generation model (e.g., `gpt-4o-mini`, `gemini-1.5-flash`).  |
| `-i, --interactive`        | Enable iterative refine loop (TTY only).                                  |
| `--polish`                 | Run a finishing pass on the generated prompt.                             |
| `--polish-model <name>`    | Override the model used for polishing (defaults to the generation model). |
| `--json`                   | Emit machine-readable JSON (non-interactive only).                        |
| `--copy`                   | Copy the final prompt (polished if present) to the clipboard.             |
| `--open-chatgpt`           | Open `https://chatgpt.com/?q=...` with the final prompt.                  |
| `--help`                   | Show usage for the generator.                                             |

## 3. Quick-start pipeline

Produce a clean JSON artifact in three steps:

```bash
# 1) Build (forces a fresh bundle if you add --skip-nx-cache)
npx nx run prompt-maker-cli:build

# 2) Run generator with stdin + JSON output
cat apps/prompt-maker-cli/draft.txt \
  | node apps/prompt-maker-cli/dist/index.js \
      --model gemini-1.5-flash \
      --json \
  > apps/prompt-maker-cli/result.json
```

- Nx prints its own task logs to stderr; stdout only contains JSON when `--json` is set.
- The JSON payload includes the model, refinement count, base prompt, and optional `polishedPrompt` if you add `--polish`.
- Use `jq -r '.polishedPrompt // .prompt' result.json > prompts/final.md` to isolate the text you need.

> [!NOTE]
> Need a polished version in the same command? Add `--polish` (and optionally `--polish-model gpt-4o-mini`). The JSON payload will include both `prompt` and `polishedPrompt` so you can choose either downstream.

## 4. Step-by-step: Intent → Generate → Polish

Follow this routine whenever you start from scratch:

1. **Create working folders and capture raw intent.**

   ```bash
   mkdir -p drafts prompts runs
   cat <<'EOF' > drafts/onboarding-notes.md
   Need a documentation prompt for our onboarding bot.
   Highlight every user touchpoint after signup.
   Specify telemetry/events and approval workflow.
   Prefer Functional TypeScript and markdown tables.
   EOF
   ```

2. **Export credentials + build once.**

   ```bash
   export OPENAI_API_KEY=sk-...
   npx nx run prompt-maker-cli:build --skip-nx-cache
   ```

   > Swap the env var for `GEMINI_API_KEY` if you want Gemini by default. The CLI reads either the env var or `promptGenerator.defaultModel` from the config file.

3. **Generate a draft prompt and store the console transcript.**

   ```bash
   node apps/prompt-maker-cli/dist/index.js generate \
     --intent-file drafts/onboarding-notes.md \
     --model gpt-4o-mini \
     | tee prompts/onboarding-generated.md
   ```

   - `tee` mirrors the stdout block (“AI Prompt Generator…”) into `prompts/onboarding-generated.md`.
   - Use `--copy` to mirror the same text into your clipboard for immediate pasting.

4. **Capture deterministic JSON for automation.**

   ```bash
   node apps/prompt-maker-cli/dist/index.js \
     --intent-file drafts/onboarding-notes.md \
     --model gpt-4o-mini \
     --json \
     > runs/onboarding-generate-001.json
   jq -r '.prompt' runs/onboarding-generate-001.json > prompts/onboarding-generated.md
   ```

5. **Add a polish pass when ready.**

   ```bash
   node apps/prompt-maker-cli/dist/index.js \
     --intent-file drafts/onboarding-notes.md \
     --model gpt-4o-mini \
     --polish \
     --json \
     | tee runs/onboarding-polished.json \
     | jq -r '.polishedPrompt // .prompt' > prompts/onboarding-polished.md
   ```

6. **Repeat as the intent evolves.**
   - Bump the `runs/*.json` filename (`002`, `003`, …) to keep an audit trail.
   - Only interactive editing (section 5) modifies the intent; non-interactive runs are deterministic given the same input file.

## 5. Interactive refinement walkthrough

Interactive mode lets you stay inside the terminal and append refinement notes between generations.

```bash
node apps/prompt-maker-cli/dist/index.js generate \
  --intent-file drafts/onboarding-notes.md \
  --interactive \
  --model gemini-1.5-flash \
  --open-chatgpt
```

Sample transcript:

```text
AI Prompt Generator
────────────────────
Generated prompt:
(Role/Context/Constraints block …)

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

Tips:

- Press **Enter** on an empty line to accept the current draft during the refinement prompt.
- Each refinement is appended to the request, so iteration 3 sees everything from iterations 1 and 2.
- `--copy` and `--open-chatgpt` always act on the _final_ artifact (polished if requested).
- Interactive mode writes nothing to `stdout` suitable for `jq`; add `--json` only when running non-interactively.

## 6. Automation patterns

- **JSON to Markdown:** `node ... --json | jq -r '.prompt' > prompts/foo.md`
- **Watch mode:** `while inotifywait drafts/onboarding-notes.md; do node ... --json > runs/latest.json; done`
- **Clipboard-only:** `node ... generate --copy > /dev/null`
- **Split capture:** `node ... generate --model gemini-1.5-flash | tee prompts/foo.md | pbcopy`
- **Polish after generation:** `node ... generate > prompts/foo.md && node ... --intent-file prompts/foo.md --polish --json`

## 7. Polish pass reference

`--polish` reuses the generated contract and runs it through a constrained “tightening” prompt. By default it uses the same provider/model as generation, but you can override it:

```bash
# Generate with Gemini, polish with GPT
export GEMINI_API_KEY=...
export OPENAI_API_KEY=...
node apps/prompt-maker-cli/dist/index.js \
  --intent-file drafts/onboarding-notes.md \
  --model gemini-1.5-flash \
  --polish \
  --polish-model gpt-4o-mini \
  --json \
  | jq -r '.polishedPrompt'
```

Polish output is included inline when running without `--json` and lives under `.polishedPrompt` (plus `.polishModel`) in JSON mode. If the polish request fails, the CLI surfaces the error message but still returns the generated prompt.

## 8. Provider configuration

Instead of exporting env vars every time, drop a config file so the CLI can resolve defaults automatically:

```json
// ~/.config/prompt-maker-cli/config.json
{
  "openaiApiKey": "sk-...",
  "openaiBaseUrl": "https://api.openai.com/v1",
  "geminiApiKey": "gk-...",
  "geminiBaseUrl": "https://generativelanguage.googleapis.com",
  "promptGenerator": {
    "defaultModel": "gemini-1.5-flash"
  }
}
```

Set `PROMPT_MAKER_CLI_CONFIG=/path/to/config.json` to read a different location. When both env vars and config fields exist, env vars win.

## 9. Generator recipe pack

Use these to smoke-test releases or to demonstrate the CLI. Add `--polish` whenever you want the finishing pass, and swap `--model gpt-4o-mini` for `--model gemini-1.5-flash` if you prefer Gemini.

1. **Cover letter coach**

   ```bash
   prompt-maker-cli "Write a confident cover letter for a Staff Product Manager at Linear. Mention AI planning systems and quantified GTM wins." \
     --model gpt-4o-mini
   ```

2. **Scraper scaffold**

   ```bash
   prompt-maker-cli generate "Need a Bun + TypeScript CLI that scrapes Hacker News hourly and posts deltas to Slack. Deploy on Fly.io." \
     --model gpt-4o-mini --copy
   ```

3. **Data-science experiment brief**

   ```bash
   prompt-maker-cli generate "Design an A/B test to compare personalized onboarding tooltips vs control. Include telemetry requirements and success metrics." \
     --model gemini-1.5-flash
   ```

4. **LOBE-style creative brief**

   ```bash
   prompt-maker-cli "Create a LOBE design brief for a mobile habit tracker with AR streak visualizations." \
     --model gpt-4o-mini --open-chatgpt
   ```

5. **Refinement test**

   ```bash
   prompt-maker-cli generate "Summarize all TypeScript migration tasks for a monorepo" --interactive
   # When prompted, add: Prioritize Nx + Vite workspaces and mention lint fixes.
   ```

6. **Travel app build brief (file-based)**

   ```bash
   cat <<'EOF' > drafts/travel-app-notes.md
   Please help me craft a prompt to build code for my travel app.
   - Must support itinerary planning, hotel search, GPT-powered chat.
   - Mobile-first React Native + Expo.
   - Existing API gateway (/trips and /deals).
   - Budget reminders + offline cache.
   - Deliverables must include suggested folder structure and CI steps.
   EOF

   prompt-maker-cli --intent-file drafts/travel-app-notes.md --model gpt-4o-mini --polish
   ```

## 10. NeoVim / agent spec sheet (generate-only)

- **Mission:** Take an existing buffer/selection, send it through `prompt-maker-cli`’s generator, optionally run the polish pass, and present the results inline.
- **Commands:**
  - `:PromptMakerGenerate` → `prompt-maker-cli --json --model <default> [--polish]` (parse `.prompt` / `.polishedPrompt`).
  - `:PromptMakerGenerateInteractive` → run interactively (stream stdout) for refinements.
  - `:PromptMakerGeneratePolish` → same as `:PromptMakerGenerate` but forces `--polish`.
- **Inputs:**
  - Intent text from the buffer, visual selection, or a temp file.
  - Optional CLI config/ENV for provider defaults.
- **Outputs to capture:**
  - `.prompt` (always present in JSON mode).
  - `.polishedPrompt` and `.polishModel` when `--polish` succeeds.
  - Raw stdout when running interactively (render inside a floating window or scratch buffer).
- **Error handling:**
  - Non-zero exit → show stderr in a quickfix list.
  - Malformed JSON → display the raw output for debugging.
- **Automation:**
  - Cache the latest JSON response per buffer so you can re-open it without re-running the CLI.
  - Offer a toggle to run polish automatically when the user exports/shares a prompt.

With these steps you can rely solely on the generator (plus optional polish) across terminals, editors, or scripts—no clarifying-question flow required.
