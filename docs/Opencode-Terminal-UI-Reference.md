# Opencode Terminal UI Reference

## Overview

- `packages/opencode/src/cli/cmd/tui/app.tsx` composes the entire terminal UI with `@opentui/solid`, layering providers for routing, SDK access, synchronization, themes, dialogs, keybinds, local preferences, and prompt history around the `App` component.
- Rendering is decoupled from process lifecycle: `packages/opencode/src/cli/cmd/tui/thread.ts` spawns the UI, `packages/opencode/src/cli/cmd/tui/worker.ts` keeps the Bun HTTP server alive, and `packages/opencode/src/server/server.ts` exposes REST/SSE/WebSocket APIs that the UI consumes via the generated `@opencode-ai/sdk` client in `packages/opencode/src/cli/cmd/tui/context/sdk.tsx`.
- Every interaction—from prompt submission to keybind execution—routes through contexts defined under `packages/opencode/src/cli/cmd/tui/context`, guaranteeing deterministic state (sessions, providers, todos, MCP/LSP status, etc.) synchronized with backend events streamed over SSE.
- Tooling, storage, and automation services live under `packages/opencode/src/session`, `packages/opencode/src/tool`, `packages/opencode/src/provider`, `packages/opencode/src/project`, and `packages/opencode/src/util`, giving the UI rich context (project diffs, permission prompts, TODO lists, tool outputs) without embedding business logic in the renderer.

## Launch & Process Flow

1. **CLI Entry** – `packages/opencode/src/cli/cmd/tui/thread.ts` registers the default `opencode` command, parses flags (model, agent, session, prompt, continue, port, hostname, project), and resolves the working directory.
2. **Background Worker** – A dedicated worker (same file, plus `packages/opencode/src/cli/cmd/tui/worker.ts`) uses `Rpc.listen`/`Rpc.client` from `packages/opencode/src/util/rpc.ts` to keep the Bun HTTP server (`packages/opencode/src/server/server.ts`) running, handle upgrades, and honor `opencode upgrade` checks.
3. **Server lifecycle** – `packages/opencode/src/server/server.ts` wires Hono routes for config, sessions, PTY, provider auth, tool registry, SSE event feeds, and `packages/opencode/src/server/tui.ts` for agent ↔ TUI queuing. Instances are scoped per directory via `packages/opencode/src/project/instance.ts` + `packages/opencode/src/project/bootstrap.ts`.
4. **Attach & Spawn flows** – `packages/opencode/src/cli/cmd/tui/attach.ts` connects to an existing server URL while `packages/opencode/src/cli/cmd/tui/spawn.ts` starts a server and immediately spawns a UI client (helpful for scripting or embedding in other CLIs).
5. **Event propagation** – The server pushes structured events via SSE (`sdk.event.subscribe` in `packages/opencode/src/cli/cmd/tui/context/sdk.tsx`). `packages/opencode/src/cli/cmd/tui/context/sync.tsx` consumes them to reconcile Solid stores, ensuring route transitions, dialogs, and prompt state always reflect backend truth.
6. **Tool/Agent requests** – When a user issues a prompt, `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx` constructs message payloads, and `packages/opencode/src/session/index.ts` plus `packages/opencode/src/tool/*.ts` orchestrate actual filesystem or MCP tool calls. Responses stream back and update UI panes live.

## Rendering Tree & Providers

