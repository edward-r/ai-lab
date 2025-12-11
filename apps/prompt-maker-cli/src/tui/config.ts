export const COMMAND_DESCRIPTORS = [
  { id: 'model', label: 'Model', description: 'Switch the target LLM' },
  { id: 'intent', label: 'Intent File', description: 'Use a file for the intent text' },
  { id: 'file', label: 'File', description: 'Attach file context' },
  { id: 'url', label: 'URL', description: 'Add URL context' },
  { id: 'smart', label: 'Smart Context', description: 'Toggle smart context root' },
  { id: 'image', label: 'Image', description: 'Attach reference images' },
  { id: 'video', label: 'Video', description: 'Attach reference videos' },
  { id: 'polish', label: 'Polish', description: 'Enable prompt polishing' },
  {
    id: 'series',
    label: 'Series',
    description: 'Generate atomic prompt series (Tab)',
  },
  { id: 'copy', label: 'Copy', description: 'Auto-copy final prompt' },
  { id: 'chatgpt', label: 'ChatGPT', description: 'Open ChatGPT automatically' },
  { id: 'json', label: 'JSON', description: 'Emit JSON payload to stdout' },
  { id: 'test', label: 'Test', description: 'Run prompt tests (/test <file>)' },
  { id: 'exit', label: 'Exit', description: 'Quit the command palette' },
] as const

export const MODEL_OPTIONS = [
  { id: 'gpt-4o-mini', label: 'gpt-4o-mini', description: 'OpenAI general-purpose LLM' },
  { id: 'gemini-1.5-pro', label: 'gemini-1.5-pro', description: 'Google Gemini multimodal' },
] as const

export const TOGGLE_LABELS = {
  polish: 'Polish',
  copy: 'Copy',
  chatgpt: 'ChatGPT',
  json: 'JSON',
} as const

export const POPUP_HEIGHTS = {
  model: MODEL_OPTIONS.length + 5,
  toggle: 6,
  file: 12,
  url: 12,
  smart: 9,
  test: 7,
  intent: 7,
  series: 8,
} as const
