# I Prompt Generator
────────────────────
Generated prompt:

Role:
You are an experienced Neovim plugin author and TypeScript/Lua developer. You are building a Neovim plugin that integrates tightly with the `prompt-maker-cli` tool to generate and polish AI prompts directly from within Neovim. You understand Neovim’s Lua API, async job control, buffer/window management, and how to design ergonomic user commands and keymaps.

Context:
- The goal is to create a Neovim plugin that lets users:
  - Generate prompts from selected text or the current buffer/file using `prompt-maker-cli`.
  - Polish existing prompts using the CLI’s `--polish` feature.
  - Choose models for generation and polishing.
  - Configure default models and CLI parameters.
  - See results in a new buffer for further editing.
  - Get clear error feedback when the CLI fails.
  - Install and use the plugin via standard Neovim plugin managers.

- Prompt Maker CLI basics:
  - Single entry point: `prompt-maker-cli` (globally installed) or `node apps/prompt-maker-cli/dist/index.js`.
  - Key flags:
    - `<intent>`: inline text.
    - `-f, --intent-file <path>`: read intent from file.
    - `--model <name>`: generation model (e.g., `gpt-4o-mini`, `gemini-1.5-flash`).
    - `--polish`: run a polishing pass.
    - `--polish-model <name>`: override polish model (defaults to generation model).
    - `--json`: emit JSON with `.prompt` and optionally `.polishedPrompt`.
  - JSON output fields of interest:
    - `.prompt` (always present in JSON mode).
    - `.polishedPrompt` and `.polishModel` when `--polish` is used and succeeds.
  - Non-interactive JSON mode is deterministic given the same input file and flags.
  - Interactive mode (`--interactive`) is TTY-only and not JSON-friendly; it streams a conversational transcript to stdout.

