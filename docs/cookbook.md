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
- `--video <path>`: Triggers the Gemini pipeline. `generate-command.ts` switches the model to `resolveGeminiVideoModel()` (default `gemini-3-pro-preview`) if you didn’t already choose a Gemini target. Uploads run through `media-loader.ts`, which requires `GEMINI_API_KEY` and polls `GoogleAIFileManager` until the file becomes ACTIVE.

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
- **Clipboard & Flag Tracing**: Set `PROMPT_MAKER_DEBUG_FLAGS=1` to log a JSON snapshot of parsed flags (copy, polish, quiet, json, etc.) right after argument parsing. Add `PROMPT_MAKER_COPY_TRACE=1` (or rely on the debug flag) to emit `[pmc:copy …]` diagnostics showing when clipboard writes are attempted, skipped, or fail. Example: `PROMPT_MAKER_DEBUG_FLAGS=1 PROMPT_MAKER_COPY_TRACE=1 prompt-maker-cli --polish --copy …` instantly proves whether the CLI saw `--copy` and what happened inside `clipboardy`.
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

## AI Systems Recipes

### Recipe: Agent Persona Contract

**Problem**
You’re designing a new autonomous agent and need a consistent system prompt that references existing SOPs, guardrails, and escalation rules.

**Solution**

```bash
prompt-maker-cli "Draft an agent persona spec for the Atlas migration agent, including goals, redlines, and escalation protocol." \
  -c agents/atlas/mission.md \
  -c agents/atlas/playbooks/*.md \
  -c security/guardrails.md \
  --context-template nvim \
  --polish
```

**Discussion**
Pulling SOPs and guardrails grounds the agent spec in real policy. The Neovim template yields a ready-to-paste contract, while the polish pass keeps tone tight—perfect for feeding into downstream orchestration frameworks.

### Recipe: MCP Server Capability Brief

**Problem**
You’re exposing a new Model Context Protocol (MCP) server and want a prompt that enumerates capabilities, auth model, and sample invocations for agent developers.

**Solution**

```bash
prompt-maker-cli "Summarize MCP server capabilities (tools, auth, rate limits) for documentation consumers." \
  -c mcp/servers/inventory/**/*.ts \
  -c mcp/docs/authentication.md \
  --smart-context-root mcp \
  --json \
  --context-file docs/mcp/inventory-brief.md
```

**Discussion**
Using both implementation files and docs ensures the LLM sees handler signatures plus narrative context. JSON output can be fed into build steps that publish docs or update MCP registries, while the context file anchors what inputs were used.

### Recipe: Multi-Agent Handoff Matrix

**Problem**
You have multiple specialized agents (research, implementation, QA) and need a structured prompt that defines handoff triggers and shared artifacts.

**Solution**

```bash
prompt-maker-cli "Create a multi-agent collaboration matrix (Research → Build → QA) with handoff triggers and shared artifacts." \
  -c agents/research/*.md \
  -c agents/build/*.md \
  -c agents/qa/*.md \
  -c docs/process/handoff-checklist.md \
  --interactive \
  --context-template nvim
```

**Discussion**
Stacking context from each agent’s playbook plus the handoff checklist produces a unified contract. Interactive mode lets stakeholders refine responsibilities live (e.g., add “QA can bounce back to Research if acceptance criteria missing”). The resulting template is ready to drop into orchestration configs or Confluence.

### Recipe: Auto Tool Discovery Guide

**Problem**
You’re wiring an agent runtime that needs to decide which internal tools to load per request; you want a prompt that inspects tool metadata and emits a selection strategy.

**Solution**

```bash
prompt-maker-cli "Given these tool manifests, decide when to load each tool and define fallback heuristics." \
  -c tools/manifests/**/*.json \
  -c docs/agents/tool-governance.md \
  --smart-context-root tools \
  --polish \
  --context-file agents/tool-discovery-plan.md
```

**Discussion**
Tool manifests plus governance rules allow the model to derive eligibility matrices (“Use `vector-search` when intents mention embeddings, fall back to `doc-search` otherwise”). Persisting the plan to `agents/tool-discovery-plan.md` lets your orchestrator ingest it or flag deviations during audits.

### Recipe: Embedding Pipeline Playbook

