# The prompt-maker-cli Cookbook

**prompt-maker-cli** is a generate-only CLI that assembles rich prompt contracts from intent, file context, and optional media before handing them to your preferred LLM. Under the hood (`apps/prompt-maker-cli/src/generate-command.ts`) it resolves context, streams telemetry, optionally refines interactively, and can polish or template the final artifact. Use this cookbook to master prompting strategies, flag orchestration, and real-world recipes.

## Prompting Masterclass

### Mental Models that Travel Across Models

- **Chain of Thought (CoT)**: Ask the model to reason step-by-step when tackling logic-heavy work (tracing bugs, drafting proofs). Combine CoT language in your intent with `--interactive` so you can append refinement instructions as fresh insights appear.
- **Few-Shot Priming**: Embed curated exemplars via `-c examples/*.md` or `--context-template` to bias style and structure. Works best for deterministic models like GPT-4 Turbo or Claude 3 Opus—keep examples concise to avoid token bloat (monitor via the CLI’s token telemetry panel).
- **Persona Adoption**: State the persona plus decision criteria directly in the intent (`"Adopt the voice of a staff engineer..."`) or maintain persona snippets in markdown files referenced through `-c personas/staff-engineer.md`. Personas pair well with the polish pass because the `POLISH_SYSTEM_PROMPT` preserves headings while tightening tone.
- **Constraint Stacking**: The CLI’s default format enforces Context → Intent → Output Format; use bullet lists, acceptance criteria, and schema-like checklists to corral powerful models. When you need absolute structure, emit `--json` so downstream tools can parse the run artifact.

### Model-Specific Tactics

- **OpenAI / Anthropic**: Favor detailed work orders with enumerated deliverables; use `--polish` to squeeze extra clarity after interactive refinement.
- **Gemini**: Lean into multimodal runs—`--image` and `--video` feed attachments through `prompt-generator-service`, and when a video is present the CLI automatically swaps in a Gemini 1.5 model so you stay within supported modalities.
- **Smaller / Local Models**: Prune context aggressively. Combine targeted globs (`-c "src/core/**/*.ts"`) with `--smart-context` to fetch only the top-N embedding matches, keeping token counts within local limits.

### Automating Prompt Structure

1. **Context**: Mix and match `-c/--context` globs, `--url`, and `--smart-context` (which indexes files under `--smart-context-root` via `smart-context-service.ts`). Use `--show-context` or `--context-file` with `--context-format json` to inspect what will be sent upstream.
2. **Intent**: Pass a positional string, pipe stdin, or rely on `--intent-file/-f`. The parser prevents ambiguous mixes (inline + file) so you always know which source won.
3. **Output Format & Delivery**: Apply a template (`--context-template nvim`), request a polish pass (`--polish`/`--polish-model`), copy results to the clipboard (`--copy`), or jump straight into ChatGPT (`--open-chatgpt`). Interactive refinement and JSON streaming (`--stream jsonl`) round out the automation loop.

## Flag Strategy & Mechanics

### Core Run Modes

- `--interactive/-i`: Launches a refinement loop (TTY or `--interactive-transport`). You can add instructions between iterations; transport mode enables external tooling to push JSON commands.
- `--json`: Emits the final payload as structured JSON; **cannot** be combined with `--interactive` (see the guard at line 305), so pick one output path.
- `--stream jsonl`: Mirrors telemetry and lifecycle events to stdout—ideal for logging or UI bridges. Combine with `--quiet` to suppress boxed UI while still receiving machine-friendly events.

### Context Assembly Flags

- `-c/--context <glob>`: Backed by `fast-glob`, supports includes/excludes (prefix with `!`), repeatable. Great for language- or folder-specific pulls.
- `--url <link>`: Fetches remote docs with progress callbacks.
- `--smart-context`: Runs the RAG pipeline (`smart-context-service.ts`) to index code/text under the current working tree or a custom `--smart-context-root`, automatically attaching the top 5 files under 25 KB.
- `--show-context`, `--context-file`, `--context-format text|json`: Inspect or persist the resolved context envelope for auditing.

### Media Inputs