- Desired Neovim plugin behavior:
  - Commands:
    - `:PromptMakerGenerate`:
      - Take intent from:
        - Visual selection (if active), or
        - Entire current buffer, or
        - Optionally a provided file path argument.
      - Run `prompt-maker-cli` in non-interactive JSON mode:
        - `prompt-maker-cli --json --model <default or user-specified> [--polish]` with `--intent-file` pointing to a temp file containing the intent.
      - Parse JSON and open a new scratch buffer with the resulting prompt text:
        - If `--polish` was used and `.polishedPrompt` exists, use that.
        - Otherwise, use `.prompt`.
    - `:PromptMakerGeneratePolish`:
      - Similar to `:PromptMakerGenerate` but always adds `--polish`.
      - Optionally allows specifying a `--polish-model` different from `--model`.
    - `:PromptMakerGenerateInteractive`:
      - Run `prompt-maker-cli generate --interactive` with intent from selection/buffer.
      - Stream stdout into a floating window or scratch buffer so the user can see the interactive refinement loop.
      - This mode does not rely on `--json`; it just shows raw output.
  - Keybindings:
    - Provide default (but configurable) mappings, for example:
      - Normal mode:
        - `<leader>pg` → run `:PromptMakerGenerate` on the current buffer.
        - `<leader>pp` → run `:PromptMakerGeneratePolish` on the current buffer.
      - Visual mode:
        - `<leader>pg` → run `:PromptMakerGenerate` on the selection.
        - `<leader>pp` → run `:PromptMakerGeneratePolish` on the selection.
    - Allow users to disable or override default mappings via plugin configuration.

  - Buffer behavior:
    - Generated/polished prompt should appear in:
      - A new scratch buffer (unlisted, no file on disk by default).
      - Optionally in a split or tab, configurable by the user.
    - The buffer should be modifiable so users can edit the prompt further.
    - Consider setting a custom filetype (e.g., `promptmaker` or `markdown`) for syntax highlighting.

  - Error handling:
    - Use Neovim’s async job APIs (`vim.system` or `vim.fn.jobstart`) to run the CLI.
    - On non-zero exit code:
      - Capture stderr and show it via:
        - `vim.notify` with `vim.log.levels.ERROR`, and/or
        - A quickfix list populated with the error output.
    - On malformed JSON in non-interactive mode:
      - Show a clear error notification.
      - Optionally open a scratch buffer with the raw stdout for debugging.
    - If `prompt-maker-cli` is not found in `$PATH`:
      - Detect this early and show a helpful message explaining how to install it.

  - Configuration:
    - Provide a `setup` function to configure:
      - `cmd`: how to invoke the CLI (default: `"prompt-maker-cli"`).
      - `default_model`: default generation model (e.g., `"gpt-4o-mini"` or `"gemini-1.5-flash"`).
      - `default_polish_model`: default polish model (optional; if nil, reuse `default_model`).
      - `auto_polish`: boolean to automatically add `--polish` for certain commands.
      - `open_in`: how to display results (`"split"`, `"vsplit"`, `"tab"`, `"float"`).
      - `keymaps`: table to enable/disable or customize default mappings.
      - `extra_args`: list of extra CLI flags to always pass (e.g., `{"--copy"}`).
      - `env`: optional environment variables to pass to the CLI process (e.g., API keys or `PROMPT_MAKER_CLI_CONFIG`).
    - Respect user config and merge with sensible defaults.

  - Caching:
    - Optionally cache the latest JSON response per source buffer:
      - Store it in a Lua table keyed by buffer number.
      - Provide a command like `:PromptMakerShowLast` to reopen the last generated/polished prompt without re-running the CLI.
    - This is a “nice to have” but not mandatory.

  - Documentation:
    - Provide clear documentation explaining:
      - Installation via common plugin managers (lazy.nvim, packer.nvim, etc.).
      - Requirements:
        - Neovim version (e.g., 0.9+).
        - Node.js 18+ and `prompt-maker-cli` installed globally (`npm install -g` from the repo).
        - Provider credentials (`OPENAI_API_KEY` or `GEMINI_API_KEY`) or config file at `~/.config/prompt-maker-cli/config.json`.
      - Configuration options with examples:
        - Setting default models.
        - Customizing keymaps.
        - Choosing how results are displayed.
        - Passing environment variables or custom CLI paths.
      - Usage examples:
        - Generate from visual selection.
        - Generate from entire buffer.
        - Polish an existing prompt buffer.
        - Use a different model or polish model via command arguments.
      - Troubleshooting:
        - CLI not found.
        - Missing API keys.
        - JSON parse errors.
        - Non-zero exit codes.

Constraints:
- Use Lua for the Neovim plugin implementation.
- Target modern Neovim (0.8+ or 0.9+); prefer `vim.system` if available, but gracefully fall back to `vim.fn.jobstart` for older versions.
- Do not require external Lua dependencies beyond what is bundled with Neovim.
- The plugin should:
  - Not block the UI while the CLI runs (use async jobs and callbacks).
  - Handle large selections/buffers by writing them to a temp file and passing `--intent-file` to the CLI.
  - Avoid hard-coding provider-specific details; rely on CLI config/env for provider defaults.
- The plugin should not implement its own AI logic; it must delegate all generation/polish behavior to `prompt-maker-cli`.
- Keep the public API small and ergonomic:
  - A single `setup` function for configuration.
  - A few well-named user commands.
  - Optional Lua functions exposed for advanced users (e.g., `require("promptmaker").generate(opts)`).

Output Format:
Produce the following:

1. **High-level design description**
   - Explain the overall architecture of the plugin.
   - Describe how commands, keymaps, async job handling, and buffer management will work.
   - Describe how configuration will be structured and merged with defaults.
   - Describe how model selection and polish options will be surfaced to the user (e.g., command arguments, config, or both).

2. **Suggested tech stack**
   - Confirm Neovim version assumptions.
   - Confirm use of Lua and any Neovim APIs (`vim.system`, `vim.fn.jobstart`, `vim.api.nvim_*`).
   - Mention any optional integrations (e.g., telescope, if you think it’s useful) but keep them optional.