**Problem**
You’re rolling out a new embedding pipeline (chunking, filtering, indexing) and want a prompt that stitches together engineering docs, ETL scripts, and schema definitions into a deployment plan.

**Solution**

```bash
prompt-maker-cli "Produce an embedding ingestion playbook (chunking, filters, index rollout) for the Docs corpus." \
  -c pipelines/embeddings/docs/**/*.ts \
  -c pipelines/embeddings/docs/config/*.yaml \
  -c docs/data-quality/*.md \
  --stream jsonl \
  --context-template nvim
```

**Discussion**
Mixing code, config, and policy text yields actionable steps (pre-flight validation, TF-IDF filters, reindex cadence). JSONL streaming captures intermediate telemetry if you need to trace iterations. Pair with `--json` if you want to store the final prompt alongside the rollout ticket.

### Recipe: Evaluation Harness Generator

**Problem**
You need a consistent process for evaluating agent prompts against regression suites (fixtures, rubrics, scoring scripts).

**Solution**

```bash
prompt-maker-cli "Design an evaluation harness (fixtures, metrics, scoring scripts) for the Atlas agent." \
  -c eval/fixtures/atlas/**/*.json \
  -c eval/rubrics/**/*.md \
  -c scripts/metrics/atlas_eval.ts \
  --polish \
  --context-template nvim
```

**Discussion**
By combining fixtures, qualitative rubrics, and scoring code, the CLI outputs a contract describing how to run and interpret evaluations. Feed the result into CI (e.g., nightly evaluation jobs) or share with red teams.

### Recipe: Retriever Tuning Blueprint

**Problem**
Your RAG system needs per-domain retriever settings (chunk sizes, rerankers, max matches). You want a prompt that reviews current telemetry and proposes tuned parameters.

**Solution**

```bash
prompt-maker-cli "Recommend retriever tuning parameters for the Support knowledge base." \
  -c rag/support/telemetry/*.json \
  -c rag/support/config/*.yaml \
  -c docs/rag/retriever-guidelines.md \
  --smart-context-root rag \
  --json
```

**Discussion**
Telemetry plus configs plus guidelines help the model suggest evidence-backed changes. JSON output is perfect for feeding into dashboards or PR bots that annotate config diffs with rationale.

### Recipe: Safety Review Packet

**Problem**
Before launching a new agent, compliance requires a safety packet covering data handling, prompt safeguards, and escalation paths.

**Solution**

```bash
prompt-maker-cli "Assemble a safety review packet for the Commerce agent (data flow, prompt safeguards, escalation)." \
  -c agents/commerce/persona.md \
  -c agents/commerce/prompts/*.md \
  -c security/safety-checklist.md \
  -c docs/legal/data-retention.md \
  --polish \
  --context-file reviews/commerce-safety.md
```

**Discussion**
Mixing persona, prompt contracts, safety checklists, and legal guidance lets the model produce a thorough review doc. Writing to `reviews/commerce-safety.md` ensures auditors and approvers have a consistent artifact to sign off.

### Recipe: Launch Readiness Checklist

**Problem**
Product and Ops need a single document confirming an agent is launch-ready (docs, telemetry, on-call coverage, rollback plan).

**Solution**

```bash
prompt-maker-cli "Create a launch readiness checklist for the Commerce agent (docs, telemetry SLAs, on-call, rollback)." \
  -c agents/commerce/persona.md \
  -c docs/launch/commerce/*.md \
  -c ops/runbooks/commerce-oncall.md \
  -c metrics/commerce/uptime.json \
  --context-template nvim \
  --json
```

**Discussion**
Combining product docs, runbooks, and live metrics results in a comprehensive go/no-go sheet. JSON output can feed dashboards or Slack bots that notify stakeholders when all boxes are checked.

### Recipe: Hallucination Test Suite Plan

**Problem**
Before shipping an assistant, you want targeted hallucination tests covering sensitive topics, long contexts, and out-of-domain queries.

**Solution**

```bash
prompt-maker-cli "Draft a hallucination testing plan (datasets, prompts, scoring) for the Support assistant." \
  -c eval/hallucination/support-fixtures/**/*.json \
  -c docs/safety/hallucination-tests.md \
  -c scripts/eval/hallucination_runner.ts \
  --interactive \
  --context-file eval/support-hallucination-plan.md
```

