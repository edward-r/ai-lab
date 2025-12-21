import { formatProviderStatusChip } from '../tui/provider-chip'

import type { ProviderStatusMap } from '../tui/types'

describe('formatProviderStatusChip', () => {
  it('formats the selected provider chip for OpenAI models', () => {
    const statuses: ProviderStatusMap = {
      openai: { provider: 'openai', status: 'ok', message: 'ready' },
      gemini: { provider: 'gemini', status: 'ok', message: 'ready' },
      other: { provider: 'other', status: 'ok', message: 'ready' },
    }

    expect(formatProviderStatusChip('gpt-4o-mini', statuses)).toBe('[openai:ok]')
  })

  it('formats missing credentials as missing-key', () => {
    const statuses: ProviderStatusMap = {
      openai: { provider: 'openai', status: 'ok', message: 'ready' },
      gemini: { provider: 'gemini', status: 'missing', message: 'missing' },
      other: { provider: 'other', status: 'ok', message: 'ready' },
    }

    expect(formatProviderStatusChip('gemini-1.5-pro', statuses)).toBe('[gemini:missing-key]')
  })

  it('formats errors as error', () => {
    const statuses: ProviderStatusMap = {
      openai: { provider: 'openai', status: 'error', message: 'boom' },
      gemini: { provider: 'gemini', status: 'ok', message: 'ready' },
      other: { provider: 'other', status: 'ok', message: 'ready' },
    }

    expect(formatProviderStatusChip('gpt-4o-mini', statuses)).toBe('[openai:error]')
  })

  it('formats unknown providers as other', () => {
    const statuses: ProviderStatusMap = {
      openai: { provider: 'openai', status: 'ok', message: 'ready' },
      gemini: { provider: 'gemini', status: 'ok', message: 'ready' },
      other: { provider: 'other', status: 'ok', message: 'Custom provider (not validated)' },
    }

    expect(formatProviderStatusChip('my-local-model', statuses)).toBe('[other:ok]')
  })
})
