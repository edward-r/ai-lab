# prompt-maker-cli TUI Theming: Atomic Prompt Series

This file decomposes the provided theming prompt into a series of **atomic**, **independently executable** prompts.

- Each prompt is self-contained: a fresh coding session can run it without relying on prior chat context.
- The prompts are sequenced so work is not repeated; each step **extends** artifacts created earlier.
- Scope is **TUI theming only** (Ink) unless the codebase clearly shows an existing web UI that also needs theme tokens.
- Authoritative behavior/spec reference: `/Users/eroberts/Downloads/TUI UAT Images/OpenCode Themes Implementation Notes.md`.

## Repo constraints (apply to every prompt)

- Target app: `apps/prompt-maker-cli` (Ink-based TUI).
- TypeScript: `strict`, `noUncheckedIndexedAccess`; **do not use `any`**.
- Formatting: Prettier (100 cols, single quotes, trailing commas, no semicolons).
- Do not break existing CLI commands/keybindings/popups.
- Errors must be descriptive; do not swallow failures.
- Do not implement Opencode’s web/CSS theming unless there is an actual web UI requiring it.

## Suggested validation commands

Use these as appropriate per prompt:

- Unit tests: `npx jest --runInBand`
- Targeted tests: `npx jest apps/prompt-maker-cli/src/__tests__/... --runInBand`
- Lint: `npx nx lint prompt-maker-cli`

---

# Atomic Prompt 1 — Audit colors + introduce theme types (no behavior change)

## Objective

Create the foundational **theme token model** (semantic slots) for the Ink TUI, and produce a concrete inventory of current hard-coded color usage so later refactors can be systematic.

## Authoritative reference

Read `/Users/eroberts/Downloads/TUI UAT Images/OpenCode Themes Implementation Notes.md` to match Opencode’s TUI theme shape and resolution behavior.

## Scope

- TUI theming only (Ink).
- No UI changes yet; do not change runtime behavior.

## Work to do

1. Audit the TUI code for hard-coded Ink colors.
   - Search under `apps/prompt-maker-cli/src/tui/**` and `apps/prompt-maker-cli/src/tui/components/**`.
   - Record each instance (file + usage) and classify the intended semantic meaning (e.g., accent, error, selection background).
   - This inventory must live in code (not a new doc file), to avoid creating extra documentation files.
2. Define a semantic token set (minimum required slots):
   - `background`, `text`, `mutedText`, `border`, `accent`, `accentText`, `warning`, `error`, `success`
   - `panelBackground`, `popupBackground`, `selectionBackground`, `selectionText`
   - `chipBackground`, `chipText`, `chipMutedText`
3. Add TypeScript types for:
   - `ThemeMode` (`'light' | 'dark' | 'system'` or `'auto'`; pick one and justify in code organization)
   - `ResolvedTheme` (all required semantic slots, each as an Ink-compatible color value)
   - `ThemeJson` and `ThemeColorValue` as per Opencode notes (structure only in this prompt; parsing/resolution comes later)
4. Put the types in a dedicated module under the TUI tree, for example:
   - `apps/prompt-maker-cli/src/tui/theme/theme-types.ts`
   - Keep module boundaries clean: no Ink component imports in this types module.
5. Put the hard-coded color inventory in a small TS module near the types (example: `apps/prompt-maker-cli/src/tui/theme/color-audit.ts`).
   - Export a typed data structure (array of objects) listing `file`, `tokenSuggestion`, and `notes`.
   - This is a temporary aid for the refactor prompts; keep it tidy.

## Non-goals

- Do not implement the resolver yet.
- Do not add theme loading, persistence, or UI changes.

## Acceptance criteria

- A new theme types module exists and compiles.
- A color-audit module exists with a complete-enough inventory to drive later work.
- No runtime behavior changes in the TUI.

## Validation

- `npx nx lint prompt-maker-cli`
- `npx jest --runInBand` (only fix failures caused by your changes)

---

# Atomic Prompt 2 — Implement theme resolver (hex/variants/refs/ANSI/transparent)

## Objective

Implement the **Opencode-style theme JSON resolver** that converts a `ThemeJson` into a `ResolvedTheme` for a selected mode.

## Prerequisites

- The repo contains the theme type definitions from Prompt 1 (verify and reuse them; do not recreate them).

## Authoritative reference

Use `/Users/eroberts/Downloads/TUI UAT Images/OpenCode Themes Implementation Notes.md` as the source of truth for:

- Theme JSON shape (`defs`, `theme`)
- Supported color value forms
- Reference resolution rules and cycle detection expectations

## Scope

- Implement the resolver as pure functions with strong typing.
- Do not wire into UI yet.

## Work to do

