import { act, renderHook } from '@testing-library/react'
import { JSDOM } from 'jsdom'
import type { MutableRefObject } from 'react'

import { usePopupManager } from '../tui/hooks/usePopupManager'
import type { UsePopupManagerOptions } from '../tui/hooks/usePopupManager'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const globalScope = globalThis as typeof globalThis & {
  window: Window & typeof globalThis
  document: Document
  navigator: Navigator
}

globalScope.window = dom.window
globalScope.document = dom.window.document
globalScope.navigator = dom.window.navigator

const createOptions = (overrides: Partial<UsePopupManagerOptions> = {}): UsePopupManagerOptions => {
  const baseRef: MutableRefObject<string | null> = { current: null }

  const defaults: UsePopupManagerOptions = {
    currentModel: 'gpt-4o-mini',
    smartContextRoot: null,
    lastTestFile: null,
    defaultTestFile: 'prompt.test.ts',
    interactiveTransportPath: undefined,
    isGenerating: false,
    lastUserIntentRef: baseRef,
    pushHistory: jest.fn(),
    setInputValue: jest.fn(),
    runSeriesGeneration: jest.fn(),
    runTestsFromCommand: jest.fn(),
    exitApp: jest.fn(),
    setCurrentModel: jest.fn(),
    setPolishEnabled: jest.fn(),
    setCopyEnabled: jest.fn(),
    setChatGptEnabled: jest.fn(),
    setJsonOutputEnabled: jest.fn(),
    setIntentFilePath: jest.fn(),
    intentFilePath: '',
    polishEnabled: false,
    copyEnabled: false,
    chatGptEnabled: false,
    jsonOutputEnabled: false,
    getLatestTypedIntent: jest.fn(() => null),
    syncTypedIntentRef: jest.fn(),
  }

  return { ...defaults, ...overrides }
}

describe('usePopupManager quick toggles', () => {
  it('toggles polish without arguments', () => {
    const options = createOptions({ polishEnabled: false })
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('polish')
    })

    expect(options.setPolishEnabled).toHaveBeenCalledWith(true)
    expect(options.pushHistory).toHaveBeenCalledWith('Polish enabled')
    expect(options.setInputValue).toHaveBeenCalledWith('')
  })

  it('accepts explicit on/off arguments for copy', () => {
    const options = createOptions({ copyEnabled: true })
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('copy', 'off')
    })

    expect(options.setCopyEnabled).toHaveBeenCalledWith(false)
    expect(options.pushHistory).toHaveBeenCalledWith('Copy disabled')
  })

  it('opens the toggle popup when chatgpt args are invalid', () => {
    const options = createOptions({ chatGptEnabled: false })
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('chatgpt', 'maybe')
    })

    expect(result.current.popupState).toEqual({
      type: 'toggle',
      field: 'chatgpt',
      selectionIndex: 1,
    })
  })

  it('toggles json output with no args when allowed', () => {
    const options = createOptions({ jsonOutputEnabled: false })
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('json')
    })

    expect(options.setJsonOutputEnabled).toHaveBeenCalledWith(true)
    expect(options.pushHistory).toHaveBeenCalledWith('JSON enabled')
  })

  it('blocks json toggling when interactive transport is active', () => {
    const options = createOptions({ interactiveTransportPath: '/tmp/socket' })
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('json')
    })

    expect(options.setJsonOutputEnabled).not.toHaveBeenCalled()
    expect(options.pushHistory).toHaveBeenCalledWith(
      'JSON output is unavailable while interactive transport is enabled.',
      'system',
    )
    expect(options.setInputValue).toHaveBeenCalledWith('')
  })

  it('accepts explicit json arguments', () => {
    const options = createOptions({ jsonOutputEnabled: true })
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('json', 'off')
    })

    expect(options.setJsonOutputEnabled).toHaveBeenCalledWith(false)
    expect(options.pushHistory).toHaveBeenCalledWith('JSON disabled')
  })
})