- **ArgsProvider** (`packages/opencode/src/cli/cmd/tui/context/args.tsx`) exposes CLI arguments (model, agent, prompt, continue, sessionID) to any component.
- **ExitProvider** (`packages/opencode/src/cli/cmd/tui/context/exit.tsx`) centralizes graceful shutdown, resetting terminal titles and invoking `packages/opencode/src/cli/error.ts` formatters when needed.
- **KVProvider** (`packages/opencode/src/cli/cmd/tui/context/kv.tsx`) persists lightweight UI preferences in `Global.Path.state/kv.json`.
- **ToastProvider** (`packages/opencode/src/cli/cmd/tui/ui/toast.tsx`) renders notifications used throughout the UI and also backs remote toast events from `packages/opencode/src/cli/cmd/tui/event.ts`.
- **RouteProvider** (`packages/opencode/src/cli/cmd/tui/context/route.tsx`) keeps track of whether the user is on the home screen or a specific session, influencing layout and terminal titles.
- **SDKProvider** (`packages/opencode/src/cli/cmd/tui/context/sdk.tsx`) instantiates `createOpencodeClient`, multiplexes SSE events, and exposes an `emitter` used by sync, dialogs, and prompt components.
- **SyncProvider** (`packages/opencode/src/cli/cmd/tui/context/sync.tsx`) hydrates and reconciles all backend entities (sessions, messages, todos, permissions, MCP/LSP status, provider catalog, diffs, command metadata) and offers helper methods like `session.get`, `session.status`, and `session.sync`.
- **ThemeProvider** (`packages/opencode/src/cli/cmd/tui/context/theme.tsx` + JSON palettes under `packages/opencode/src/cli/cmd/tui/context/theme/*.json`) adapts color palettes to terminal background, OSC replies, and user-selected themes.
- **LocalProvider** (`packages/opencode/src/cli/cmd/tui/context/local.tsx`) stores agent/model selections, recent/favorite combinations, local theme mode, and warning acknowledgements.
- **KeybindProvider** (`packages/opencode/src/cli/cmd/tui/context/keybind.tsx` + shared parser `packages/opencode/src/util/keybind.ts`) normalizes leader sequences, supports custom bindings from config, and exposes `match`/`print` helpers used everywhere.
- **DialogProvider** (`packages/opencode/src/cli/cmd/tui/ui/dialog.tsx`), **CommandProvider** (`packages/opencode/src/cli/cmd/tui/component/dialog-command.tsx`), **PromptHistoryProvider** (`packages/opencode/src/cli/cmd/tui/component/prompt/history.tsx`), and **PromptRefProvider** (`packages/opencode/src/cli/cmd/tui/context/prompt.tsx`) manage overlays, command palette entries, prompt history navigation, and prompt focus from anywhere in the tree.

## User Interaction Model

### Home screen (`packages/opencode/src/cli/cmd/tui/routes/home.tsx`)

- Displays the animated logo (`packages/opencode/src/cli/cmd/tui/component/logo.tsx`), a single prompt entry (`packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`), MCP status hints, current directory (`packages/opencode/src/cli/cmd/tui/context/directory.ts`), and installation version.
- Auto-injects piped input or `--prompt` text precisely once via `usePromptRef` and `route.initialPrompt`.

### Session screen (`packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`)

- Split layout uses `packages/opencode/src/cli/cmd/tui/component/border.tsx` plus `@opentui/core` scroll acceleration to show transcripts, tool outputs, permission banners, attachments, and diff previews.
- **Header** (`packages/opencode/src/cli/cmd/tui/routes/session/header.tsx`) surfaces session titles, sharing state, cost/context metrics.
- **Sidebar** (`packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx`) shows MCP/LSP health, todos, diffs, cost, onboarding hints, and directory/branch info.
- **Footer** (`packages/opencode/src/cli/cmd/tui/routes/session/footer.tsx`) repeats directory plus MCP/LSP counters and onboarding callouts.
- **Dialogs** like message actions (`packages/opencode/src/cli/cmd/tui/routes/session/dialog-message.tsx`) and timeline navigation (`packages/opencode/src/cli/cmd/tui/routes/session/dialog-timeline.tsx`) reuse the generic dialog/select framework.

### Prompt composer (`packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`)