- `--image <path>`: Attaches one or more images; they flow through to the prompt generator for multimodal models such as GPT-4o or Gemini.
- `--video <path>`: Triggers the Gemini pipeline. `generate-command.ts` switches the model to `resolveGeminiVideoModel()` (default `gemini-1.5-pro`) if you didn’t already choose a Gemini target. Uploads run through `media-loader.ts`, which requires `GEMINI_API_KEY` and polls `GoogleAIFileManager` until the file becomes ACTIVE.

### Output Tailoring

- `--polish`, `--polish-model`: Runs a final LLM pass with the baked-in system prompt to tighten formatting while preserving structure.
- `--context-template <name>`: Wraps the final prompt inside a named template (`nvim` is built-in; custom templates live in CLI config). The parser enforces non-empty template names.
- `--copy`, `--open-chatgpt`: Quality-of-life delivery flags.

### High-Value Combinations

- `--smart-context` + `--interactive`: Start with an embedding-ranked snapshot, then iteratively refine based on what you learn during the session—ideal for sprawling repos.
- `-c "<glob>"` + `--context-file prompt-context.md`: Capture exactly which files were read so teammates can replay the run.
- `--stream jsonl` + `--json`: Mirror real-time telemetry to stdout while still writing the final artifact to history and disk.
- `--context-template nvim` + `--copy`: Spits out an editor-ready buffer and places it on your clipboard for immediate paste.
- `--video` + `--polish`: Lean on Gemini for multimodal understanding, then run a polish pass (which reuses the Gemini credentials) for clean instructions.

### Conflicts and Guardrails

- `--json` vs `--interactive`: Mutually exclusive; the CLI throws early to prevent orphaned interactive sessions.
- Inline intent vs `--intent-file`: You must pick one; `resolveIntent()` enforces this and warns if you accidentally pass a file path immediately after `-i`.
- `--video` vs non-Gemini models: The CLI silently upgrades your model to Gemini 1.5 Pro to avoid unsupported media combinations—plan tokens accordingly and ensure `GEMINI_API_KEY` is set.
- `--interactive` without a TTY: The CLI warns and downgrades to non-interactive mode; use `--interactive-transport` for headless setups.
- Empty `--context-template` or `--interactive-transport`: The parser trims values and rejects blank strings so you don’t end up with silent no-ops.

## Debugging Prompt Runs

- **Trace Context Inputs**: Pair `--show-context` with `--context-format json` during dry runs to print the exact `<file>` payloads gathered by `resolveFileContext` and `resolveSmartContextFiles`. When you need an audit trail, add `--context-file tmp/context-dump.md` to persist the snapshot that fed the LLM.
- **Watch Token Telemetry**: Every generation prints a Context Telemetry box sourced from `countTokens()`. Large spikes in `fileTokens` signal sloppy globs; tighten them or let `--smart-context` re-rank files automatically.
- **Stream Everything**: `--stream jsonl` mirrors `progress.update`, `generation.iteration.*`, and `upload.state` events to stdout. Pipe this into `jq` or a log shipper to correlate prompt iterations with downstream LLM responses.
- **Replay with History Artifacts**: `--json` writes the final payload (intent, context paths, iterations, polish metadata) and `appendToHistory()` stores it locally. Diff these blobs to understand how refinements changed the contract over time.
- **Interactive Diagnostics**: In TTY mode, each refinement is boxed via `displayPrompt()`. When headless, use `--interactive-transport /tmp/prompt.sock` and send JSON commands from another process; hook into the emitted `transport.*` events to orchestrate automated QA.
- **Media Upload Issues**: Stuck video uploads surface as repeated `upload.state` events. If they never flip from `start` to `stop`, confirm `GEMINI_API_KEY` and MIME support in `media-loader.ts` (e.g., `.mp4`, `.webm`).
- **Spinner Hygiene**: Disable spinners with `--progress=false` when your logs run in CI/CD; combine with `--quiet` to keep transcripts clean while still consuming JSONL telemetry.

## Template Playbook

- **Built-in templates**: Pass `--context-template nvim` to wrap the prompt inside the bundled buffer-friendly layout defined in `generate-command.ts`. The template drops your artifact where `{{prompt}}` lives, so headings and shortcuts remain intact.
- **Custom templates**: Add entries to your CLI config (`contextTemplates` map). Reference them with `--context-template my-handoff`. The parser enforces non-empty names and throws if the template is missing, saving you from silent fallbacks.
- **Composable Delivery**: Templates stack with `--copy`, `--open-chatgpt`, and `--context-file`. Render a Neovim scratch buffer, copy it to the clipboard, and archive the text file in one run.
- **Previewing Output**: Pair `--context-template` with `--json` to capture both the raw prompt (in the JSON payload) and the rendered template (saved as `renderedPrompt`). This is handy when diffing changes across runs.