3. **File and directory structure**
   - Propose a concrete file layout for the plugin, for example:
     - `lua/promptmaker/init.lua`
     - `lua/promptmaker/config.lua`
     - `lua/promptmaker/cli.lua`
     - `lua/promptmaker/ui.lua`
     - `plugin/promptmaker.vim`
     - `doc/promptmaker.txt` (or `README.md`).
   - Briefly describe the responsibility of each file/module.

4. **Core implementation sketches (Lua)**
   - Provide reasonably complete (but still example-level) Lua code for:
     - The `setup` function and default configuration.
     - The CLI invocation helper that:
       - Writes intent to a temp file.
       - Builds the CLI command with `--json`, `--model`, `--polish`, `--polish-model`, etc.
       - Runs the job asynchronously and returns stdout, stderr, and exit code via a callback.
     - JSON parsing and error handling logic.
     - Creating and populating the result buffer (scratch buffer, split/tab/float).
     - The user commands:
       - `:PromptMakerGenerate[!]` (with optional args for model/polish).
       - `:PromptMakerGeneratePolish[!]`.
       - `:PromptMakerGenerateInteractive`.
     - Default keymap setup that respects user overrides.

   - The code does not need to be fully production-ready, but it should be coherent and close enough that a developer could copy it into a plugin and adapt it.

5. **Documentation outline**
   - Provide an outline (and short example content) for:
     - `README.md` or `doc/promptmaker.txt`:
       - Installation.
       - Configuration.
       - Usage examples.
       - Troubleshooting.

Focus on producing a cohesive, end-to-end design and implementation sketch that a Neovim/Lua developer can use as a strong starting point to implement the plugin.

Polished prompt
────────────────────
Intent:
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

| Flag / Command             | Description                                                                |
| -------------------------- | -------------------------------------------------------------------------- |
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
  - Automation:
  - Cache the latest JSON response per buffer so you can re-open it without re-running the CLI.
  - Offer a toggle to run polish automatically when the user exports/shares a prompt.

With these steps you can rely solely on the generator (plus optional polish) across terminals, editors, or scripts—no clarifying-question flow required.
---
Generated prompt candidate:
Role:
You are an experienced Neovim plugin author and TypeScript/Lua developer. You are building a Neovim plugin that integrates tightly with the `prompt-maker-cli` tool to generate and polish AI prompts directly from within Neovim. You understand Neovim’s Lua API, async job control, buffer/window management, and how to design ergonomic user commands and keymaps.

Context:
- The goal is to create a Neovim plugin that lets users:
  - Generate prompts from selected text or the current buffer/file using `prompt-maker-cli`.
  - Polish existing prompts using the CLI’s `--polish` feature.
  - Choose models for generation and polishing.
  - Configure default models and CLI parameters.
  - See results in a new buffer for further editing.
  - Get clear error feedback when the CLI fails.
  - Install and use the plugin via standard Neovim plugin managers.

- Prompt Maker CLI basics:
  - Single entry point: `prompt-maker-cli` (globally installed) or `node apps/prompt-maker-cli/dist/index.js`.
  - Key flags:
    - `<intent>`: inline text.
    - `-f, --intent-file <path>`: read intent from a file.
    - `--model <name>`: generation model (e.g., `gpt-4o-mini`, `gemini-1.5-flash`).
    - `--polish`: run a polishing pass.
    - `--polish-model <name>`: override polish model (defaults to generation model).
    - `--json`: emit JSON with `.prompt` and optionally `.polishedPrompt`.
  - JSON output fields of interest:
    - `.prompt` (always present in JSON mode).
    - `.polishedPrompt` and `.polishModel` when `--polish` is used and succeeds.
  - Non-interactive JSON mode is deterministic given the same input file and flags.
  - Interactive mode (`--interactive`) is TTY-only and not JSON-friendly; it streams a conversational transcript to stdout.