- Uses `@opentui/core` textareas with extmarks to embed file snippets, agent references, summarised pastes, and shell snippets.
- Supports history (`packages/opencode/src/cli/cmd/tui/component/prompt/history.tsx`), autocomplete (`packages/opencode/src/cli/cmd/tui/component/prompt/autocomplete.tsx`), clipboard integrations (`packages/opencode/src/cli/cmd/tui/util/clipboard.ts`), and multi-part payload assembly for the session API.
- Exposes commands for clearing, submitting, interrupting, editing in `$EDITOR` (`packages/opencode/src/cli/cmd/tui/util/editor.ts`), and forking sessions.

### Command palette & dialogs

- `packages/opencode/src/cli/cmd/tui/component/dialog-command.tsx` aggregates actions from throughout the UI (session switching, model/agent selection, provider connect, theme switch, status, help, exit, debug overlays) and assigns them category-aware keybinds.
- Dialog components in `packages/opencode/src/cli/cmd/tui/component` (`dialog-model.tsx`, `dialog-provider.tsx`, `dialog-agent.tsx`, `dialog-session-list.tsx`, `dialog-session-rename.tsx`, `dialog-theme-list.tsx`, `dialog-status.tsx`, `dialog-tag.tsx`, `dialog-command.tsx`) plus generic shells in `packages/opencode/src/cli/cmd/tui/ui/*.tsx` (`dialog.tsx`, `dialog-select.tsx`, `dialog-confirm.tsx`, `dialog-alert.tsx`, `dialog-prompt.tsx`, `dialog-help.tsx`) standardize look, feel, and focus management.

### Notifications, status, and OS integration

- Toasts (`packages/opencode/src/cli/cmd/tui/ui/toast.tsx`) show status, update, and error messages triggered from backend events, keybind actions, or clipboard helpers.
- Terminal-specific helpers (`packages/opencode/src/cli/cmd/tui/util/terminal.ts`) read OSC escape responses to auto-adjust theme modes.
- Clipboards (`packages/opencode/src/cli/cmd/tui/util/clipboard.ts`) and external editor launching (`packages/opencode/src/cli/cmd/tui/util/editor.ts`) ensure TUI flows integrate smoothly with the host OS.
- Prompt selection copies use OSC52 sequences via the renderer (see `App` mouse handlers and `packages/opencode/src/cli/cmd/tui/ui/dialog.tsx`).

### Keybind layer

- Configurable keybinds (per `config.keybinds` served by `packages/opencode/src/config/config.ts`) get parsed by `packages/opencode/src/util/keybind.ts` and exposed via `packages/opencode/src/cli/cmd/tui/context/keybind.tsx`, ensuring leader sequences, multi-step combos, and printable hints stay consistent.

## Data & Service Context