**Example – Sprint Handoff Template**

```bash
prompt-maker-cli "Summarize sprint 42 backend work" \
  -c "src/services/**/*.ts" \
  -c docs/notes/sprint-42.md \
  --context-template nvim \
  --copy
```

This command collects key files, wraps the result in the Neovim template, and drops it on your clipboard so you can open a scratch buffer and paste immediately.

## Developer Recipes

### Recipe: Crash Reproduction Capsule

**Problem**  
QA reported an intermittent null-pointer crash—you need a prompt that guides the LLM through logs, stack traces, and reproduction steps.

**Solution**

```bash
prompt-maker-cli "Diagnose and propose fixes for the null-pointer crash when saving drafts." \
  -c "logs/crash/*.log" \
  -c "src/app/**/DraftService.ts" \
  --smart-context \
  --context-file crash-context.md \
  --json
```

**Discussion**  
Combining explicit globs with `--smart-context` pulls in the most relevant nearby files. Writing `crash-context.md` preserves the exact evidence bundle, while `--json` records iterations/refinements for ticket attachments.

### Recipe: API Contract Snapshot

**Problem**  
You must brief another team on the current REST/GraphQL surface, including payload shapes and validation rules.

**Solution**

```bash
prompt-maker-cli "Summarize public API endpoints with request/response schemas and validation rules." \
  -c "src/api/**/*.ts" \
  -c "docs/api/*.md" \
  --polish \
  --show-context
```

**Discussion**  
The TypeScript + markdown mix gives the model both typed contracts and human notes. `--show-context` lets you validate that only the intended files were loaded, and `--polish` ensures the final document reads like a publishable API brief.

### Recipe: Framework Migration Coach

**Problem**  
You’re migrating from Redux Toolkit to Zustand and need a structured plan referencing existing state slices.

**Solution**

```bash
prompt-maker-cli "Create a step-by-step plan to migrate Redux Toolkit slices to Zustand with shared selectors." \
  -c "src/state/**/*.ts" \
  -c "docs/architecture/state.md" \
  --smart-context-root src \
  --interactive
```

**Discussion**  
Initial context sketches the architecture, while `--interactive` lets you add refinements after the first draft (e.g., “address SSR data hydration”). Restrict smart-context scanning to `src` to keep embeddings fast.

### Recipe: Dependency Upgrade Risk Brief

**Problem**  
Before upgrading `nx` and `vite`, you want a prompt that enumerates risks, test plans, and rollback steps using release notes and local config.

**Solution**

```bash
prompt-maker-cli "Assess upgrading Nx and Vite to the next minor release, listing risky plugins and verification steps." \
  -c package.json \
  -c nx.json \
  -c "docs/releases/nx/*.md" \
  --polish-model gpt-4o-mini \
  --copy
```

**Discussion**  
Pointing to config files plus curated release notes equips the model with both current state and vendor guidance. Overriding the polish model keeps consistency with other platform reviews, and `--copy` macros the result straight into your change request doc.

## Git Commit Workflows

### Recipe: Conventional Commit Forges

**Problem**  
You want consistent conventional commit messages derived from the staged diff plus nearby docs.

**Solution**

```bash
git diff --cached > /tmp/staged.patch && \
prompt-maker-cli "Write a conventional commit message with summary + body + testing notes." \
  -c /tmp/staged.patch \
  -c docs/CONTRIBUTING.md \
  --polish \
  --copy
```

**Discussion**  
Export the staged diff to a temp file so `-c` can ingest it alongside your contributing guide. The polish pass enforces tone guidelines, while `--copy` lets you paste the final result directly into `git commit`.

### Recipe: Multi-Commit Release Notes

**Problem**  
You’re preparing a release branch and want a prompt that condenses the last N commits into user-facing notes plus internal TODOs.

**Solution**

```bash
git log -n 20 --pretty=medium > /tmp/release-log.txt && \
prompt-maker-cli "Summarize these commits into release highlights, breaking changes, and QA focus." \
  -c /tmp/release-log.txt \
  -c CHANGELOG.md \
  --context-template nvim \
  --json
```

