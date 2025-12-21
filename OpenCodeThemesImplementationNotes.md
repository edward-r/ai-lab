# OpenCode Themes: Implementation Notes

This repo implements **two distinct theming systems**:

1. **TUI (terminal UI) themes**: JSON theme definitions resolved into `RGBA` colors at runtime.
2. **Web/Desktop UI themes**: CSS-variable design tokens switched via `data-theme`.

They are intentionally separate: the terminal UI uses `@opentui/core` and theme JSON; the browser UI uses CSS custom properties.

---

## 1) TUI themes (JSON → RGBA)

### Key files

- Theme context and loader: `packages/opencode/src/cli/cmd/tui/context/theme.tsx:1`
- Theme picker dialog: `packages/opencode/src/cli/cmd/tui/component/dialog-theme-list.tsx:1`
- TUI root wiring and mode detection: `packages/opencode/src/cli/cmd/tui/app.tsx:38`
- Config field for selecting a theme: `packages/opencode/src/config/config.ts:614`
- Theme JSON example in-repo: `.opencode/themes/mytheme.json:1`
- Theme JSON schema (used on opencode.ai): `packages/web/public/theme.json:1`

### Theme model

The TUI defines a concrete set of semantic color slots (`ThemeColors`) that the UI consumes (primary/accent/text/background/borders, diff colors, markdown colors, syntax colors, etc.). See `ThemeColors` in `packages/opencode/src/cli/cmd/tui/context/theme.tsx:40`.

At runtime, the context exposes:

- `theme`: a `Proxy` over the resolved `Theme` object so reads always reflect the latest selection (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:308`).
- `syntax()` / `subtleSyntax()`: `SyntaxStyle` objects derived from the current theme for code/markdown rendering (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:304`).
- `mode()` and `setMode(...)`: the current `dark`/`light` appearance mode.
- `set(themeName)`: activates a theme by name.

### Built-in themes

Built-in themes are bundled as JSON imports (e.g. `opencode.json`, `tokyonight.json`, etc.) and registered in a single map:

- `DEFAULT_THEMES`: `packages/opencode/src/cli/cmd/tui/context/theme.tsx:134`

Because they’re imported as JSON modules, they ship “inside” the built binary (no runtime file reads for defaults).

### Theme JSON format and resolution

The theme JSON shape is described by the `ThemeJson` type in `packages/opencode/src/cli/cmd/tui/context/theme.tsx:124`.

A single theme file contains:

- Optional `defs`: named reusable colors
- Required `theme`: a map of semantic slots → color values

A “color value” can be:

- Hex: `"#RRGGBB"`
- Variant: `{ "dark": ..., "light": ... }`
- Reference string:
  - `defs` reference (e.g. `"nord8"`)
  - or another theme slot (e.g. `"primary"`)
- ANSI code number (0–255)
- Special strings: `"none"` / `"transparent"`

Resolution happens in `resolveTheme(...)` / `resolveColor(...)` (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:165`).

Notable behavior:

- `"none"` and `"transparent"` resolve to `RGBA(0,0,0,0)` (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:170`). In OpenTUI, “transparent” generally means “don’t paint a color; let the terminal default show through”.
- Reference strings resolve through `defs` first, then through other keys inside `theme.theme` (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:74`–`80`).
- ANSI codes resolve through `ansiToRgba(...)` (0–15 standard ANSI, 16–231 color cube, 232–255 grayscale ramp) (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:223`).

#### Optional keys and backward compatibility

The `Theme` type adds a couple of non-color properties used by the UI:

- `thinkingOpacity` (defaults to `0.6`) (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:214`)

And some theme keys are optional with fallbacks:

- `selectedListItemText`: optional; if not provided, it falls back to `background` for backward compatibility (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:196`).
- `backgroundMenu`: optional; if not provided, it falls back to `backgroundElement` (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:206`).

There’s also a helper for list selection text color selection:

- `selectedForeground(theme)`: uses explicit `selectedListItemText` when present, otherwise tries to infer contrast when the background is transparent (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:100`).