**Discussion**
The CLI merges fixtures, policy docs, and runner scripts to build a plan across scenarios. Interactive refinement lets researchers iteratively add edge cases discovered mid-review. The saved plan becomes a living document tied to release gates.

### Recipe: Automated Post-Mortem Primer

**Problem**
After an incident, you want a prompt that synthesizes logs, user reports, and recovery steps into a blameless post-mortem draft.

**Solution**

```bash
prompt-maker-cli "Produce a blameless post-mortem draft for incident INC-423 (timeline, impact, action items)." \
  -c incidents/INC-423/logs/*.log \
  -c incidents/INC-423/notes.md \
  -c docs/postmortem/template.md \
  --polish \
  --context-file incidents/INC-423/postmortem-draft.md
```

**Discussion**
Feeding raw logs, investigator notes, and the official template ensures the output respects your post-mortem format. The polish pass tidies tone, while the saved draft accelerates follow-up reviews and action-item tracking.

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

## Self-Directed Learning Recipes

### Recipe: Technical Textbook Navigator

**Problem**
You’re working through a dense systems textbook and want a prompt to summarize each chapter, surface prerequisites, and suggest practice problems.

**Solution**

```bash
prompt-maker-cli "Break down Chapter 6 of 'Distributed Systems' into prerequisites, key ideas, and practice drills." \
  -c notes/distributed-systems/ch06/*.md \
  -c "books/distributed-systems/ch06/**/*.pdf" \
  --context-template nvim \
  --polish
```

**Discussion**
Attach your reading notes plus exported chapter snippets (converted to markdown/pdf text). The template outputs a structured study card, while polishing keeps terminology precise. Repeat per chapter to build a learning map.

### Recipe: Deep Research Dossier

**Problem**
You need a self-study prompt that orchestrates multi-source research (papers, blogs, RFCs) and proposes a reading/experiment plan.

**Solution**

```bash
prompt-maker-cli "Assemble a deep-research plan for vector databases (questions, sources, experiments)." \
  -c research/vector-db/papers/*.md \
  -c research/vector-db/notes/**/*.md \
  -c bookmarks/vector-db/**/*.md \
  --smart-context \
  --json \
  --context-file research/vector-db/dossier.md
```

**Discussion**
Combining curated sources with smart-context ensures the prompt generator sees both high-signal references and ambient notes. JSON output lets you sync the research plan to Notion or Obsidian while the markdown dossier becomes your running log.

### Recipe: Language Learning Companion

**Problem**
You’re teaching yourself Japanese and want prompts that adapt grammar drills to your mistakes and native material.

**Solution**

```bash
prompt-maker-cli "Design a Japanese study session focusing on keigo and business email corrections." \
  -c language/japanese/mistake-log.md \
  -c language/japanese/reading/sales-emails/*.txt \
  --interactive \
  --context-template nvim
```

**Discussion**
Feed the CLI your mistake log plus authentic examples; interactive mode lets you refine instructions after each session (“add listening exercises”, “increase kanji coverage”). The template keeps sections organized (Warm-up, Drills, Reflection) for spaced repetition apps.

### Recipe: Software Engineering Mastery Sprint

**Problem**
You want a weekly mastery plan that targets architectural topics, code katas, and review prompts tailored to your repo.

**Solution**

```bash
prompt-maker-cli "Plan a weekly mastery sprint covering event-driven architecture patterns in this repo." \
  -c "src/**/*.ts" \
  -c docs/architecture/*.md \
  -c notes/learning-goals.md \
  --smart-context \
  --polish \
  --context-file learning/eda-week.md
```

**Discussion**
Mixing real code with architecture docs ensures the prompt references live examples. Smart context narrows the scope to relevant files, while the polish pass produces a schedule you can commit to version control and revisit in retros.

### Recipe: Spaced-Repetition Exporter

**Problem**
You want to convert textbook notes into spaced-repetition cards (Front/Back/Extra) compatible with tools like Anki or Mochi.

**Solution**