**Discussion**  
Feeding `git log` output plus the existing changelog ensures the model sees both history and format expectations. Capturing JSON output gives you a structured artifact you can commit or attach to release tickets.

## Editor Workflow Recipes

### Recipe: VS Code Task Runner

**Problem**  
You want a one-click VS Code task that summarizes the currently open file plus related tests for rubber-ducking.

**Solution**

```bash
prompt-maker-cli "Explain the active module, its dependencies, and edge cases." \
  -c "${file}" \
  -c "${workspaceFolder}/src/**/*.spec.ts" \
  --smart-context-root ${workspaceFolder} \
  --context-template nvim
```

**Discussion**  
Define this as a VS Code task with `type: shell` so `${file}` and `${workspaceFolder}` expand automatically. The smart-context scan pulls in nearby helpers while the template keeps the response readable inside VS Code’s terminal panel.

### Recipe: JetBrains External Tool for Code Reviews

**Problem**  
You need an IDE command (WebStorm, IntelliJ, etc.) that packages currently selected files and generates code-review talking points.

**Solution**

```bash
prompt-maker-cli "Prepare code review notes for the selected files, focusing on risks and tests." \
  -c "$FilePath$" \
  -c "$ContentRoot$/tests/**/*.ts" \
  --show-context \
  --polish
```

**Discussion**  
Configure an External Tool that sends `$FilePath$` and `$ContentRoot$` placeholders. JetBrains pipes output to the Run tool window, so `--show-context` doubles as a sanity check before you paste the generated review notes into your PR.

### Recipe: Zed Editor Tasks for Pairing Sessions

**Problem**  
You’re hosting a remote pairing session in Zed and want quick, repeatable prompts capturing the current pane and design doc.

**Solution**

```bash
prompt-maker-cli "Act as a pairing partner; summarize this buffer and list open design questions." \
  -c "$ZED_FOCUSED_FILE" \
  -c docs/design/active/*.md \
  --progress=false \
  --stream jsonl
```

**Discussion**  
Register a Zed Task that exports `ZED_FOCUSED_FILE`. Disabling the spinner keeps Zed’s task output tidy, while JSONL streaming lets you capture telemetry in a side panel or send it to collaborators via `websocat`.

## NeoVim Plugin Integration Recipes

### Recipe: Buffer Snapshot from a Plugin Command

**Problem**  
You maintain a NeoVim plugin that exports the active buffer to a temp file and wants prompt-maker-cli to ingest it with surrounding context.

**Solution**

```bash
prompt-maker-cli "Review the attached buffer for race conditions and propose fixes." \
  -c "/tmp/nvim-buffer-*.md" \
  --context-template nvim \
  --copy
```

**Discussion**  
Have your plugin write the current buffer to `/tmp/nvim-buffer-<id>.md`, then call the CLI via `vim.fn.jobstart`. Using the `nvim` template means the returned prompt is already formatted for a scratch buffer.

### Recipe: Interactive Refinement via Remote Transport

**Problem**  
You want the plugin to send refinement commands without leaving NeoVim.

**Solution**

```bash
prompt-maker-cli "Draft a refactor plan for the active file." \
  -c "/tmp/nvim-buffer-current.ts" \
  --interactive-transport /tmp/prompt-maker.sock \
  --stream jsonl
```

**Discussion**  
The plugin listens for `interactive.awaiting` events from the JSONL stream and surfaces prompts inside NeoVim. Users type refinements, and the plugin pushes `{"type":"refine","instruction":"..."}` messages through the Unix socket.

### Recipe: Project-Wide Summaries from Telescope Picks

**Problem**  
You use Telescope to select files and want to pass all selections as context without manual globs.

**Solution**

```bash
prompt-maker-cli "Summarize the selected files for code review notes." \
  -c "/tmp/nvim-selected-files/*.md" \
  --smart-context-root $(pwd) \
  --context-template nvim \
  --progress=false
```

**Discussion**  
The plugin writes each Telescope selection to `/tmp/nvim-selected-files/`. Adding `--smart-context-root` brings in nearby matches, while `--progress=false` keeps Neovim’s command output clean during background runs.

## Recipes

### Recipe: Advanced Context Selection

**Problem**  
You need every TypeScript file under `src/`, but none of the tests or stories should pollute the prompt.

**Solution**

