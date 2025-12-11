# Prompt Maker CLI TUI – UX suggestions

## Provide persistent, discoverable help
- Add a dedicated help overlay (e.g., `?` or `h`) so users can reopen the command palette shortcuts and navigation hints after the initial header scrolls off.
- Keep the overlay visible in both Generate and Test views, since navigation currently relies on Ctrl+G/Ctrl+T, Tab/Shift+Tab, and popup shortcuts that are only shown in the header/welcome lines.

## Broaden and surface model choices
- Expand the model picker with additional OpenAI/Gemini options (or user-configured entries) and show brief capability notes so users aren’t limited to the two defaults in the palette.
- Consider remembering the last-used model per session and exposing provider status (e.g., missing API key) in the picker to reduce failed runs.

## Make series/command workflows clearer
- Surface inline guidance for `/series` and other slash-commands directly in the Actions pane or command menu so users know when the CLI will reuse the last intent versus opening the Series popup.
- Provide an example row for `/test <file>` and `/json on|off` in the history or a lightweight command cheatsheet, matching what the README promises about JSON payloads and test execution.