1. Create a resolver module, for example:
   - `apps/prompt-maker-cli/src/tui/theme/theme-resolver.ts`
2. Support `ThemeColorValue` inputs:
   - Hex string `#RRGGBB`
   - Variant object `{ dark: <value>, light: <value> }` (values can recursively be any supported form)
   - Reference strings (resolve in this order):
     1. `defs` entries
     2. semantic theme keys (other slots)
   - ANSI color codes `0..255`
   - Special strings: `'none'` and `'transparent'` (decide a single normalized representation suitable for Ink)
3. Provide deterministic behavior:
   - `resolveTheme(themeJson, mode) -> ResolvedTheme`
   - `resolveColor(value, ctx) -> ResolvedColor` (whatever your Ink-compatible output is)
   - Cycle detection for references (clear error message that includes the cycle path)
   - Missing required slots must produce a clear error and/or a deterministic fallback mechanism (prefer: throw a descriptive error; later prompts can catch and fall back)
4. ANSI mapping:
   - Implement a pragmatic mapping from 0–255 to `#RRGGBB`.
   - Document assumptions in code via naming (avoid long inline comments; keep it minimal).
5. Keep output Ink-compatible:
   - Ink supports hex strings for `color` / `backgroundColor`.
   - If Opencode uses RGBA/alpha, ignore alpha (or treat alpha=0 as transparent). Do not attempt true alpha blending in terminals.

## Tests

Add unit tests focused on the resolver:

- Put tests in `apps/prompt-maker-cli/src/__tests__/tui/theme-resolver.test.ts` (or similar existing conventions).
- Cover:
  - hex pass-through
  - variant selection by mode
  - `defs` references
  - theme-slot references
  - reference cycles
  - ANSI code mapping
  - transparent/none normalization

## Acceptance criteria

- Resolver handles all required value forms.
- Tests cover edge cases and pass.

## Validation

- `npx jest apps/prompt-maker-cli/src/__tests__/tui/theme-resolver.test.ts --runInBand`
- `npx nx lint prompt-maker-cli`

---

# Atomic Prompt 3 — Add built-in themes + theme registry

## Objective

Create a theme registry that exposes:

- a small set of **built-in themes**
- a stable API for listing themes and retrieving their `ThemeJson`

## Prerequisites

- Theme types and resolver exist (Prompts 1–2). Verify and reuse.

## Scope

- No file-system discovery yet.
- No persistence yet.
- No UI wiring yet.

## Work to do

1. Add built-in theme JSON modules (keep them minimal but representative):
   - At least 1 dark and 1 light theme.
   - Place under `apps/prompt-maker-cli/src/tui/theme/builtins/`.
   - Each theme JSON must match your `ThemeJson` type.
2. Implement a registry module, e.g. `apps/prompt-maker-cli/src/tui/theme/theme-registry.ts`, that:
   - Exposes a list of available themes: name + label + `ThemeJson`
   - Defines a default theme name
   - Keeps ordering deterministic
3. Add tests ensuring:
   - Registry returns built-ins deterministically
   - Default theme exists in the list

## Acceptance criteria

- Built-in themes load as TS modules and satisfy typing.
- Registry provides deterministic listing.

## Validation

- `npx jest apps/prompt-maker-cli/src/__tests__/tui/theme-registry.test.ts --runInBand`

---

# Atomic Prompt 4 — Implement custom theme discovery from disk (precedence rules)

## Objective

Implement discovery of custom `*.json` themes from disk, merged with built-ins using clear precedence rules.

## Prerequisites

- Built-in theme registry exists (Prompt 3). Do not duplicate built-in definitions.

## Scope

- Read-only discovery + parsing + validation.
- Do not add persistence of selection yet.
- Do not add UI yet.

## Required discovery behavior

1. Discover custom themes from these directories (create if absent only when persisting in a later prompt):
   - Global: `~/.config/prompt-maker-cli/themes/*.json`
   - Project-local: `.prompt-maker-cli/themes/*.json` discovered by searching upward from `process.cwd()` to repo root (or filesystem root). Stop at root.
2. Precedence (highest wins on name collision):
   - Project-local overrides global overrides built-in.
3. Invalid theme JSON handling:
   - Do not crash the app.
   - Collect errors and expose them to callers so the UI/persistence layer can display a warning and fall back.

## Implementation notes

- Add a loader module, e.g. `apps/prompt-maker-cli/src/tui/theme/theme-loader.ts`, exporting:
  - `loadThemes(options) -> { themes: ThemeDescriptor[]; errors: ThemeLoadError[] }`
- Validate:
  - file parses as JSON
  - matches expected `ThemeJson` shape (use type guards / runtime checks; no `any`)
  - theme has a stable name (derive from filename if name not in file; choose one approach and keep deterministic)

## Tests