### Light/dark mode selection

The TUI computes an initial `mode` by querying the terminal background color using OSC 11 (`\x1b]11;?\x07`) and estimating luminance:

- `getTerminalBackgroundColor()`: `packages/opencode/src/cli/cmd/tui/app.tsx:38`

That mode is passed into the `ThemeProvider` as the initial mode:

- `<ThemeProvider mode={mode}>`: `packages/opencode/src/cli/cmd/tui/app.tsx:120`

After that, the active mode is persisted in the TUI key/value store under `theme_mode`:

- `kv.get("theme_mode", props.mode)`: `packages/opencode/src/cli/cmd/tui/context/theme.tsx:275`
- `kv.set("theme_mode", mode)`: `packages/opencode/src/cli/cmd/tui/context/theme.tsx:327`

The KV store is backed by a JSON file at `Global.Path.state/kv.json` (`packages/opencode/src/cli/cmd/tui/context/kv.tsx:12`).

### Theme selection UX (dialog + preview)

There are two main ways to switch themes in the TUI:

- Command palette / action: `theme.switch` opens the theme dialog (`packages/opencode/src/cli/cmd/tui/app.tsx:356`).
- Slash command: `/theme` triggers `theme.switch` (`packages/opencode/src/cli/cmd/tui/component/prompt/autocomplete.tsx:319`).

The picker UI is implemented in `DialogThemeList`:

- It lists `Object.keys(theme.all())`, sorted (`packages/opencode/src/cli/cmd/tui/component/dialog-theme-list.tsx:8`).
- It **previews** as you move the selection: `onMove` calls `theme.set(opt.value)` (`packages/opencode/src/cli/cmd/tui/component/dialog-theme-list.tsx:28`).
- It **reverts** the preview if you close/cancel: `onCleanup` restores the initial theme unless confirmed (`packages/opencode/src/cli/cmd/tui/component/dialog-theme-list.tsx:19`).
- It **persists** the confirmed selection via `kv.set("theme", themeName)` inside `theme.set(...)` (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:329`).

Additionally, the theme can be set via config:

- `theme` in `opencode.json` (`packages/opencode/src/config/config.ts:617`).

That config value wins over the persisted KV selection at startup:

- `active: (sync.data.config.theme ?? kv.get("theme", "opencode"))` (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:276`).

### Custom theme loading

Custom themes are discovered with a `Bun.Glob("themes/*.json")` and merged into the theme map at runtime (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:340`).

The loader scans these directories (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:42`):

1. `Global.Path.config` (XDG config dir, typically `~/.config/opencode`) (`packages/opencode/src/global/index.ts:13`)
2. Every `.opencode` directory found while walking from `process.cwd()` up to filesystem root (`packages/opencode/src/util/filesystem.ts:29`)

It then loads any `themes/*.json` found under each of those directories (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:54`). The filename (without `.json`) becomes the theme name.

Important detail: directories are scanned in this order:

- `Global.Path.config` first
- then `.opencode` from the current directory upward

Because later assignments overwrite earlier ones (`result[name] = ...`), an ancestor `.opencode/themes/<name>.json` will override a descendant one if both exist.

### “System” theme

The special `system` theme is generated dynamically from the terminal’s current palette:

- Palette read: `renderer.getPalette({ size: 16 })` (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:291`)
- Theme generation: `generateSystem(colors, store.mode)` (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:297`)

It uses the terminal’s default background/foreground and palette colors (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:368`) and derives:

- A grayscale ramp based on the terminal background (`generateGrayScale`) (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:462`)
- A muted text color tuned to the background luminance (`generateMutedTextColor`) (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:516`)

### Syntax highlighting in the TUI

Syntax colors in the theme are used to build a `SyntaxStyle` ruleset:

- Rule mapping: `getSyntaxRules(theme)` (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:575`)
- Style object: `SyntaxStyle.fromTheme(...)` (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:548`)

Two variants are exposed:

