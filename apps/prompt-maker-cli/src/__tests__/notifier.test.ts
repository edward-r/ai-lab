import React from 'react'
import { act, renderHook } from '@testing-library/react'
import { JSDOM } from 'jsdom'

import { ToastProvider, useNotifier } from '../tui/notifier'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const globalEnv = globalThis as typeof globalThis & {
  window: Window & typeof globalThis
  document: Document
  navigator: Navigator
}

globalEnv.window = dom.window as typeof globalEnv.window
globalEnv.document = dom.window.document as Document
globalEnv.navigator = dom.window.navigator

const createWrapper = (options: Omit<React.ComponentProps<typeof ToastProvider>, 'children'>) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(ToastProvider, { ...options, children })

  return Wrapper
}

describe('toast provider notifier', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('auto-dismisses after timeout, then removes after exit animation', () => {
    const wrapper = createWrapper({ exitAnimationMs: 40 })
    const { result } = renderHook(() => useNotifier({ autoDismissMs: 50 }), { wrapper })

    act(() => {
      result.current.notify('Hello')
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0]?.message).toBe('Hello')
    expect(result.current.toasts[0]?.isExiting).toBe(false)

    act(() => {
      jest.advanceTimersByTime(50)
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0]?.isExiting).toBe(true)

    act(() => {
      jest.advanceTimersByTime(40)
    })

    expect(result.current.toasts).toHaveLength(0)
  })

  it('does not let an old timer dismiss a newer toast', () => {
    const wrapper = createWrapper({ exitAnimationMs: 10 })
    const { result } = renderHook(() => useNotifier({ autoDismissMs: 100 }), { wrapper })

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
      jest.advanceTimersByTime(49)
    })

    expect(result.current.toasts.map((toast) => toast.message)).toEqual(['First', 'Second'])
    expect(result.current.toasts[0]?.isExiting).toBe(true)
    expect(result.current.toasts[1]?.isExiting).toBe(false)

    act(() => {
      jest.advanceTimersByTime(1)
    })

    expect(result.current.toasts.map((toast) => toast.message)).toEqual(['Second'])

    act(() => {
      jest.advanceTimersByTime(50)
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0]?.message).toBe('Second')
    expect(result.current.toasts[0]?.isExiting).toBe(true)

    act(() => {
      jest.advanceTimersByTime(10)
    })

    expect(result.current.toasts).toHaveLength(0)
  })

  it('enforces max toast cap by exiting the oldest active toast', () => {
    const wrapper = createWrapper({ maxToasts: 2, exitAnimationMs: 20 })
    const { result } = renderHook(() => useNotifier({ autoDismissMs: 100_000 }), { wrapper })

    act(() => {
      result.current.notify('One')
      result.current.notify('Two')
      result.current.notify('Three')
    })

    expect(result.current.toasts.map((toast) => toast.message)).toEqual(['One', 'Two', 'Three'])
    expect(result.current.toasts[0]?.isExiting).toBe(true)
    expect(result.current.toasts[1]?.isExiting).toBe(false)
    expect(result.current.toasts[2]?.isExiting).toBe(false)

    act(() => {
      jest.advanceTimersByTime(20)
    })

    expect(result.current.toasts.map((toast) => toast.message)).toEqual(['Two', 'Three'])
  })

  it('dismiss-by-id only affects the intended toast', () => {
    const wrapper = createWrapper({ exitAnimationMs: 15 })
    const { result } = renderHook(() => useNotifier({ autoDismissMs: 100_000 }), { wrapper })

    let firstToastId: number | null = null
    act(() => {
      firstToastId = result.current.showToast('First')
      result.current.notify('Second')
    })

    if (firstToastId === null) {
      throw new Error('Expected first toast id')
    }

    const firstId = firstToastId

    act(() => {
      result.current.dismissToast(firstId)
    })

    expect(result.current.toasts.map((toast) => toast.message)).toEqual(['First', 'Second'])
    expect(result.current.toasts[0]?.isExiting).toBe(true)
    expect(result.current.toasts[1]?.isExiting).toBe(false)

    act(() => {
      jest.advanceTimersByTime(15)
    })

    expect(result.current.toasts.map((toast) => toast.message)).toEqual(['Second'])
  })
})
