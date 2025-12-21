import { buildModelPopupOptions } from '../tui/model-popup-options'
import type { ModelOption } from '../tui/types'

const createOption = (id: string, provider: ModelOption['provider']): ModelOption => ({
  id,
  label: id,
  provider,
  description: id,
  capabilities: [],
  source: 'builtin',
})

describe('buildModelPopupOptions', () => {
  it('prepends recent models when query is empty', () => {
    const modelOptions: ModelOption[] = [
      createOption('gpt-4o-mini', 'openai'),
      createOption('gemini-1.5-pro', 'gemini'),
      createOption('other-model', 'other'),
    ]

    const result = buildModelPopupOptions({
      query: '',
      modelOptions,
      recentModelIds: ['gemini-1.5-pro', 'missing-model', 'gpt-4o-mini'],
    })

    expect(result.recentCount).toBe(2)
    expect(result.options.map((option) => option.id)).toEqual([
      'gemini-1.5-pro',
      'gpt-4o-mini',
      'other-model',
    ])
  })

  it('groups filtered options by provider while preserving intra-provider score order', () => {
    const modelOptions: ModelOption[] = [
      createOption('gpt-4o-mini', 'openai'),
      createOption('gpt-4o', 'openai'),
      createOption('gemini-1.5-pro', 'gemini'),
      createOption('gemini-1.5-flash', 'gemini'),
    ]

    const result = buildModelPopupOptions({ query: 'gpt mini', modelOptions })

    expect(result.recentCount).toBe(0)
    expect(result.options.map((option) => option.id)).toEqual(['gpt-4o-mini'])
  })
})