```bash
prompt-maker-cli "Turn these chapter notes into spaced repetition cards with cloze deletions." \
  -c notes/distributed-systems/ch06/*.md \
  -c notes/distributed-systems/glossary.md \
  --context-template nvim \
  --polish \
  --context-file learning/ch06-cards.md
```

**Discussion**
Feed the CLI your notes and glossary; the template organizes each card, while polishing enforces concise wording. The saved markdown can be imported or transformed into CSV for your spaced-repetition app.

### Recipe: Socratic Tutor Flow

**Problem**
You want prompts that guide you via questions instead of answers, forcing active recall for each concept.

**Solution**

```bash
prompt-maker-cli "Act as a Socratic tutor for Chapter 3 of 'Programming Languages', asking layered questions and hints." \
  -c notes/pl/ch03/*.md \
  -c exercises/pl/ch03/*.md \
  --interactive \
  --stream jsonl
```

**Discussion**
Context from notes plus exercises lets the model pose targeted questions. Interactive mode means you can answer, refine, or request hints between iterations; JSONL streaming logs each tutor exchange for later review.

### Recipe: Feynman Method Worksheet

**Problem**
You want to explain a dense topic in simple language, identify gaps, then loop back with targeted readings.

**Solution**

```bash
prompt-maker-cli "Apply the Feynman technique to Raft consensus (explain like I'm new, spot gaps, suggest drills)." \
  -c notes/distributed-systems/raft.md \
  -c "src/consensus/raft/**/*.ts" \
  -c research/raft/open-questions.md \
  --polish \
  --context-template nvim
```

**Discussion**
Combining conceptual notes, actual code, and open questions yields a worksheet with four sections: Teach, Identify Gaps, Review, Simplify. Re-run after each study session to track how explanations improve over time.

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

## Jira Ticket Recipes

### Recipe: Convert Requirements to Gherkin

**Problem**
Product dropped a prose requirements blob into a Jira ticket; you need executable acceptance criteria in Cucumber/Gherkin format.

**Solution**

```bash
prompt-maker-cli "Rewrite these requirements as Gherkin acceptance criteria with Scenario/Scenario Outline blocks." \
  -c jira/REQ-582-description.md \
  -c jira/REQ-582-comments/*.md \
  --context-template nvim \
  --polish
```

**Discussion**
Export the Jira description/comments (many teams sync them via API into `jira/`). Feeding both files gives the model complete context. The template delivers a clean block ready for Jira Markdown, while the polish pass enforces consistent Given/When/Then phrasing.

### Recipe: Ticket Grooming Checklist

**Problem**
You want to confirm that high-priority tickets include personas, acceptance tests, and data considerations before sprint planning.

**Solution**

```bash
prompt-maker-cli "Audit this Jira ticket for grooming completeness (personas, data, test cases, open questions)." \
  -c jira/REQ-610-description.md \
  -c jira/REQ-610-attachments/*.md \
  --smart-context-root jira \
  --json
```

**Discussion**
Smart context pulls in related tickets or design notes under `jira/`. Emitting JSON lets you store the audit result back in Jira via automation (each run lists contextPaths so you can trace the evidence used for the checklist).

### Recipe: Regression Matrix for Linked Issues

**Problem**
Before closing a ticket with multiple linked bugs, you need a regression plan referencing the linked IDs and their components.

**Solution**

```bash
prompt-maker-cli "Create a regression checklist covering all linked Jira issues and their components." \
  -c jira/REQ-599-description.md \
  -c jira/links/REQ-599-linked-issues.md \
  -c docs/testing/regression-template.md \
  --copy \
  --context-file jira/REQ-599-regression.md
```

**Discussion**
Combining the ticket body, linked-issue export, and a regression template ensures the LLM maps each linked bug to concrete verification steps. Writing the output to `jira/REQ-599-regression.md` gives QA a canonical doc, while `--copy` makes it easy to paste into the Jira comment thread.

### Recipe: Automating via Jira Webhooks

**Problem**
You want Jira to trigger prompt-maker-cli automatically whenever a ticket changes state (e.g., when QA moves an issue to “Ready for Test”).

**Solution**

