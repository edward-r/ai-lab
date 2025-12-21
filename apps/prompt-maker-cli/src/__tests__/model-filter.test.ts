import { filterModelOptions, resolveModelPopupQuery } from '../tui/model-filter'
import type { ModelOption } from '../tui/types'

const createOption = (id: string, label: string): ModelOption => ({
  id,
  label,
  provider: 'openai',
  description: `${label} description`,
  capabilities: [],
  source: 'builtin',
})

describe('model-filter helpers', () => {
  it('resets to empty query when input is blank', () => {
    expect(resolveModelPopupQuery('', 'stale')).toBe('')
    expect(resolveModelPopupQuery('   ', 'stale')).toBe('')
  })

  it('keeps debounced query when input is non-empty', () => {
    expect(resolveModelPopupQuery('g', 'gpt')).toBe('gpt')
  })

  it('returns all models when query is blank', () => {
    const options = [createOption('gpt-4o-mini', 'GPT-4o Mini'), createOption('gpt-4o', 'GPT-4o')]
    expect(filterModelOptions('', options).map((option) => option.id)).toEqual([
      'gpt-4o-mini',
      'gpt-4o',
    ])
  })

  it('filters models by substring match', () => {
    const options = [
      createOption('gpt-4o-mini', 'GPT-4o Mini'),
      createOption('gemini-1.5-pro', 'Gemini 1.5 Pro'),
    ]
    expect(filterModelOptions('gem', options).map((option) => option.id)).toEqual([
      'gemini-1.5-pro',
    ])
  })

  it('caps results when a limit is provided', () => {
    const options = [
      createOption('model-a', 'Model A'),
      createOption('model-b', 'Model B'),
      createOption('model-c', 'Model C'),
    ]

    expect(filterModelOptions('model', options, 2).map((option) => option.id)).toEqual([
      'model-a',
      'model-b',
    ])
  })

  it('supports fuzzy subsequence matching', () => {
    const options = [
      createOption('gpt-4o-mini', 'GPT-4o Mini'),
      createOption('gemini-1.5-pro', 'Gemini 1.5 Pro'),
    ]

    expect(filterModelOptions('gmp', options).map((option) => option.id)).toEqual([
      'gemini-1.5-pro',
    ])
  })

  it('supports multi-token matching', () => {
    const options = [
      createOption('gpt-4o-mini', 'GPT-4o Mini'),
      createOption('gemini-1.5-pro', 'Gemini 1.5 Pro'),
    ]

    expect(filterModelOptions('gem pro', options).map((option) => option.id)).toEqual([
      'gemini-1.5-pro',
    ])
  })
})