Add tests for:

- precedence ordering
- invalid JSON file surfaces an error but does not prevent other themes from loading
- collisions resolve correctly

Use fixtures under `apps/prompt-maker-cli/src/__tests__/__fixtures__/themes/` (or similar), and ensure tests do not depend on a user’s real home dir.

## Acceptance criteria

- Loader returns merged theme list with correct precedence.
- Loader reports invalid themes without crashing.

## Validation

- `npx jest apps/prompt-maker-cli/src/__tests__/tui/theme-loader.test.ts --runInBand`

---

# Atomic Prompt 5 — Add config persistence for theme + mode

## Objective

Persist the user’s selected theme and theme mode across runs by extending the CLI config.

## Prerequisites

- There is an existing config loader at `apps/prompt-maker-cli/src/config.ts`.
- Theme mode type exists (Prompt 1).
- Theme loading exists (Prompt 4) to validate selections.

## Scope

- Extend config schema and read/write.
- No UI picker yet.

## Required behavior

1. Extend the config type to include:
   - `theme?: string`
   - `themeMode?: 'light' | 'dark' | 'system'` (or `'auto'`, but be consistent with Prompt 1)
2. Startup selection rules (deterministic):
   - If config specifies a theme name and it exists, use it.
   - If config specifies a theme name and it does not exist or is invalid, warn (structured error) and fall back to default built-in.
   - If config specifies a mode, use it; otherwise default to `'dark'` (or your chosen default).
3. Writing:
   - Provide a function to update persisted theme settings (don’t require rewriting unrelated config fields).

## Integration surface

- Add a small service module near the TUI theme code that coordinates:
  - loading themes
  - choosing active theme name/mode from config
  - saving changes back to config

## Tests

Add tests for:

- config read defaulting behavior
- invalid theme name falls back deterministically
- saving updates config

## Acceptance criteria

- Selected theme and mode persist across runs via config.

## Validation

- `npx jest apps/prompt-maker-cli/src/__tests__/tui/theme-persistence.test.ts --runInBand`

---

# Atomic Prompt 6 — Add TUI ThemeProvider + hook; wire into AppContainer

## Objective

Introduce a TUI-level `ThemeProvider` that exposes the resolved theme and setters, and wire it into the TUI root so all components can consume theme tokens.

## Prerequisites

- Resolver + themes + loader + persistence exist (Prompts 2–5).
- Existing TUI root is `apps/prompt-maker-cli/src/tui/AppContainer.tsx`.
- Existing context store/provider exists (see `apps/prompt-maker-cli/src/tui/context-store.ts` and `apps/prompt-maker-cli/src/tui/context.tsx`). Reuse patterns.

## Scope

- Provider/hook only; do not refactor all components yet.

## Required API

Provide a hook (names are suggestions; keep consistent with repo patterns):

- `useTheme()` returns:
  - `theme: ResolvedTheme`
  - `mode: ThemeMode`, `setMode(mode: ThemeMode)`
  - `activeThemeName: string`, `setTheme(name: string)`
  - `themes: ThemeDescriptor[]` (or `allThemes()`)

## Behavior

- On mount, provider loads themes and resolves active theme according to persisted config.
- `setTheme` and `setMode`:
  - update state
  - persist to config
  - re-resolve theme and trigger re-render
- Failure cases:
  - if a chosen theme cannot be resolved, fall back to default theme and expose an error for UI display later

## Acceptance criteria

- `AppContainer` wraps the app with `ThemeProvider`.
- A simple consumer (add a tiny usage in one component) proves it re-renders when theme changes.

## Validation

- `npx nx lint prompt-maker-cli`
- `npx jest --runInBand`

---

# Atomic Prompt 7 — Refactor existing TUI components to use theme tokens

## Objective

Replace hard-coded Ink colors across the TUI with semantic tokens from `useTheme()`.

## Prerequisites

- Color audit module exists (Prompt 1).
- ThemeProvider/hook wired into app (Prompt 6).

## Scope

- Only color props change; keep layout/behavior identical.
- Refactor incrementally but complete: do not leave a mixture of old hard-coded colors unless unavoidable.

## Files to prioritize

- `apps/prompt-maker-cli/src/tui/AppContainer.tsx`
- `apps/prompt-maker-cli/src/tui/CommandScreen.tsx`
- `apps/prompt-maker-cli/src/tui/config.ts` (if any color usage)
- Components used by the main screen (popups, input bar, help overlay, toast, etc.)

## Mapping guidance

- Borders -> `theme.border`
- Main text -> `theme.text`
- Muted text -> `theme.mutedText`
- Panels/popups -> `theme.panelBackground` / `theme.popupBackground`
- Selected rows -> `theme.selectionBackground` + `theme.selectionText`
- Errors/warnings/success -> `theme.error` / `theme.warning` / `theme.success`
- Accents/titles -> `theme.accent` + `theme.accentText`

