AI Prompt Generator
────────────────────
Generated prompt:

Role:
You are an experienced Neovim plugin author and TypeScript/Lua developer. You are building a Neovim plugin that integrates tightly with the `prompt-maker-cli` tool to generate and polish AI prompts directly from within Neovim. You understand Neovim’s Lua API, async job control, buffer/window management, and how to package and document plugins for common plugin managers (lazy.nvim, packer.nvim, etc.).

Context:
The goal is to create a Neovim plugin that lets users create, edit, and manage prompts using `prompt-maker-cli` without leaving the editor. The plugin should:

- Use `prompt-maker-cli` as the backend for:
  - Generating prompts from rough intent text.
  - Polishing existing prompts using the CLI’s `--polish` feature.
- Work with:
  - Visual selections.
  - Entire buffers.
  - Possibly external files (via temp files created by the plugin).

Key information about `prompt-maker-cli`:

- Single entry point binary: `prompt-maker-cli` (or `node apps/prompt-maker-cli/dist/index.js` during development).
- Typical usage:
  - Inline intent: `prompt-maker-cli "Draft an onboarding bot spec" --model gpt-4o-mini`
  - File-based intent: `prompt-maker-cli --intent-file path/to/file --model gpt-4o-mini`
- Important flags:
  - `<intent>`: inline rough intent text.
  - `-f, --intent-file <path>`: read intent from a file.
  - `--model <name>`: generation model (e.g., `gpt-4o-mini`, `gemini-1.5-flash`).
  - `--polish`: run a polishing pass on the generated prompt.
  - `--polish-model <name>`: override model used for polishing.
  - `--json`: emit machine-readable JSON to stdout.
  - `-i, --interactive`: interactive refine loop (TTY only).
- JSON output (when `--json` is used) includes:
  - `.prompt` (always present).
  - `.polishedPrompt` and `.polishModel` when `--polish` is used and succeeds.
- Error behavior:
  - Non-zero exit codes on failure.
  - If polish fails, the CLI surfaces the error but still returns the generated prompt.
- Configuration:
  - Reads provider credentials from env vars (`OPENAI_API_KEY`, `GEMINI_API_KEY`, etc.).
  - Optional config file at `~/.config/prompt-maker-cli/config.json` with `promptGenerator.defaultModel`.
  - `PROMPT_MAKER_CLI_CONFIG` can override config path.

Plugin feature requirements:

1. Commands:
   - `:PromptMakerGenerate`
     - Take intent from:
       - Visual selection (if present).
       - Otherwise, the entire current buffer.
     - Call `prompt-maker-cli` with `--json` and a configurable `--model`.
     - Optionally accept a flag or config to also run `--polish`.
     - Parse JSON and extract:
       - `.prompt` (always).
       - `.polishedPrompt` if present.
     - Open a new scratch buffer (or configurable target) to display the resulting prompt for further editing.
   - `:PromptMakerGeneratePolish`
     - Same as `:PromptMakerGenerate` but always includes `--polish`.
     - Optionally allow specifying `--polish-model` via command arguments or config.
   - `:PromptMakerGenerateInteractive`
     - Run `prompt-maker-cli` in interactive mode (`--interactive`) using the same intent sources.
     - Stream stdout into a floating window or scratch buffer so the user can see the interactive transcript.
     - Handle user input via the terminal job (e.g., using `termopen` or equivalent).
   - Optional: commands to re-open the last JSON result for the current buffer without re-running the CLI.

2. Keybindings:
   - Provide default (but configurable) mappings, for example:
     - Normal mode:
       - `<leader>pg` → `:PromptMakerGenerate`
       - `<leader>pp` → `:PromptMakerGeneratePolish`
       - `<leader>pi` → `:PromptMakerGenerateInteractive`
     - Visual mode:
       - `<leader>pg` → generate from selection.
       - `<leader>pp` → polish from selection.
   - Allow users to disable default mappings or override them via plugin setup.

3. Model selection:
   - Global configuration options:
     - `default_model` for generation (e.g., `"gpt-4o-mini"` or `"gemini-1.5-flash"`).
     - `default_polish_model` for polishing (optional; if not set, omit `--polish-model` so CLI defaults to generation model).
   - Per-command overrides:
     - Allow `:PromptMakerGenerate` and `:PromptMakerGeneratePolish` to accept optional arguments like:
       - `:PromptMakerGenerate model=gpt-4o-mini`
       - `:PromptMakerGeneratePolish model=gemini-1.5-flash polish_model=gpt-4o-mini`
     - Or use a simple `:PromptMakerModel` command / UI to set the current model for the session.
   - Respect external CLI config and env vars; the plugin should only pass explicit `--model` / `--polish-model` when configured or requested.

4. Buffer and UI behavior:
   - When generation/polish completes:
     - Open a new scratch buffer (unlisted, no filetype by default, or configurable) containing:
       - The polished prompt if available and requested.
       - Otherwise, the generated `.prompt`.
     - Optionally set filetype to `markdown` by default (configurable).
     - Place the cursor at the top of the new buffer.
   - For interactive mode:
     - Use a floating window or terminal buffer to show the interactive transcript.
     - Ensure the user can close the window easily (e.g., `q` mapping or `:q`).
   - Consider a small status notification (e.g., via `vim.notify`) when:
     - A job starts (e.g., “Prompt Maker: generating…”).
     - A job completes successfully (e.g., “Prompt Maker: generation complete”).
     - A job fails (e.g., “Prompt Maker: error – see quickfix”).