1. Configure a Jira webhook targeting an internal endpoint (e.g., a lightweight Node/Express or serverless function).
2. Inside the webhook handler, fetch the ticket body/attachments via Jira REST and write them to disk:
   ```bash
   curl -u "$JIRA_USER:$JIRA_TOKEN" \
     "$JIRA_BASE/rest/api/3/issue/$ISSUE_KEY?expand=renderedFields" \
     -o "/tmp/${ISSUE_KEY}.json"
   ```
3. Invoke prompt-maker-cli with the downloaded payload and any playbook files:
   ```bash
   prompt-maker-cli "Generate QA test matrix for ${ISSUE_KEY}" \
     -c "/tmp/${ISSUE_KEY}.json" \
     -c docs/testing/regression-template.md \
     --json \
     --context-file "jira/${ISSUE_KEY}-artifact.md"
   ```
4. Post the resulting artifact back to Jira (comment or attachment) using the JSON output.

**Discussion**
The webhook handler acts as glue: it hydrates the ticket data, runs the CLI headlessly, and records the artifact paths provided in the JSON payload. Because prompt-maker-cli streams progress, you can enable `--stream jsonl` for observability or push logs to your monitoring stack. Remember to guard concurrent runs with a queue so multiple Jira events don’t clobber `/tmp` assets.

### Sample Node.js Webhook Handler

```ts
import express from 'express'
import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import fetch from 'node-fetch'

const app = express()
app.use(express.json({ limit: '1mb' }))

app.post('/jira-webhook', async (req, res) => {
  const issueKey = req.body.issue?.key
  if (!issueKey) {
    return res.status(400).send('Missing issue key')
  }

  const jiraResponse = await fetch(
    `${process.env.JIRA_BASE}/rest/api/3/issue/${issueKey}?expand=renderedFields`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.JIRA_USER}:${process.env.JIRA_TOKEN}`).toString('base64')}`,
        Accept: 'application/json',
      },
    },
  )

  const payload = await jiraResponse.text()
  const inputPath = `/tmp/${issueKey}.json`
  await writeFile(inputPath, payload, 'utf8')

  execFile(
    'prompt-maker-cli',
    [
      `Generate QA test matrix for ${issueKey}`,
      '-c',
      inputPath,
      '-c',
      'docs/testing/regression-template.md',
      '--json',
      '--context-file',
      `jira/${issueKey}-artifact.md`,
    ],
    (error, stdout, stderr) => {
      if (error) {
        console.error(stderr)
      } else {
        console.log(stdout)
      }
    },
  )

  res.status(202).send('Processing')
})

app.listen(process.env.PORT ?? 3000, () => {
  console.log('Webhook listener ready')
})
```

**Highlights**

- Uses the Jira REST API to pull fresh ticket data.
- Writes the payload to `/tmp` and shells out to prompt-maker-cli.
- Streams CLI output to server logs; connect this to your observability stack or ship the JSON artifact back to Jira asynchronously.

## CI Integration Recipes

### Recipe: Pull Request Prompt Validator (Generic CI)

**Problem**
You want CI to fail fast when prompt-maker-cli can’t assemble prompts for changed files (missing context, model issues, etc.).

**Solution**
Add a CI job that:

```bash
CHANGED=$(git diff --name-only origin/main...HEAD | tr '\n' ' ')
prompt-maker-cli "Summarize risk areas for this PR" \
  -c $CHANGED \
  --smart-context \
  --progress=false \
  --json
```

**Discussion**
Treat failures (non-zero exit codes) as CI blockers, surfacing actionable errors (missing files, credential issues) before reviewers even open the PR. Capturing JSON output allows downstream steps to upload artifacts or comment on the PR.

### Recipe: Nightly Requirements Drift Report

**Problem**
You run nightly jobs that compare Jira specs to actual code; when they drift, generate prompts instructing teams to reconcile differences.

**Solution**

```bash
prompt-maker-cli "Detect drift between Jira specs and implementation for ${SERVICE_NAME}" \
  -c "exports/jira/${SERVICE_NAME}-requirements.md" \
  -c "src/services/${SERVICE_NAME}/**/*.ts" \
  --context-template nvim \
  --stream jsonl \
  --context-file "reports/${SERVICE_NAME}-drift.md"
```

**Discussion**
Schedule this in your CI orchestrator (CircleCI, Buildkite, etc.). JSONL streaming feeds live telemetry into logs, while the context file serves as a paper trail for compliance/audit teams.