## Acceptance criteria

- No (or near-zero) remaining hard-coded colors in TUI files.
- Visual semantics unchanged; only colors now come from theme.

## Validation

- `npx nx lint prompt-maker-cli`
- `npx jest --runInBand`
- Manual sanity: run `npx nx serve prompt-maker-cli -- --help` and open the TUI flows you can (verify readability).

---

# Atomic Prompt 8 — Implement `/theme` command + theme picker popup (preview + cancel revert)

## Objective

Add an Opencode-like theme selection UX to the TUI:

- `/theme` opens a picker popup
- moving selection previews theme
- escape cancels and reverts
- confirm persists

## Prerequisites

- Themes load and provider can apply/persist theme (Prompts 4–6).
- Existing command/popup patterns exist:
  - command config: `apps/prompt-maker-cli/src/tui/config.ts`
  - popups likely near `apps/prompt-maker-cli/src/tui/components/` (inspect for `ModelPopup`/`TogglePopup`-like components)

## Scope

- Implement picker UI and integrate with command handling.

## Required behavior

1. Command wiring:
   - Add a command descriptor in `apps/prompt-maker-cli/src/tui/config.ts` (example: `/theme`).
2. Popup:
   - List all available themes (built-in + discovered).
   - Show current theme.
   - Keyboard navigation consistent with existing popups.
3. Preview:
   - When selection changes, call `setTheme` **in preview mode**.
   - On cancel (escape), revert to previously active theme without persisting.
   - On confirm (enter), persist active selection.
4. Error display:
   - If a theme fails to resolve, keep UI responsive, display an error message, and do not permanently switch.

## Acceptance criteria

- `/theme` opens a picker.
- Preview applies while navigating.
- Cancel reverts.
- Confirm persists and survives restart (via config).

## Validation

- Add at least one integration-ish test if feasible, otherwise unit test the preview/revert logic in isolation.
- `npx jest --runInBand`

---

# Atomic Prompt 9 — Implement mode switching (light/dark/system) + document limitations

## Objective

Support `ThemeMode` switching, including a pragmatic `'system'`/`'auto'` behavior.

## Prerequisites

- Theme JSON supports variants and resolver selects by mode (Prompt 2).
- Persistence stores `themeMode` (Prompt 5).
- Theme provider exposes `mode` + `setMode` (Prompt 6).

## Scope

- Implement mode selection and fallback behavior.
- UI can be either:
  - a new `/theme-mode` command, or
  - extend the theme picker popup to also toggle mode.

## Required behavior

- `light` and `dark` select explicitly.
- `system/auto`:
  - If reliable terminal background detection is feasible in Node/Ink without native deps, implement it.
  - Otherwise: implement deterministic fallback (recommend: default to `dark`) and clearly surface this limitation in docs.

## Acceptance criteria

- Switching mode re-resolves theme and re-renders.
- Mode persists across restart.

## Validation

- Unit tests for mode selection and persistence.

---

# Atomic Prompt 10 — Documentation update + theme JSON examples

## Objective

Document how to use and extend the theming system, including where custom themes live and the JSON format.

## Prerequisites

- The full theming pipeline exists (resolver, registry, loader, persistence, provider, picker).

## Scope

- Update existing docs files only; do not create new docs unless necessary.

## Documentation requirements

1. Update `apps/prompt-maker-cli/README.md` (or the most appropriate existing doc) to include:
   - How to open theme picker (`/theme`)
   - How to change mode (whatever UI you implemented)
   - Where to place custom themes:
     - `~/.config/prompt-maker-cli/themes/*.json`
     - `.prompt-maker-cli/themes/*.json` (project-local)
   - Precedence rules
   - Theme JSON format:
     - `defs` and `theme`
     - supported color values (hex, variants, refs, ANSI, transparent/none)
   - Limitations vs Opencode (especially system mode detection / alpha)
2. Include at least one example theme JSON in the repo.
   - Prefer placing examples alongside built-ins under `apps/prompt-maker-cli/src/tui/theme/builtins/` or a clearly named `examples/` directory under the theme folder.
   - Ensure it is either:
     - used as a built-in theme, or
     - referenced in docs for copy/paste.

## Acceptance criteria

- A reader can install a custom theme and select it.
- Docs match actual behavior.

## Validation

- Manual read-through: follow docs to add a theme and select it.

---

## Notes on keeping prompts atomic

If you run these in separate sessions, each session should:

- Verify prerequisite files/modules exist (from earlier prompts).
- Only extend existing artifacts; do not recreate modules in new locations.
- Keep code style consistent (Prettier + strict TS).