```bash
prompt-maker-cli "Document the shared data loader contract" \
  -c "src/**/*.ts" \
  -c "!src/**/*.test.ts" \
  -c "!src/**/*.spec.ts" \
  -c "!src/**/__tests__/**" \
  --show-context --context-format json
```

**Discussion**  
`fast-glob` honors negated patterns, so you can stack `!` excludes to prune tests. `--show-context --context-format json` prints the resolved files (path + content) to stderr/stdout so you can verify exactly what the LLM sees before generating.

---

### Recipe: Image Enhancement with “Nano Banana”

**Problem**  
You want to attach a marketing mockup and have your AI partner—code-named **Nano Banana**—describe improvements for accessibility and polish.

**Solution**

```bash
prompt-maker-cli "Nano Banana, critique and enhance the attached hero mockup for accessibility and contrast." \
  --image assets/hero-v2.png \
  --polish \
  --model gpt-4o-mini
```

**Discussion**  
`--image` accepts repeatable paths, so drop in multiple angles if needed. Mention Nano Banana directly in the intent to anchor the persona. Adding `--polish` runs the meta-refinement pass, giving you a crisp, well-structured instruction set tailored to GPT-4o’s multimodal strengths.

---

### Recipe: Shopping Assistant Prompt

**Problem**  
You need a prompt that tells an LLM to comb Amazon for a specific brand/price window and report recommended products.

**Solution**

```bash
prompt-maker-cli "Research Amazon listings for Breville espresso machines under $900 and surface top 3 matches with pros/cons, freshness check, and price volatility notes." \
  --context-template nvim \
  --copy
```

**Discussion**  
Here the intent fully encodes the search criteria, and `--context-template nvim` wraps the response in a scratch-buffer-friendly format so you can paste it into Neovim and keep iterating. `--copy` places the final prompt on your clipboard for immediate use in your preferred chat client.

---

### Recipe: Engineering / CAD Generation

**Problem**  
You must solicit OpenSCAD or Python (CadQuery) code that produces a printable enclosure, combining local design guidelines as context.

**Solution**

```bash
prompt-maker-cli "Produce OpenSCAD or CadQuery code for a snap-fit Raspberry Pi 5 enclosure with filleted edges and removable lid." \
  -c "docs/cad/clearance-table.md" \
  -c "docs/cad/materials/*.md" \
  --smart-context --smart-context-root ./hardware \
  --interactive
```

**Discussion**  
Static globs inject canonical clearance/material tables, while `--smart-context` surfaces the five most relevant hardware notes under `./hardware`. Kick on `--interactive` to iterate: after each draft, feed refinements like “increase wall thickness to 2.2 mm” without rebuilding the command.

---

### Recipe: Genealogical Research Plan

**Problem**  
You need a structured research strategy for a specific ancestor, weaving in source notes stored locally.

**Solution**

```bash
prompt-maker-cli "Draft a genealogical research plan for Mary O'Hara (b. 1884, County Mayo → Boston 1906)." \
  -c "research/mayo-family/*.md" \
  --smart-context-root research \
  --context-file mary-ohara-plan.md \
  --context-format text \
  --json
```

**Discussion**  
The CLI resolves explicit notes plus smart-context matches from the broader `research` directory, then writes the merged context to `mary-ohara-plan.md` for archival. `--json` emits the final prompt payload (intent, context paths, iterations) so you can log runs programmatically—remember this disables interactive mode.

---

### Recipe: Martial Arts Video Analysis

**Problem**  
You captured a sparring session and need a prompt that asks the model to analyze timing, guard discipline, and footwork.

**Solution**

```bash
prompt-maker-cli "Break down this kali sparring clip—focus on timing windows, guard recovery, and footwork corrections." \
  --video media/kali-round3.mp4 \
  --model gemini-1.5-pro \
  --polish \
  --progress=false
```

**Discussion**  
Passing `--video` causes `generate-command.ts` to call `resolveGeminiVideoModel()`, overriding non-Gemini choices with `gemini-1.5-pro` so the Files API can ingest your clip. The upload path (`media-loader.ts`) demands a readable file and `GEMINI_API_KEY`; the CLI shows upload progress via `upload.state` events. Gemini’s multimodal context pairs well with a polish pass to distill the final coaching checklist.

---

Let me know if you’d like this saved into the repo or expanded with additional recipes/tests.