- `syntax()`: normal colors
- `subtleSyntax()`: same rules but alpha reduced using `thinkingOpacity` (used for “thinking/reasoning” blocks) (`packages/opencode/src/cli/cmd/tui/context/theme.tsx:551`)

You can see these used in session rendering:

- Normal markdown: `syntaxStyle={syntax()}` (`packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:1196`)
- Thinking blocks: `syntaxStyle={subtleSyntax()}` (`packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:1180`)

### API endpoints mentioning themes

The SDK/OpenAPI includes a `POST /tui/open-themes` endpoint (`packages/opencode/src/server/server.ts:2201`). It is documented as “Open themes dialog”, but currently publishes the `session.list` command (`packages/opencode/src/server/server.ts:2218`), so it does not directly switch/open the theme dialog in the current implementation.

---

## 2) Web/Desktop themes (CSS variables + `data-theme`)

### Key files

- CSS palette tokens: `packages/ui/src/styles/colors.css:1`
- CSS semantic theme tokens: `packages/ui/src/styles/theme.css:1`
- CSS entrypoint: `packages/ui/src/styles/index.css:1`
- Desktop theme initialization: `packages/desktop/index.html:18`
- Tauri theme initialization: `packages/tauri/index.html:18`

### How it works

The browser-based UIs (desktop + tauri) use a traditional “design tokens” approach:

- `packages/ui/src/styles/colors.css:1` defines base color ramps (e.g. `--smoke-light-...`, `--cobalt-dark-...`).
- `packages/ui/src/styles/theme.css:1` maps those ramps into semantic tokens used by components (e.g. `--background-base`, `--text-base`, `--border-base`, `--syntax-*`, `--markdown-*`).
- Component styles use `var(...)` references to those semantic tokens (see imports in `packages/ui/src/styles/index.css:1`).

### Default theme and dark mode

The default theme is defined on `:root` and includes an internal dark-mode override using `@media (prefers-color-scheme: dark)`:

- Light defaults begin under `/* OC-1-light */` (`packages/ui/src/styles/theme.css:71`).
- Dark overrides begin under `/* OC-1-dark */` inside the media query (`packages/ui/src/styles/theme.css:327`).

This means that the default “oc-1” theme adapts to system/browser dark mode automatically.

### Switching themes with `data-theme`

Additional themes override the same CSS variables under a selector like:

- `html[data-theme="oc-2-paper"] { ... }` (`packages/ui/src/styles/theme.css:581`).

Desktop/Tauri set this attribute at startup based on `localStorage`:

- `const savedTheme = localStorage.getItem("theme") || "oc-1"` (`packages/desktop/index.html:20`)
- `document.documentElement.setAttribute("data-theme", savedTheme)` (`packages/desktop/index.html:21`)

The same logic exists in `packages/tauri/index.html:20`.

The desktop app has a commented-out theme toggle command prototype (not currently active): `packages/desktop/src/pages/session.tsx:181`.

---

## 3) Theme schemas and examples

### Theme schema files

There are multiple copies of the theme JSON schema in this repo:

- `packages/web/public/theme.json:1` (includes `selectedListItemText`)
- `packages/console/app/public/theme.json:1` (appears older; missing `selectedListItemText` and other newer keys)

The TUI implementation itself supports additional optional keys beyond the web schema (notably `backgroundMenu` and `thinkingOpacity`) in `packages/opencode/src/cli/cmd/tui/context/theme.tsx:127`.

### Example theme

The repo includes a complete custom theme example at:

- `.opencode/themes/mytheme.json:1`

It demonstrates:

- `defs` for reusable named colors
- per-mode variants (`dark` / `light`)
- referencing `defs` keys inside the `theme` section

---

## 4) Quick mental model

- **TUI themes** are _semantic slots → RGBA_, resolved dynamically, used directly as props like `fg={theme.text}` and for syntax styles.
- **Web/Desktop themes** are _CSS variable tokens_, resolved by the browser, switched by `data-theme` and `prefers-color-scheme`.

If you want, I can also add a short “how to add a new built-in TUI theme” checklist (where to put the JSON and how it gets included in `DEFAULT_THEMES`).