- Desired Neovim plugin behavior:
  - Commands:
    - `:PromptMakerGenerate`:
      - Take intent from:
        - Visual selection (if active), or
        - Entire current buffer, or
        - Optionally a provided file path argument.
      - Run `prompt-maker-cli` in non-interactive JSON mode:
        - `prompt-maker-cli --json --model <default or user-specified> [--polish]` with `--intent-file` pointing to a temp file containing the intent.
      - Parse JSON and open a new scratch buffer with the resulting prompt text:
        - If `--polish` was used and `.polishedPrompt` exists, use that.
        - Otherwise, use `.prompt`.
    - `:PromptMakerGeneratePolish`:
      - Same as `:PromptMakerGenerate` but always adds `--polish`.
      - Optionally allows specifying a `--polish-model` different from `--model`.
    - `:PromptMakerGenerateInteractive`:
      - Run `prompt-maker-cli generate --interactive` with intent from selection/buffer.
      - Stream stdout into a floating window or scratch buffer so the user can see the interactive refinement loop.
      - This mode does not rely on `--json`; it just shows raw output.
  - Keybindings:
    - Provide default (but configurable) mappings, for example:
      - Normal mode:
        - `<leader>pg` → run `:PromptMakerGenerate` on the current buffer.
        - `<leader>pp` → run `:PromptMakerGeneratePolish` on the current buffer.
      - Visual mode:
        - `<leader>pg` → run `:PromptMakerGenerate` on the selection.
        - `<leader>pp` → run `:PromptMakerGeneratePolish` on the selection.
    - Allow users to disable or override default mappings via plugin configuration.

  - Buffer behavior:
    - Generated/polished prompt should appear in:
      - A new scratch buffer (unlisted, no file on disk by default).
      - Optionally in a split or tab, configurable by the user.
    - The buffer should be modifiable so users can edit the prompt further.
    - Consider setting a custom filetype (e.g., `promptmaker` or `markdown`) for syntax highlighting.

  - Error handling:
    - Use Neovim’s async job APIs (`vim.system` or `vim.fn.jobstart`) to run the CLI.
    - On non-zero exit code:
      - Capture stderr and show it via:
        - `vim.notify` with `vim.log.levels.ERROR`, and/or
        - A quickfix list populated with the error output.
    - On malformed JSON in non-interactive mode:
      - Show a clear error notification.
      - Optionally open a scratch buffer with the raw stdout for debugging.
    - If `prompt-maker-cli` is not found in `$PATH`:
      - Detect this early and show a helpful message explaining how to install it.

  - Configuration:
    - Provide a `setup` function to configure:
      - `cmd`: how to invoke the CLI (default: `"prompt-maker-cli"`).
      - `default_model`: default generation model (e.g., `"gpt-4o-mini"` or `"gemini-1.5-flash"`).
      - `default_polish_model`: default polish model (optional; if `nil`, reuse `default_model`).
      - `auto_polish`: boolean to automatically add `--polish` for certain commands.
      - `open_in`: how to display results (`"split"`, `"vsplit"`, `"tab"`, `"float"`).
      - `keymaps`: table to enable/disable or customize default mappings.
      - `extra_args`: list of extra CLI flags to always pass (e.g., `{"--copy"}`).
      - `env`: optional environment variables to pass to the CLI process (e.g., API keys or `PROMPT_MAKER_CLI_CONFIG`).
    - Respect user config and merge with sensible defaults.

  - Caching:
    - Optionally cache the latest JSON response per source buffer:
      - Store it in a Lua table keyed by buffer number.
      - Provide a command like `:PromptMakerShowLast` to reopen the last generated/polished prompt without re-running the CLI.
    - This is a “nice to have” but not mandatory.

  - Documentation:
    - Provide clear documentation explaining:
      - Installation via common plugin managers (lazy.nvim, packer.nvim, etc.).
      - Requirements:
        - Neovim version (e.g., 0.9+).
        - Node.js 18+ and `prompt-maker-cli` installed globally (`npm install -g` from the repo).
        - Provider credentials (`OPENAI_API_KEY` or `GEMINI_API_KEY`) or config file at `~/.config/prompt-maker-cli/config.json`.
      - Configuration options with examples:
        - Setting default models.
        - Customizing keymaps.
        - Choosing how results are displayed.
        - Passing environment variables or custom CLI paths.
      - Usage examples:
        - Generate from visual selection.
        - Generate from entire buffer.
        - Polish an existing prompt buffer.
        - Use a different model or polish model via command arguments.
      - Troubleshooting:
        - CLI not found.
        - Missing API keys.
        - JSON parse errors.
        - Non-zero exit codes.