- **SDK events** – `packages/opencode/src/cli/cmd/tui/context/sdk.tsx` continuously consumes `sdk.event.subscribe` results. A batching queue reduces render churn; events are forwarded to `packages/opencode/src/cli/cmd/tui/event.ts` definitions (`TuiEvent.CommandExecute`, `TuiEvent.ToastShow`, `TuiEvent.PromptAppend`).
- **Sync store** – `packages/opencode/src/cli/cmd/tui/context/sync.tsx` stores and hydrates providers, commands, permissions, messages, parts, status, diffs, todos, MCP/LSP status, formatter info, VCS metadata, and exposes `bootstrap` plus `session.sync` to fetch full transcripts on demand.
- **Session engine** – `packages/opencode/src/session/index.ts` plus supporting files (`message.ts`, `message-v2.ts`, `processor.ts`, `system.ts`, `summary.ts`, `status.ts`, `todo.ts`, `compaction.ts`, `revert.ts`, `retry.ts`, `prompt.ts`, and prompt templates under `packages/opencode/src/session/prompt/*.txt`) handle creation, streaming, summarization, branching, undo/redo, sharing, compaction, and metadata updates.
- **Tooling** – `packages/opencode/src/tool/*.ts` (bash, batch, codesearch, edit/multiedit, glob, grep, lsp hover/diagnostics, ls, patch, read, todo, todoread/todowrite, task, webfetch, websearch, write, invalid) plus `.txt` manifest files supply structured prompts/descriptions for self-documenting agent tools. `packages/opencode/src/tool/registry.ts` centralizes registration.
- **Provider ecosystem** – `packages/opencode/src/provider/provider.ts`, `packages/opencode/src/provider/models.ts`, `packages/opencode/src/provider/models-macro.ts`, `packages/opencode/src/provider/auth.ts`, `packages/opencode/src/provider/transform.ts`, and the OpenAI-compatible SDK under `packages/opencode/src/provider/sdk/openai-compatible/src/*.ts` define provider metadata, pricing, auth flows, tool availability, and request flows.
- **Project + filesystem context** – `packages/opencode/src/project/{bootstrap.ts,instance.ts,project.ts,state.ts,vcs.ts}` determine project directories, state isolation, and branch info. `packages/opencode/src/file/{fzf.ts,ignore.ts,index.ts,ripgrep.ts,time.ts,watcher.ts}` plus `packages/opencode/src/share/{share.ts,share-next.ts}`, `packages/opencode/src/mcp/index.ts`, `packages/opencode/src/pty/index.ts`, and `packages/opencode/src/command/index.ts` supply search, ignore rules, watchers, share links, MCP integration, PTY management, and reusable command templates (`packages/opencode/src/command/template/*.txt`).
- **Configuration & formatting** – `packages/opencode/src/config/{config.ts,markdown.ts}` surfaces tunables (themes, share behavior, keybinds, MCP config). `packages/opencode/src/format/{index.ts,formatter.ts}` tracks formatters; `packages/opencode/src/installation/index.ts` and `packages/opencode/src/flag/flag.ts` expose version/feature flags.
- **Core utilities** – `packages/opencode/src/util/*.ts` (color, context, defer, eventloop, filesystem, fn, iife, keybind, lazy, locale, lock, log, queue, rpc, scrap, signal, timeout, token, wildcard) plus `packages/opencode/src/bus/{index.ts,global.ts}` and `packages/opencode/src/storage/storage.ts` provide the event bus, logging, async queues, storage façade, wildcards, token helpers, etc., all reused by the UI contexts.

## Server & Agent Back-End

- `packages/opencode/src/server/server.ts` is the HTTP/SSE/WebSocket surface. It streams `GlobalBus` events (`packages/opencode/src/bus/global.ts`), handles PTY management (`packages/opencode/src/pty/index.ts`), exposes `/project/*` routes (`packages/opencode/src/server/project.ts`), and builds OpenAPI docs on the fly.
- `packages/opencode/src/server/tui.ts` acts as a bridge queue between non-interactive agents and the TUI, ensuring programmatic tool invocations can still request human approval via the UI when needed.
- `packages/opencode/src/session/status.ts`, `packages/opencode/src/session/todo.ts`, `packages/opencode/src/session/summary.ts`, etc., emit `SessionStatus` and TODO events consumed by `context/sync` to update the UI header/sidebar state.
- `packages/opencode/src/tool/registry.ts` registers every tool, letting the UI show tool usage details, TODO prompts, or diff previews per message.
- Authentication, provider auth, and agent metadata flow through `packages/opencode/src/auth/index.ts`, `packages/opencode/src/provider/auth.ts`, and `packages/opencode/src/agent/agent.ts` (consumed indirectly via sync and dialogs).

## File Reference (grouped)

### Entry points & process control

- `packages/opencode/src/cli/cmd/tui/thread.ts` – primary `opencode` command wiring, worker spawning, CLI flag parsing.
- `packages/opencode/src/cli/cmd/tui/worker.ts` – RPC server for starting/stopping Bun HTTP server and upgrade checks.
- `packages/opencode/src/cli/cmd/tui/spawn.ts` – spawns a server plus UI child process.
- `packages/opencode/src/cli/cmd/tui/attach.ts` – connects an existing TUI to a server URL.
- `packages/opencode/src/cli/cmd/tui/event.ts` – strongly typed UI event bus definitions.
- `packages/opencode/src/cli/cmd/tui/app.tsx` – Solid renderer root, provider stack, and main layout.
- `packages/opencode/src/cli/upgrade.ts` – invoked during startup to opportunistically upgrade the install.
- `packages/opencode/src/cli/cmd/cmd.ts` – helper for defining CLI commands.
- `packages/opencode/src/cli/error.ts` – formats fatal errors surfaced through `ExitProvider`.