### Recipe: GitHub Actions Artifact Builder

**Problem**
You want a GitHub Actions workflow that generates prompts for every PR and attaches the result as an artifact/comment.

**Solution**

```yaml
name: prompt-maker

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  build-prompt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Generate PR prompt
        run: |
          CHANGED=$(git diff --name-only origin/${{ github.base_ref }}...HEAD)
          prompt-maker-cli "Review context for PR #${{ github.event.number }}" \
            -c "$CHANGED" \
            --smart-context \
            --json \
            --context-file pr-prompts/${{ github.event.number }}.md > prompt.json
      - uses: actions/upload-artifact@v4
        with:
          name: pr-${{ github.event.number }}-prompt
          path: |
            prompt.json
            pr-prompts/${{ github.event.number }}.md
```

**Discussion**
Actions runners install dependencies once (`npm ci`). The workflow diffs against the PR base branch, generates prompts, and uploads both the JSON payload and rendered markdown. Pair this with a follow-up step that comments on the PR using `gh api` if you want reviewers to see the artifact inline.

### Recipe: CircleCI Prompt Gate

**Problem**
You need CircleCI to enforce that prompt-maker-cli succeeds whenever a PR touches specific directories (e.g., `apps/prompt-maker-cli`).

**Solution**

```yaml
version: 2.1

orbs:
  node: circleci/node@6.2.0

jobs:
  prompt_gate:
    executor: node/default
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
      - run:
          name: Detect changed files
          command: |
            git fetch origin ${CIRCLE_BRANCH} --depth=1
            git diff --name-only origin/main...HEAD > changed.txt
      - run:
          name: Generate prompt artifact
          command: |
            CHANGED=$(tr '\n' ' ' < changed.txt)
            prompt-maker-cli "CircleCI prompt gate for ${CIRCLE_BRANCH}" \
              -c "$CHANGED" \
              --smart-context \
              --json \
              --context-file ci-artifacts/${CIRCLE_BUILD_NUM}.md > prompt.json
      - store_artifacts:
          path: ci-artifacts
      - store_artifacts:
          path: prompt.json

workflows:
  prompt-workflow:
    jobs:
      - prompt_gate
```

**Discussion**
This job runs on every pipeline. The stored artifacts (JSON + markdown) let reviewers inspect prompt contracts directly from the CircleCI UI. You can gate merges by requiring this workflow to pass.

### Recipe: CircleCI Nightly Prompt Publisher

**Problem**
You want a scheduled CircleCI workflow that enumerates services, runs prompt-maker-cli per service, and uploads the outputs for compliance.

**Solution**

```yaml
workflows:
  nightly-prompts:
    triggers:
      - schedule:
          cron: '0 3 * * *'
          filters:
            branches:
              only: main
    jobs:
      - prompt_gate
      - run_service_prompts

jobs:
  run_service_prompts:
    docker:
      - image: cimg/node:20.11
    steps:
      - checkout
      - run: npm ci
      - run:
          name: Generate prompts per service
          command: |
            for SERVICE in billing auth analytics; do
              prompt-maker-cli "Nightly drift check for $SERVICE" \
                -c "exports/jira/${SERVICE}-requirements.md" \
                -c "services/${SERVICE}/src/**/*.ts" \
                --context-file reports/${SERVICE}-drift.md \
                --json > reports/${SERVICE}-drift.json
            done
      - store_artifacts:
          path: reports
```

**Discussion**
Scheduled workflows keep documentation in sync. Each service run produces both markdown and JSON artifacts, giving compliance and platform engineers a searchable trail. Expand the `SERVICE` list or drive it from a manifest file as your platform grows.

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
  --model gemini-3-pro-preview \
  --polish \
  --progress=false
```

**Discussion**
Passing `--video` causes `generate-command.ts` to call `resolveGeminiVideoModel()`, overriding non-Gemini choices with `gemini-3-pro-preview` so the Files API can ingest your clip. The upload path (`media-loader.ts`) demands a readable file and `GEMINI_API_KEY`; the CLI shows upload progress via `upload.state` events. Gemini’s multimodal context pairs well with a polish pass to distill the final coaching checklist.

---
