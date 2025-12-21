import { act, renderHook } from '@testing-library/react'
import { JSDOM } from 'jsdom'

import { useCommandHistory } from '../tui/hooks/useCommandHistory'
import type { HistoryEntry } from '../tui/types'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const globalEnv = globalThis as typeof globalThis & {
  window: Window & typeof globalThis
  document: Document
  navigator: Navigator
}

globalEnv.window = dom.window as typeof globalEnv.window
globalEnv.document = dom.window.document as Document
globalEnv.navigator = dom.window.navigator

describe('useCommandHistory', () => {
  it('resets history back to initial entries', () => {
    const initialEntries: HistoryEntry[] = [
      { id: 'seed-0', content: 'Welcome', kind: 'system' },
      { id: 'seed-1', content: 'Tip', kind: 'system' },
    ]

    const { result } = renderHook(() =>
      useCommandHistory({
        initialEntries,
        visibleRows: 10,
      }),
    )

    act(() => {
      result.current.pushHistory('User message', 'user')
    })

    expect(result.current.history).toHaveLength(3)

    act(() => {
      result.current.resetHistory()
    })

    expect(result.current.history).toEqual(initialEntries)
  })

  it('clears history to an empty buffer', () => {
    const initialEntries: HistoryEntry[] = [
      { id: 'seed-0', content: 'Welcome', kind: 'system' },
      { id: 'seed-1', content: 'Tip', kind: 'system' },
    ]

    const { result } = renderHook(() =>
      useCommandHistory({
        initialEntries,
        visibleRows: 10,
      }),
    )

    act(() => {
      result.current.pushHistory('User message', 'user')
    })

    act(() => {
      result.current.clearHistory()
    })

    expect(result.current.history).toEqual([])
  })
})