### Routes & layout

- `packages/opencode/src/cli/cmd/tui/routes/home.tsx`
- `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`
- `packages/opencode/src/cli/cmd/tui/routes/session/header.tsx`
- `packages/opencode/src/cli/cmd/tui/routes/session/footer.tsx`
- `packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx`
- `packages/opencode/src/cli/cmd/tui/routes/session/dialog-message.tsx`
- `packages/opencode/src/cli/cmd/tui/routes/session/dialog-timeline.tsx`

### UI components & dialogs

- `packages/opencode/src/cli/cmd/tui/component/border.tsx`
- `packages/opencode/src/cli/cmd/tui/component/logo.tsx`
- `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`
- `packages/opencode/src/cli/cmd/tui/component/prompt/autocomplete.tsx`
- `packages/opencode/src/cli/cmd/tui/component/prompt/history.tsx`
- `packages/opencode/src/cli/cmd/tui/component/dialog-command.tsx`
- `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx`
- `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx`
- `packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx`
- `packages/opencode/src/cli/cmd/tui/component/dialog-status.tsx`
- `packages/opencode/src/cli/cmd/tui/component/dialog-session-list.tsx`
- `packages/opencode/src/cli/cmd/tui/component/dialog-session-rename.tsx`
- `packages/opencode/src/cli/cmd/tui/component/dialog-tag.tsx`
- `packages/opencode/src/cli/cmd/tui/component/dialog-theme-list.tsx`
- `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx`

### UI utilities

- `packages/opencode/src/cli/cmd/tui/ui/dialog.tsx`
- `packages/opencode/src/cli/cmd/tui/ui/dialog-select.tsx`
- `packages/opencode/src/cli/cmd/tui/ui/dialog-confirm.tsx`
- `packages/opencode/src/cli/cmd/tui/ui/dialog-alert.tsx`
- `packages/opencode/src/cli/cmd/tui/ui/dialog-prompt.tsx`
- `packages/opencode/src/cli/cmd/tui/ui/dialog-help.tsx`
- `packages/opencode/src/cli/cmd/tui/ui/toast.tsx`
- `packages/opencode/src/cli/cmd/tui/ui/spinner.ts`
- `packages/opencode/src/cli/cmd/tui/util/clipboard.ts`
- `packages/opencode/src/cli/cmd/tui/util/editor.ts`
- `packages/opencode/src/cli/cmd/tui/util/terminal.ts`

### Context providers

- `packages/opencode/src/cli/cmd/tui/context/helper.tsx`
- `packages/opencode/src/cli/cmd/tui/context/args.tsx`
- `packages/opencode/src/cli/cmd/tui/context/route.tsx`
- `packages/opencode/src/cli/cmd/tui/context/sdk.tsx`
- `packages/opencode/src/cli/cmd/tui/context/sync.tsx`
- `packages/opencode/src/cli/cmd/tui/context/theme.tsx`
- `packages/opencode/src/cli/cmd/tui/context/theme/aura.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/ayu.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/catppuccin.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/cobalt2.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/dracula.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/everforest.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/flexoki.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/github.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/gruvbox.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/kanagawa.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/material.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/matrix.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/mercury.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/monokai.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/nightowl.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/nord.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/one-dark.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/opencode.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/palenight.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/rosepine.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/solarized.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/synthwave84.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/tokyonight.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/vercel.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/vesper.json`
- `packages/opencode/src/cli/cmd/tui/context/theme/zenburn.json`
- `packages/opencode/src/cli/cmd/tui/context/local.tsx`
- `packages/opencode/src/cli/cmd/tui/context/keybind.tsx`
- `packages/opencode/src/cli/cmd/tui/context/kv.tsx`
- `packages/opencode/src/cli/cmd/tui/context/prompt.tsx`
- `packages/opencode/src/cli/cmd/tui/context/directory.ts`
- `packages/opencode/src/cli/cmd/tui/context/exit.tsx`

