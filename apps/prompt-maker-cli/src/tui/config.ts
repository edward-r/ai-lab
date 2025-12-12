export const COMMAND_DESCRIPTORS = [
  { id: 'model', label: 'Model', description: 'Switch the target LLM' },
  { id: 'intent', label: 'Intent File', description: 'Use a file for the intent text' },
  {
    id: 'instructions',
    label: 'Meta Instructions',
    description: 'Add optional meta guidance (/meta)',
    aliases: ['meta'] as const,
  },
  { id: 'file', label: 'File', description: 'Attach file context' },
  { id: 'url', label: 'URL', description: 'Add URL context' },
  { id: 'smart', label: 'Smart Context', description: 'Toggle smart context root' },
  { id: 'image', label: 'Image', description: 'Attach reference images' },
  { id: 'video', label: 'Video', description: 'Attach reference videos' },
  { id: 'polish', label: 'Polish', description: 'Enable prompt polishing' },
  {
    id: 'series',
    label: 'Series',
    description: 'Atomic prompt series (Tab) · prefilled from typed/last intent or intent file',
  },
  { id: 'copy', label: 'Copy', description: 'Auto-copy final prompt' },
  { id: 'chatgpt', label: 'ChatGPT', description: 'Open ChatGPT automatically' },
  { id: 'json', label: 'JSON', description: 'Toggle JSON payload in history (/json on|off)' },
  { id: 'test', label: 'Test', description: 'Run prompt tests (/test prompt-tests.yaml)' },
  { id: 'exit', label: 'Exit', description: 'Quit the command palette' },
] as const

export const TOGGLE_LABELS = {
  polish: 'Polish',
  copy: 'Copy',
  chatgpt: 'ChatGPT',
  json: 'JSON',
} as const

export const POPUP_HEIGHTS = {
  model: 12,
  toggle: 6,
  file: 16,
  url: 12,
  smart: 9,
  test: 7,
  intent: 7,
  instructions: 7,
  series: 8,
} as const
