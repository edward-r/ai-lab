import type { ThemeSlot } from './theme-types'

export type ColorAuditEntry = {
  file: string
  tokenSuggestion: ThemeSlot
  notes: string
}

export const COLOR_AUDIT: readonly ColorAuditEntry[] = [
  {
    file: 'apps/prompt-maker-cli/src/tui/AppContainer.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L129: app title uses `Text color="cyanBright"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/AppContainer.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L130-L132: top-level shortcut/help line uses `Text color="gray"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/AppContainer.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L141-L149: usage guidance lines use `Text color="gray"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/AppContainer.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L164: Test Runner intro line uses `Text color="gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/screens/command/CommandScreenImpl.tsx',
    tokenSuggestion: 'warning',
    notes: 'L60: transport status uses `Text color="yellow"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/ContextPanel.tsx',
    tokenSuggestion: 'border',
    notes: 'L99: panel chrome uses `borderColor="cyan"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/ContextPanel.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L11: focused section header uses `Text color="green"` (focus highlight, not success).',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/ContextPanel.tsx',
    tokenSuggestion: 'selectionText',
    notes: 'L19: highlighted list entry uses `Text color="yellow"` (selection without bg).',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/ContextPanel.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L114/L123/L141/L150/L164: helper text uses `Text color="gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/MediaPanel.tsx',
    tokenSuggestion: 'border',
    notes: 'L81: panel chrome uses `borderColor="magenta"` (panel-kind specific today).',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/MediaPanel.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L11: focused section header uses `Text color="green"` (focus highlight, not success).',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/MediaPanel.tsx',
    tokenSuggestion: 'selectionText',
    notes: 'L19: highlighted list entry uses `Text color="yellow"` (selection without bg).',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/MediaPanel.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L96/L105/L123/L132/L134: helper text uses `Text color="gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/input-bar-presentation.ts',
    tokenSuggestion: 'accent',
    notes: 'L21: intent mode uses `borderColor: "cyan"` (primary input chrome).',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/input-bar-presentation.ts',
    tokenSuggestion: 'warning',
    notes: 'L13: refinement mode uses `borderColor: "yellow"` and `labelColor: "yellow"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/input-bar-presentation.ts',
    tokenSuggestion: 'mutedText',
    notes: 'L23: intent label uses `labelColor: "gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/InputBar.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L78-L79: hint/debug lines use `Text color="gray"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/InputBar.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L97: status value uses `Text color="cyan"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/InputBar.tsx',
    tokenSuggestion: 'text',
    notes: 'L104: model value uses `Text color="white"` (explicit text color).',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/MultilineTextInput.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L52: placeholder uses `color: "gray"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/MultilineTextInput.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L184: prompt prefix uses `Text color="cyan"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/SingleLineTextInput.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L113: placeholder uses `color: "gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/StatusIndicators.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L32/L60: labels and separators use `Text color="gray"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/StatusIndicators.tsx',
    tokenSuggestion: 'success',
    notes: 'L16-L27: segment style mapping uses `green` for success.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/StatusIndicators.tsx',
    tokenSuggestion: 'warning',
    notes: 'L16-L27: segment style mapping uses `yellow` for warning.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/StatusIndicators.tsx',
    tokenSuggestion: 'error',
    notes: 'L16-L27: segment style mapping uses `red` for danger.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/StatusIndicators.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L22-L24: segment style mapping uses `cyan` for primary.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/Toast.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L19: `info` toast uses `borderColor/textColor: "gray"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/Toast.tsx',
    tokenSuggestion: 'warning',
    notes: 'L21-L23: `progress`/`warning` toast uses `borderColor/textColor: "yellow"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/Toast.tsx',
    tokenSuggestion: 'error',
    notes: 'L25: `error` toast uses `borderColor/textColor: "red"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/HelpOverlay.tsx',
    tokenSuggestion: 'border',
    notes: 'L88: overlay chrome uses `borderColor="cyan"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/HelpOverlay.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L24/L95: title uses `magentaBright` in generate view, `cyanBright` in tests.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/HelpOverlay.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L96/L102/L112: body and hints use `Text color="gray"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/HelpOverlay.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L102: section titles use `cyanBright`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/CommandMenu.tsx',
    tokenSuggestion: 'border',
    notes: 'L12: command palette chrome uses `borderColor="magenta"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/CommandMenu.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L13: command palette title uses `Text color="magentaBright"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/CommandMenu.tsx',
    tokenSuggestion: 'selectionBackground',
    notes: 'L20-L22: selected command uses `{ backgroundColor: "magentaBright" }`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/CommandMenu.tsx',
    tokenSuggestion: 'selectionText',
    notes: 'L21-L22: selected uses `color: "black"`, unselected uses `color: "white"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/PastedSnippetCard.tsx',
    tokenSuggestion: 'border',
    notes: 'L11: pasted snippet card chrome uses `borderColor="magenta"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/PastedSnippetCard.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L12: snippet label uses `Text color="yellow"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/PastedSnippetCard.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L14/L18-L19: preview + footer use `Text color="gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/ScrollableOutput.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L27: user history entries use `Text color="cyan"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/ScrollableOutput.tsx',
    tokenSuggestion: 'warning',
    notes: 'L34: progress history entries use `Text color="yellow"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/core/ScrollableOutput.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L40: non-user entries use `Text color="gray"` (currently doubles as main output).',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SettingsPopup.tsx',
    tokenSuggestion: 'border',
    notes: 'L32: popup chrome uses `borderColor="blue"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SettingsPopup.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L33: popup title uses `Text color="blueBright"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SettingsPopup.tsx',
    tokenSuggestion: 'success',
    notes: 'L12-L25: settings segments map `success -> green`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SettingsPopup.tsx',
    tokenSuggestion: 'warning',
    notes: 'L12-L25: settings segments map `warning -> yellow`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SettingsPopup.tsx',
    tokenSuggestion: 'error',
    notes: 'L12-L25: settings segments map `danger -> red`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SettingsPopup.tsx',
    tokenSuggestion: 'text',
    notes: 'L21-L24: settings segments map `primary -> white`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SettingsPopup.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L36/L40/L47: empty + labels + footer use `Text color="gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ModelPopup.tsx',
    tokenSuggestion: 'border',
    notes: 'L154: popup chrome uses `borderColor="cyan"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ModelPopup.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L156/L181: title uses `cyanBright`; group headers use `magenta`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ModelPopup.tsx',
    tokenSuggestion: 'warning',
    notes: 'L36-L45: provider missing uses `color: "yellow"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ModelPopup.tsx',
    tokenSuggestion: 'error',
    notes: 'L36-L45: provider error uses `color: "red"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ModelPopup.tsx',
    tokenSuggestion: 'selectionBackground',
    notes: 'L191-L193: selected row uses `{ backgroundColor: "blueBright" }`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ModelPopup.tsx',
    tokenSuggestion: 'selectionText',
    notes: 'L191-L198: selected uses black text; unselected provider label uses gray.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ModelPopup.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L157/L172/L215: `esc`, empty, and footer hints use `Text color="gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/IntentFilePopup.tsx',
    tokenSuggestion: 'border',
    notes: 'L84: popup chrome uses `borderColor="cyan"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/IntentFilePopup.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L90: popup title uses `Text color="cyanBright"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/IntentFilePopup.tsx',
    tokenSuggestion: 'selectionBackground',
    notes: 'L111-L115: selected suggestion uses `cyanBright` when focused, `gray` when not.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/IntentFilePopup.tsx',
    tokenSuggestion: 'selectionText',
    notes: 'L113-L115: selected suggestion uses `color: "black"`; unselected uses `white`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/IntentFilePopup.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L93/L107/L123/L126/L132: labels + ellipses + hints use `Text color="gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SmartPopup.tsx',
    tokenSuggestion: 'border',
    notes: 'L88: popup chrome uses `borderColor="green"` (popup-kind specific today).',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SmartPopup.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L94: popup title uses `Text color="greenBright"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SmartPopup.tsx',
    tokenSuggestion: 'text',
    notes: 'L95: status line uses `Text color="white"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SmartPopup.tsx',
    tokenSuggestion: 'selectionBackground',
    notes: 'L122-L126: selected suggestion uses `cyanBright` when focused, `gray` when not.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SmartPopup.tsx',
    tokenSuggestion: 'selectionText',
    notes: 'L124-L126: selected uses `color: "black"`; unselected uses `white`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SmartPopup.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L100/L110/L112/L118/L134/L137: labels + ellipses + hints use `Text color="gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ListPopup.tsx',
    tokenSuggestion: 'border',
    notes: 'L101/L168: popup chrome uses `borderColor="blue"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ListPopup.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L102/L174: popup title uses `Text color="blueBright"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ListPopup.tsx',
    tokenSuggestion: 'selectionBackground',
    notes: 'L122-L124/L201-L204: selected item uses `{ backgroundColor: "blueBright" }`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ListPopup.tsx',
    tokenSuggestion: 'selectionText',
    notes: 'L123-L127/L203-L208: selected uses black text; unselected uses white.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ListPopup.tsx',
    tokenSuggestion: 'selectionBackground',
    notes: 'L223-L227: suggestion selection uses `cyanBright` when focused, `gray` when not.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ListPopup.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L104/L115/L118/L132/L139/L177/L193/L198/L211/L218/L219/L234/L239: uses gray hints.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/TestPopup.tsx',
    tokenSuggestion: 'border',
    notes: 'L19: popup chrome uses `borderColor="cyan"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/TestPopup.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L20: popup title uses `Text color="cyanBright"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/TestPopup.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L22/L32: popup helper line uses `Text color="gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SeriesIntentPopup.tsx',
    tokenSuggestion: 'border',
    notes: 'L21: popup chrome uses `borderColor="cyan"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SeriesIntentPopup.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L22: popup title uses `Text color="cyanBright"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/SeriesIntentPopup.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L26-L31/L41: hint and footer text use `Text color="gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/InstructionsPopup.tsx',
    tokenSuggestion: 'border',
    notes: 'L17: popup chrome uses `borderColor="cyan"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/InstructionsPopup.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L18: popup title uses `Text color="cyanBright"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/InstructionsPopup.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L20/L30: helper and footer text use `Text color="gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ReasoningPopup.tsx',
    tokenSuggestion: 'border',
    notes: 'L22/L38: popup chrome uses `borderColor="magenta"` (popup-kind specific today).',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ReasoningPopup.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L26/L39: popup title uses `Text color="magentaBright"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/ReasoningPopup.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L28/L31/L44: empty + footer hints use `Text color="gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/TogglePopup.tsx',
    tokenSuggestion: 'border',
    notes: 'L15: popup chrome uses `borderColor="yellow"` (popup-kind specific today).',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/TogglePopup.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L16: popup title uses `Text color="yellowBright"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/TogglePopup.tsx',
    tokenSuggestion: 'selectionBackground',
    notes: 'L20-L22: selected option uses `{ backgroundColor: "yellowBright" }`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/TogglePopup.tsx',
    tokenSuggestion: 'selectionText',
    notes: 'L21-L22: selected uses black text; unselected uses white.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/TogglePopup.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L31: footer hint uses `Text color="gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/TokenUsagePopup.tsx',
    tokenSuggestion: 'border',
    notes: 'L56/L85: popup chrome uses `borderColor="yellow"` (popup-kind specific today).',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/TokenUsagePopup.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L60/L86: popup title uses `Text color="yellowBright"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/TokenUsagePopup.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L62/L65/L89/L93/L102/L111/L117: labels and hints use `Text color="gray"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/components/popups/TokenUsagePopup.tsx',
    tokenSuggestion: 'text',
    notes: 'L88/L95/L104/L112-L113: data lines use `Text color="white"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestRunnerFileInput.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L32-L33: focused label/border uses green (focus highlight).',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestRunnerFileInput.tsx',
    tokenSuggestion: 'border',
    notes: 'L33: unfocused border uses `borderColor: "gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestRunnerActions.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L18: focused section label uses `Text color="green"` (focus highlight).',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestRunnerActions.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L20-L25: status metadata uses `Text color="gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestRunnerLogs.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L22: logs header uses `Text color="cyan"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestRunnerLogs.tsx',
    tokenSuggestion: 'error',
    notes: 'L26: error logs use `color: "red"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestRunnerLogs.tsx',
    tokenSuggestion: 'warning',
    notes: 'L26: warn logs use `color: "yellow"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestRunnerLogs.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L26: info logs use `color: "gray"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestRunnerSummary.tsx',
    tokenSuggestion: 'warning',
    notes: 'L22: summary header uses `Text color="yellow"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestRunnerSummary.tsx',
    tokenSuggestion: 'success',
    notes: 'L23-L24: passed uses green; failed is red when failures > 0.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestRunnerSummary.tsx',
    tokenSuggestion: 'error',
    notes: 'L24: failed count uses red when failures > 0.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestRunnerError.tsx',
    tokenSuggestion: 'error',
    notes: 'L18: run error message uses `Text color="red"`.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestList.tsx',
    tokenSuggestion: 'mutedText',
    notes: 'L33/L45/L54: empty/failure-reason/truncation text uses `Text color="gray"`.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestList.tsx',
    tokenSuggestion: 'success',
    notes: 'L20-L25: status color map uses green for pass.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestList.tsx',
    tokenSuggestion: 'error',
    notes: 'L20-L25: status color map uses red for fail.',
  },
  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/components/TestList.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L20-L25: status color map uses cyan for running.',
  },

  {
    file: 'apps/prompt-maker-cli/src/tui/screens/test-runner/TestRunnerScreen.tsx',
    tokenSuggestion: 'accentText',
    notes: 'L179: tests section header uses `Text color="cyan"`.',
  },
]