### Server & API

- `packages/opencode/src/server/server.ts`
- `packages/opencode/src/server/tui.ts`
- `packages/opencode/src/server/project.ts`
- `packages/opencode/src/server/error.ts`

### Session system & prompts

- `packages/opencode/src/session/index.ts`
- `packages/opencode/src/session/message.ts`
- `packages/opencode/src/session/message-v2.ts`
- `packages/opencode/src/session/processor.ts`
- `packages/opencode/src/session/retry.ts`
- `packages/opencode/src/session/revert.ts`
- `packages/opencode/src/session/summary.ts`
- `packages/opencode/src/session/compaction.ts`
- `packages/opencode/src/session/prompt.ts`
- `packages/opencode/src/session/todo.ts`
- `packages/opencode/src/session/status.ts`
- `packages/opencode/src/session/system.ts`
- Prompt templates: `packages/opencode/src/session/prompt/anthropic-20250930.txt`, `anthropic.txt`, `anthropic_spoof.txt`, `beast.txt`, `build-switch.txt`, `codex.txt`, `compaction.txt`, `copilot-gpt-5.txt`, `gemini.txt`, `max-steps.txt`, `plan.txt`, `plan-reminder-anthropic.txt`, `polaris.txt`, `qwen.txt`, `summarize.txt`, `title.txt`.

### Tool registry & descriptions

- `packages/opencode/src/tool/bash.ts`
- `packages/opencode/src/tool/bash.txt`
- `packages/opencode/src/tool/batch.ts`
- `packages/opencode/src/tool/batch.txt`
- `packages/opencode/src/tool/codesearch.ts`
- `packages/opencode/src/tool/codesearch.txt`
- `packages/opencode/src/tool/edit.ts`
- `packages/opencode/src/tool/edit.txt`
- `packages/opencode/src/tool/multiedit.ts`
- `packages/opencode/src/tool/multiedit.txt`
- `packages/opencode/src/tool/glob.ts`
- `packages/opencode/src/tool/glob.txt`
- `packages/opencode/src/tool/grep.ts`
- `packages/opencode/src/tool/grep.txt`
- `packages/opencode/src/tool/ls.ts`
- `packages/opencode/src/tool/ls.txt`
- `packages/opencode/src/tool/read.ts`
- `packages/opencode/src/tool/read.txt`
- `packages/opencode/src/tool/write.ts`
- `packages/opencode/src/tool/write.txt`
- `packages/opencode/src/tool/webfetch.ts`
- `packages/opencode/src/tool/webfetch.txt`
- `packages/opencode/src/tool/websearch.ts`
- `packages/opencode/src/tool/websearch.txt`
- `packages/opencode/src/tool/lsp-hover.ts`
- `packages/opencode/src/tool/lsp-hover.txt`
- `packages/opencode/src/tool/lsp-diagnostics.ts`
- `packages/opencode/src/tool/lsp-diagnostics.txt`
- `packages/opencode/src/tool/patch.ts`
- `packages/opencode/src/tool/patch.txt`
- `packages/opencode/src/tool/task.ts`
- `packages/opencode/src/tool/task.txt`
- `packages/opencode/src/tool/todo.ts`
- `packages/opencode/src/tool/todoread.txt`
- `packages/opencode/src/tool/todowrite.txt`
- `packages/opencode/src/tool/invalid.ts`
- `packages/opencode/src/tool/registry.ts`
- `packages/opencode/src/tool/tool.ts`

