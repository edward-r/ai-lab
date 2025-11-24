# Prompt Maker CLI

Terminal-first interface for the prompt-maker workflow. Feed it a rough draft, review diagnosis scores, answer clarifying questions, and emit an improved (optionally polished) contract without leaving your shell or editor.

## Usage

```bash
npx nx run prompt-maker-cli:serve --prompt-file prompt.txt --polish
```

Key flags:

- `--prompt` / `--prompt-file` / stdin – provide the initial draft.
- `--answers-json` / `--answers-file` – seed clarifying answers (JSON object keyed by criterion).
- `--max-questions` – cap the number of questions (default: 4).
- `--json` – emit machine-readable output for editor integrations.
- `--no-interactive` – skip interactive prompts even when running in a TTY.
- `--polish` / `--model` – enable the OpenAI finishing pass (requires `OPENAI_API_KEY`).

When run in an interactive terminal the CLI will ask any missing clarifying questions inline. In non-interactive contexts (e.g., piping input or calling from another program) these prompts are skipped so you can fully automate the flow. When options are available the prompt shows a numbered list—enter the number (or comma-separated numbers) to choose, or type a custom response.

## AI Prompt Generation

Use the new `generate` subcommand when you only have fuzzy intent and want a Hey Presto–style artifact immediately:

```bash
prompt-maker-cli generate "Sketch a Node.js scraper for Amazon prices" --copy --open-chatgpt
```

Key flags for `generate`:

- Inline intent argument, `--intent-file`, or piped stdin provide the source notes.
- `--model <name>` swaps models (defaults to `promptGenerator.defaultModel` in `~/.config/prompt-maker-cli/config.json` or `PROMPT_MAKER_GENERATE_MODEL`, falling back to `gpt-4o-mini`).
- `--interactive` walks through iterative refinements and re-generates after each tweak.
- `--copy` pushes the final artifact to the clipboard; `--open-chatgpt` launches `https://chatgpt.com/?q=...` with the encoded result.

The generate flow relies on `OPENAI_API_KEY`. Set the env var or place it in `~/.config/prompt-maker-cli/config.json`:

```json
{
  "openaiApiKey": "sk-...",
  "promptGenerator": {
    "defaultModel": "gpt-4o-mini"
  }
}
```

## NeoVim Plugin Integration

When wiring the CLI into a NeoVim plugin, prefer the non-interactive modes so you can capture stdout in your Lua/TypeScript glue code:

- Improvement flow: run `prompt-maker-cli --prompt-file <path> --json --no-interactive` and parse the JSON payload to render diagnostics and the improved prompt inside NeoVim buffers.
- Generation flow: call `prompt-maker-cli generate --intent-file <path>` (or pipe a scratch buffer via stdin). Pass `--model`, `--copy`, or `--open-chatgpt` flags as needed; the command prints the final prompt to stdout after each iteration, so capture the last emitted block for insertion into the editor.
- To offer “refine” loops inside NeoVim, run the command once, show the result, then collect user edits in the editor and invoke `prompt-maker-cli generate` again with the new refinements appended to the same temp file you pass via `--intent-file`.
- Ensure `OPENAI_API_KEY` (or a config file defined via `PROMPT_MAKER_CLI_CONFIG`) is available in the spawned process environment so the CLI can reach OpenAI.

### Shell hooks

```bash
# Improve an existing draft and capture machine-readable output
prompt-maker-cli --prompt-file /tmp/prompt-maker/input.md \
  --json --no-interactive > /tmp/prompt-maker/result.json

# Generate a structured prompt from fuzzy intent notes
prompt-maker-cli generate --intent-file /tmp/prompt-maker/intent.md \
  --model gpt-4o-mini > /tmp/prompt-maker/generated.txt
```

### Lua glue (Plenary Job example)

```lua
local Job = require('plenary.job')

local function run_prompt_maker(args, on_success)
  Job:new({
    command = 'prompt-maker-cli',
    args = args,
    env = vim.tbl_extend('force', vim.fn.environ(), {}),
    on_exit = function(job, code)
      vim.schedule(function()
        if code ~= 0 then
          vim.notify(table.concat(job:stderr_result(), '\n'), vim.log.levels.ERROR)
          return
        end
        on_success(table.concat(job:result(), '\n'))
      end)
    end,
  }):start()
end

local function improve_prompt(prompt_path)
  run_prompt_maker({ '--prompt-file', prompt_path, '--json', '--no-interactive' }, function(output)
    local payload = vim.json.decode(output)
    vim.api.nvim_buf_set_lines(0, 0, -1, false, vim.split(payload.result.improvedPrompt, '\n'))
  end)
end

local function generate_prompt(intent_path, opts)
  local args = { 'generate', '--intent-file', intent_path }
  if opts and opts.model then
    table.insert(args, '--model')
    table.insert(args, opts.model)
  end
  run_prompt_maker(args, function(output)
    local prompt = output:gsub('%s*$', '')
    vim.api.nvim_buf_set_lines(0, 0, -1, false, vim.split(prompt, '\n'))
  end)
end
```

Swap out the buffer-writing pieces with whatever workflow (floating windows, quickfix, etc.) your plugin prefers. Pass refinements by editing the intent scratch buffer, saving to the same temp file, and re-running `generate_prompt`.

## JSON Automation

Combine `--json` with scripted answers to drive the CLI from tools like NeoVim:

```bash
node apps/prompt-maker-cli/dist/index.js \
  --prompt-file prompt.txt \
  --answers-json '{"constraints":"Functional TypeScript only"}' \
  --json > result.json
```

The JSON payload includes the original diagnosis, clarifying questions, collected answers, and the improved/polished prompt text so you can render it however you like.

## Global Install

Once the CLI is built you can install it system-wide:

```bash
# from the repo
npx nx build prompt-maker-cli
cd apps/prompt-maker-cli
npm install -g .
```

That registers the `prompt-maker-cli` command globally, so your NeoVim plugin (or any shell script) can invoke it simply as:

```bash
prompt-maker-cli --prompt-file prompt.txt --json
```

When we publish the package you will also be able to run:

```bash
npm install -g @perceptron/prompt-maker-cli
```
