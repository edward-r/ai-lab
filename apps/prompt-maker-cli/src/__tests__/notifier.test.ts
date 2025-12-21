import { act, renderHook } from '@testing-library/react'
import { JSDOM } from 'jsdom'

import { notifierReducer, useNotifier } from '../tui/notifier'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const globalEnv = globalThis as typeof globalThis & {
  window: Window & typeof globalThis
  document: Document
  navigator: Navigator
}

globalEnv.window = dom.window as typeof globalEnv.window
globalEnv.document = dom.window.document as Document
globalEnv.navigator = dom.window.navigator

describe('notifierReducer', () => {
  it('replaces the toast on show', () => {
    const first = notifierReducer(
      { toast: null },
      { type: 'toast.show', toast: { id: 1, message: 'one', kind: 'info' } },
    )
    const second = notifierReducer(first, {
      type: 'toast.show',
      toast: { id: 2, message: 'two', kind: 'progress' },
    })

    expect(first.toast?.message).toBe('one')
    expect(second.toast?.message).toBe('two')
  })

  it('dismisses only if id matches', () => {
    const state: Parameters<typeof notifierReducer>[0] = {
      toast: { id: 2, message: 'two', kind: 'info' },
    }

    expect(notifierReducer(state, { type: 'toast.dismiss', id: 1 })).toEqual(state)
    expect(notifierReducer(state, { type: 'toast.dismiss', id: 2 })).toEqual({ toast: null })
  })
})

describe('useNotifier', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('auto-dismisses after timeout', () => {
    const { result } = renderHook(() => useNotifier({ autoDismissMs: 50 }))

    act(() => {
      result.current.notify('Hello')
    })

    expect(result.current.toast?.message).toBe('Hello')

    act(() => {
      jest.advanceTimersByTime(60)
    })

    expect(result.current.toast).toBeNull()
  })

  it('does not let an old timer dismiss a newer toast', () => {
    const { result } = renderHook(() => useNotifier({ autoDismissMs: 100 }))

    act(() => {
      result.current.notify('First')
    })

    act(() => {
      jest.advanceTimersByTime(60)
    })

    act(() => {
      result.current.notify('Second')
    })

    act(() => {
      jest.advanceTimersByTime(50)
    })

    expect(result.current.toast?.message).toBe('Second')

    act(() => {
      jest.advanceTimersByTime(60)
    })

    expect(result.current.toast).toBeNull()
  })
})