### Providers & model plumbing

- `packages/opencode/src/provider/provider.ts`
- `packages/opencode/src/provider/models.ts`
- `packages/opencode/src/provider/models-macro.ts`
- `packages/opencode/src/provider/auth.ts`
- `packages/opencode/src/provider/transform.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/index.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/openai-compatible-provider.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/openai-config.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/openai-error.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/openai-responses-api-types.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/openai-responses-language-model.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/openai-responses-settings.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/openai-responses-prepare-tools.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/convert-to-openai-responses-input.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/map-openai-responses-finish-reason.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/responses/tool/image-generation.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/responses/tool/file-search.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/responses/tool/local-shell.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/responses/tool/code-interpreter.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/responses/tool/web-search.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/responses/tool/web-search-preview.ts`
- `packages/opencode/src/provider/sdk/openai-compatible/src/README.md`

### Project, filesystem, MCP, share, command

- `packages/opencode/src/project/bootstrap.ts`
- `packages/opencode/src/project/instance.ts`
- `packages/opencode/src/project/project.ts`
- `packages/opencode/src/project/state.ts`
- `packages/opencode/src/project/vcs.ts`
- `packages/opencode/src/file/fzf.ts`
- `packages/opencode/src/file/ignore.ts`
- `packages/opencode/src/file/index.ts`
- `packages/opencode/src/file/ripgrep.ts`
- `packages/opencode/src/file/time.ts`
- `packages/opencode/src/file/watcher.ts`
- `packages/opencode/src/share/share.ts`
- `packages/opencode/src/share/share-next.ts`
- `packages/opencode/src/mcp/index.ts`
- `packages/opencode/src/pty/index.ts`
- `packages/opencode/src/command/index.ts`
- `packages/opencode/src/command/template/initialize.txt`
- `packages/opencode/src/command/template/review.txt`

### Configuration, auth, IDs, global state

- `packages/opencode/src/config/config.ts`
- `packages/opencode/src/config/markdown.ts`
- `packages/opencode/src/format/index.ts`
- `packages/opencode/src/format/formatter.ts`
- `packages/opencode/src/auth/index.ts`
- `packages/opencode/src/id/id.ts`
- `packages/opencode/src/flag/flag.ts`
- `packages/opencode/src/installation/index.ts`
- `packages/opencode/src/global/index.ts`
- `packages/opencode/src/storage/storage.ts`

### Utilities & infrastructure

- `packages/opencode/src/util/color.ts`
- `packages/opencode/src/util/context.ts`
- `packages/opencode/src/util/defer.ts`
- `packages/opencode/src/util/eventloop.ts`
- `packages/opencode/src/util/filesystem.ts`
- `packages/opencode/src/util/fn.ts`
- `packages/opencode/src/util/iife.ts`
- `packages/opencode/src/util/keybind.ts`
- `packages/opencode/src/util/lazy.ts`
- `packages/opencode/src/util/locale.ts`
- `packages/opencode/src/util/lock.ts`
- `packages/opencode/src/util/log.ts`
- `packages/opencode/src/util/queue.ts`
- `packages/opencode/src/util/rpc.ts`
- `packages/opencode/src/util/scrap.ts`
- `packages/opencode/src/util/signal.ts`
- `packages/opencode/src/util/timeout.ts`
- `packages/opencode/src/util/token.ts`
- `packages/opencode/src/util/wildcard.ts`
- `packages/opencode/src/bus/index.ts`
- `packages/opencode/src/bus/global.ts`

### Miscellaneous assets

- `packages/opencode/parsers-config.ts` – Markdown/code parser registry consumed by the session route for syntax highlighting.
- `packages/opencode/src/share/share.ts` & `packages/opencode/src/share/share-next.ts` – share/export flows referenced by dialogs.

This document describes the UI architecture, interaction surfaces, backend context, and lists every file relevant to building or referencing the Opencode terminal UI so you can feed it directly to another coding agent.

