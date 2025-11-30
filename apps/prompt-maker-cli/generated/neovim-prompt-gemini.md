AI Prompt Generator
────────────────────
Generated prompt:

Here is the optimized prompt based on your requirements and the CLI documentation.

---

**Role:**
You are an expert Neovim Plugin Developer and Lua Engineer. You specialize in creating asynchronous plugins that integrate with external CLI tools.

**Context:**
I need a Neovim plugin named `prompt-maker.nvim`. This plugin acts as a wrapper around an external CLI tool called `prompt-maker-cli`.
The CLI takes an "intent" (rough notes) and uses an LLM to generate a structured prompt. It can also "polish" the prompt for better quality.
The CLI outputs JSON when the `--json` flag is used, which is the preferred method for this plugin to ensure reliable parsing.

**CLI Reference (for implementation logic):**

- **Executable:** `prompt-maker-cli` (or a custom path via node).
- **Input:** Accepts input via a file using `-f` or `--intent-file <path>`.
- **Output:** Returns JSON containing `.prompt` and optionally `.polishedPrompt`.
- **Key Flags:**
  - `--json`: Forces JSON output.
  - `--model <name>`: Sets the generation model (e.g., `gpt-4o-mini`, `gemini-1.5-flash`).
  - `--polish`: Enables the polishing pass.
  - `--polish-model <name>`: Sets the model for polishing.

**Functional Requirements:**

1.  **Core Logic:**
    - The plugin must capture text from the current buffer (either the entire buffer or a visual selection).
    - It should write this text to a temporary file.
    - It should execute the CLI command asynchronously (using `vim.loop` or `vim.system`) pointing to that temporary file.
    - It must parse the returned JSON to extract the final text.

2.  **Commands:**
    - `:PromptMakerGenerate [model]`: Generates a prompt based on the selection/buffer. Opens the result in a new vertical split buffer (Markdown filetype).
    - `:PromptMakerPolish [model]`: Same as generate, but adds the `--polish` flag to the CLI call. If a polished prompt is returned, display that; otherwise, fall back to the standard prompt.

3.  **Configuration (`setup` function):**
    - `cli_path`: Path to the executable (default: `prompt-maker-cli`).
    - `default_model`: Default model for generation (default: `gpt-4o-mini`).
    - `default_polish_model`: Default model for polishing.
    - `output_split_direction`: `vertical` or `horizontal`.

4.  **Keybindings:**
    - Provide a way to map keys in the `setup` config or suggest default mappings (e.g., `<leader>pg` for generate, `<leader>pp` for polish).

5.  **Error Handling:**
    - If the CLI fails (non-zero exit code), show the stderr output in a notification (`vim.notify`) with level `ERROR`.
    - Handle JSON parsing errors gracefully.

**Constraints:**

- **Language:** Lua 5.1+ (Neovim standard).
- **Neovim Version:** Target Neovim 0.9.0+.
- **Dependencies:** Try to use native Neovim APIs (`vim.system`, `vim.api`, `vim.json`) to avoid external dependencies like `plenary.nvim` unless absolutely necessary for job management.
- **Asynchronous:** The editor must **not** freeze while the CLI is running.

**Output Format:**
Please provide the complete source code structured as follows:

1.  **File Structure:** A tree view of the recommended plugin layout.
2.  **`lua/prompt-maker/config.lua`**: Configuration handling.
3.  **`lua/prompt-maker/core.lua`**: The main logic for temp files, job execution, and JSON parsing.
4.  **`lua/prompt-maker/init.lua`**: The public API and `setup` function.
5.  **`plugin/prompt-maker.lua`**: User commands definition.
6.  **`README.md`**: Installation instructions (using `lazy.nvim` as an example) and usage documentation.

**Tech Stack:**

- Lua
- Neovim API
- Node.js (External Runtime for the CLI)
  Generated prompt ✓
