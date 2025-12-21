import React from 'react'
import { act, renderHook } from '@testing-library/react'
import { JSDOM } from 'jsdom'

import { ContextProvider } from '../tui/context'
import { useContextDispatch, useContextState } from '../tui/context-store'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const globalScope = globalThis as typeof globalThis & {
  window: Window & typeof globalThis
  document: Document
  navigator: Navigator
}

globalScope.window = dom.window
globalScope.document = dom.window.document
globalScope.navigator = dom.window.navigator

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  React.createElement(ContextProvider, null, children)

describe('smart context root', () => {
  it('overwrites instead of accumulating roots', () => {
    const { result } = renderHook(
      () => ({ state: useContextState(), dispatch: useContextDispatch() }),
      { wrapper },
    )

    act(() => {
      result.current.dispatch.setSmartRoot('src')
    })

    expect(result.current.state.smartContextRoot).toBe('src')

    act(() => {
      result.current.dispatch.setSmartRoot('apps')
    })

    expect(result.current.state.smartContextRoot).toBe('apps')
  })

  it('clears the root when passed empty input', () => {
    const { result } = renderHook(
      () => ({ state: useContextState(), dispatch: useContextDispatch() }),
      { wrapper },
    )

    act(() => {
      result.current.dispatch.setSmartRoot('src')
    })

    expect(result.current.state.smartContextRoot).toBe('src')

    act(() => {
      result.current.dispatch.setSmartRoot('')
    })

    expect(result.current.state.smartContextRoot).toBeNull()
  })
})