Constraints:
- Use Lua for the Neovim plugin implementation.
- Target modern Neovim (0.8+ or 0.9+); prefer `vim.system` if available, but gracefully fall back to `vim.fn.jobstart` for older versions.
- Do not require external Lua dependencies beyond what is bundled with Neovim.
- The plugin must:
  - Not block the UI while the CLI runs (use async jobs and callbacks).
  - Handle large selections/buffers by writing them to a temp file and passing `--intent-file` to the CLI.
  - Avoid hard-coding provider-specific details; rely on CLI config/env for provider defaults.
- The plugin must not implement its own AI logic; it must delegate all generation/polish behavior to `prompt-maker-cli`.
- Keep the public API small and ergonomic:
  - A single `setup` function for configuration.
  - A few well-named user commands.
  - Optional Lua functions exposed for advanced users (e.g., `require("promptmaker").generate(opts)`).

Output Format:
Produce the following:

1. **High-level design description**
   - Explain the overall architecture of the plugin.
   - Describe how commands, keymaps, async job handling, and buffer management will work.
   - Describe how configuration will be structured and merged with defaults.
   - Describe how model selection and polish options will be surfaced to the user (e.g., command arguments, config, or both).

2. **Suggested tech stack**
   - Confirm Neovim version assumptions.
   - Confirm use of Lua and relevant Neovim APIs (`vim.system`, `vim.fn.jobstart`, `vim.api.nvim_*`).
   - Mention any optional integrations (e.g., telescope) but keep them strictly optional.

3. **File and directory structure**
   - Propose a concrete file layout for the plugin, for example:
     - `lua/promptmaker/init.lua`
     - `lua/promptmaker/config.lua`
     - `lua/promptmaker/cli.lua`
     - `lua/promptmaker/ui.lua`
     - `plugin/promptmaker.vim`
     - `doc/promptmaker.txt` (or `README.md`).
   - Briefly describe the responsibility of each file/module.

4. **Core implementation sketches (Lua)**
   - Provide reasonably complete (but still example-level) Lua code for:
     - The `setup` function and default configuration.
     - The CLI invocation helper that:
       - Writes intent to a temp file.
       - Builds the CLI command with `--json`, `--model`, `--polish`, `--polish-model`, etc.
       - Runs the job asynchronously and returns stdout, stderr, and exit code via a callback.
     - JSON parsing and error handling logic.
     - Creating and populating the result buffer (scratch buffer, split/tab/float).
     - The user commands:
       - `:PromptMakerGenerate[!]` (with optional args for model/polish).
       - `:PromptMakerGeneratePolish[!]`.
       - `:PromptMakerGenerateInteractive`.
     - Default keymap setup that respects user overrides.

   - The code does not need to be fully production-ready, but it should be coherent and close enough that a developer could copy it into a plugin and adapt it.

5. **Documentation outline**
   - Provide an outline (and short example content) for:
     - `README.md` or `doc/promptmaker.txt`:
       - Installation.
       - Configuration.
       - Usage examples.
       - Troubleshooting.

Focus on producing a cohesive, end-to-end design and implementation sketch that a Neovim/Lua developer can use as a strong starting point to implement the plugin.
---
Return the polished prompt text, preserving exact sections.

(Model: gpt-5.1)