5. Error handling:
   - When the CLI exits with a non-zero status:
     - Capture stderr and show it in:
       - A quickfix list, or
       - A floating window / split buffer dedicated to errors.
     - Provide a clear message via `vim.notify` indicating failure.
   - When `--json` output is malformed or cannot be parsed:
     - Show a warning.
     - Optionally open a buffer with the raw stdout for debugging.
   - If polish fails but generation succeeds:
     - Prefer the generated `.prompt` if `.polishedPrompt` is missing.
     - Optionally surface the polish error in a notification or quickfix, but still show the generated prompt.

6. Configuration API:
   - Provide a `setup` function, e.g.:

     ```lua
     require("prompt_maker").setup({
       cmd = "prompt-maker-cli", -- or full path
       default_model = "gpt-4o-mini",
       default_polish_model = nil, -- or "gpt-4o-mini"
       auto_polish_on_generate = false,
       json_mode = true, -- always use --json for non-interactive
       open_in = "split", -- "split" | "vsplit" | "tab" | "float" | "current"
       filetype = "markdown",
       mappings = {
         enable_defaults = true,
         generate = "<leader>pg",
         polish = "<leader>pp",
         interactive = "<leader>pi",
       },
       cache_last_result = true, -- cache JSON per buffer
       on_result = nil, -- optional callback(user_result_table, context)
     })
     ```

   - Allow users to override:
     - CLI command path (`cmd`).
     - Default models.
     - Whether to auto-run `--polish` on generate.
     - Where to open result buffers.
     - Default keymaps.
     - Whether to cache last JSON result per buffer.
   - Store configuration in a Lua module and expose it to other plugin functions.

7. Caching:
   - Maintain a per-buffer cache of the last JSON response:
     - Use buffer variables or a Lua table keyed by buffer number.
     - Include:
       - Raw JSON string.
       - Parsed table with `.prompt`, `.polishedPrompt`, `.model`, `.polishModel`, etc.
       - CLI arguments used (model, polish, etc.).
   - Provide a command like:
     - `:PromptMakerShowLast` to re-open the last result buffer without re-running the CLI.

8. Documentation:
   - Include clear documentation that covers:
     - Installation instructions for:
       - lazy.nvim.
       - packer.nvim.
       - Native `pack/*` if desired.
     - Requirements:
       - `prompt-maker-cli` must be installed and available on `$PATH`.
       - Node.js 18+ and provider credentials/config as per CLI docs.
     - Configuration options with examples.
     - Usage examples:
       - Generating from visual selection.
       - Generating from entire buffer.
       - Polishing an existing prompt.
       - Using interactive mode.
       - Overriding models per command.
     - Troubleshooting:
       - How to debug CLI path issues.
       - How to inspect raw JSON or stdout when parsing fails.
       - How to handle provider credential errors.

Constraints:

- Use idiomatic Lua for Neovim plugins (no external plugin frameworks required).
- Use Neovim’s async job APIs:
  - Prefer `vim.system` (Neovim 0.10+) or `vim.fn.jobstart`/`vim.fn.jobwait` for compatibility.
- Do not block the UI while `prompt-maker-cli` runs:
  - All CLI calls should be asynchronous.
  - Use callbacks or coroutines to handle completion.
- Ensure the plugin works on:
  - Linux.
  - macOS.
  - Windows (where possible), assuming `prompt-maker-cli` is installed.
- Avoid hard-coding provider-specific logic; rely on CLI flags and config.
- Keep the plugin self-contained and minimal in dependencies (no heavy external Lua libraries).
- Code should be well-structured, readable, and commented where non-obvious.
- Provide sensible defaults so a user can:
  - Install the plugin.
  - Run `:PromptMakerGenerate` on a buffer.
  - Get a result without additional configuration (assuming CLI and credentials are set up).

Tech Stack:

- Neovim plugin in Lua.
- Use Neovim’s built-in APIs:
  - `vim.api.nvim_create_user_command`
  - `vim.api.nvim_set_keymap` or `vim.keymap.set`
  - `vim.api.nvim_create_buf`, `vim.api.nvim_open_win`
  - `vim.system` or `vim.fn.jobstart`
  - `vim.notify`, quickfix APIs (`setqflist`).
- Optional: small helper modules in Lua for:
  - Config management.
  - CLI invocation.
  - JSON parsing (use `vim.json.decode` if available, or `vim.fn.json_decode`).

Suggested file structure:

- Plugin root: `prompt-maker.nvim/`
  - `lua/prompt_maker/init.lua`
    - `setup` function.
    - Public API.
  - `lua/prompt_maker/config.lua`
    - Default config and merge logic.
  - `lua/prompt_maker/cli.lua`
    - Functions to build CLI arguments.
    - Async job execution.
    - JSON parsing and error handling.
  - `lua/prompt_maker/ui.lua`
    - Buffer/window creation.
    - Floating window helpers.
    - Quickfix/error display.
  - `lua/prompt_maker/commands.lua`
    - Definitions for `:PromptMakerGenerate`, `:PromptMakerGeneratePolish`, `:PromptMakerGenerateInteractive`, `:PromptMakerShowLast`.
  - `plugin/prompt_maker.lua`
    - Auto-load commands and default setup hook.
  - `README.md`
    - Installation, configuration, usage, troubleshooting.

Output Format:

- Provide:
  1. A high-level design of the plugin architecture (modules and responsibilities).
  2. Concrete Lua code examples for:
     - `setup` function and config handling.
     - Command definitions and keybindings.
     - CLI invocation (non-interactive with `--json`).
     - Parsing JSON and opening result buffers.
     - Error handling (non-zero exit, malformed JSON).
  3. Example usage snippets showing:
     - How a user would configure the plugin in their Neovim config.
     - How to run each command in normal and visual modes.
  4. A concise `README.md` outline that could be used as the basis for the plugin’s documentation.

- Write the answer as if you are delivering a ready-to-implement design and code scaffold that a developer can copy into a new Neovim plugin repository and start iterating on.
