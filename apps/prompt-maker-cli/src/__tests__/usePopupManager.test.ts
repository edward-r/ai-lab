import { act, renderHook } from '@testing-library/react'
import { JSDOM } from 'jsdom'
import type { MutableRefObject } from 'react'

import { usePopupManager } from '../tui/hooks/usePopupManager'
import type { UsePopupManagerOptions } from '../tui/hooks/usePopupManager'
import type { ModelOption } from '../tui/types'

jest.mock('../tui/file-suggestions', () => ({
  discoverFileSuggestions: jest.fn(),
}))

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}))

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const globalScope = globalThis as typeof globalThis & {
  window: Window & typeof globalThis
  document: Document
  navigator: Navigator
}

globalScope.window = dom.window
globalScope.document = dom.window.document
globalScope.navigator = dom.window.navigator

const defaultModelOptions: ModelOption[] = [
  {
    id: 'gpt-4o-mini',
    label: 'gpt-4o-mini',
    provider: 'openai',
    description: 'test',
    capabilities: [],
    source: 'builtin',
  },
]

const createOptions = (overrides: Partial<UsePopupManagerOptions> = {}): UsePopupManagerOptions => {
  const baseRef: MutableRefObject<string | null> = { current: null }

  const defaults: UsePopupManagerOptions = {
    currentModel: 'gpt-4o-mini',
    modelOptions: defaultModelOptions,
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
    metaInstructions: '',
    setMetaInstructions: jest.fn(),
    polishEnabled: false,
    copyEnabled: false,
    chatGptEnabled: false,
    jsonOutputEnabled: false,
    getLatestTypedIntent: jest.fn(() => null),
    syncTypedIntentRef: jest.fn(),
  }

  return { ...defaults, ...overrides }
}

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

const createDeferred = <T>(): Deferred<T> => {
  let resolve: (value: T) => void = (_value) => undefined
  let reject: (reason?: unknown) => void = (_reason) => undefined

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return { promise, resolve, reject }
}

const fileSuggestions = jest.requireMock('../tui/file-suggestions') as {
  discoverFileSuggestions: jest.Mock
}

const getFsMock = () =>
  jest.requireMock('node:fs/promises') as {
    readFile: jest.MockedFunction<(file: string, encoding: string) => Promise<string>>
  }

describe('usePopupManager file popup', () => {
  beforeEach(() => {
    fileSuggestions.discoverFileSuggestions.mockReset()
  })

  it('initializes file popup with suggestion defaults', () => {
    const deferred = createDeferred<string[]>()
    fileSuggestions.discoverFileSuggestions.mockReturnValue(deferred.promise)

    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.openFilePopup()
    })

    expect(result.current.popupState).toEqual({
      type: 'file',
      draft: '',
      selectionIndex: 0,
      suggestedItems: [],
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    })
  })

  it('populates file popup suggestions after scanning', async () => {
    const deferred = createDeferred<string[]>()
    fileSuggestions.discoverFileSuggestions.mockReturnValue(deferred.promise)

    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.openFilePopup()
    })

    await act(async () => {
      deferred.resolve(['src/index.ts', 'README.md'])
      await deferred.promise
    })

    expect(result.current.popupState).toEqual({
      type: 'file',
      draft: '',
      selectionIndex: 0,
      suggestedItems: ['src/index.ts', 'README.md'],
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    })
  })

  it('logs a history entry when scanning fails', async () => {
    const deferred = createDeferred<string[]>()
    fileSuggestions.discoverFileSuggestions.mockReturnValue(deferred.promise)

    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.openFilePopup()
    })

    await act(async () => {
      deferred.reject(new Error('boom'))
      try {
        await deferred.promise
      } catch {
        // ignored
      }
    })

    expect(options.pushHistory).toHaveBeenCalledWith(
      '[file] Failed to scan workspace: boom',
      'system',
    )
  })
})

describe('usePopupManager instructions command', () => {
  it('opens and saves meta instructions', () => {
    const options = createOptions({ metaInstructions: 'Be friendly' })
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('instructions')
    })

    expect(result.current.popupState).toEqual({ type: 'instructions', draft: 'Be friendly' })

    act(() => {
      result.current.actions.handleInstructionsSubmit('Focus on security')
    })

    expect(options.setMetaInstructions).toHaveBeenCalledWith('Focus on security')
    expect(options.pushHistory).toHaveBeenCalledWith('[instr] Focus on security')
    expect(options.setInputValue).toHaveBeenCalledWith('')
    expect(result.current.popupState).toBeNull()
  })
})

describe('usePopupManager tokens command', () => {
  it('opens the token usage popup', () => {
    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('tokens')
    })

    expect(options.setInputValue).toHaveBeenCalledWith('')
    expect(result.current.popupState).toEqual({ type: 'tokens' })
  })
})

describe('usePopupManager series command', () => {
  beforeEach(() => {
    const fs = getFsMock()
    fs.readFile.mockReset()
  })

  it('prefills the series popup from command args', async () => {
    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    await act(async () => {
      result.current.actions.handleCommandSelection('series', 'plan a feature')
      await Promise.resolve()
    })

    expect(options.pushHistory).toHaveBeenCalledWith(
      '[series] Using provided text as intent draft.',
      'system',
    )
    expect(options.setInputValue).toHaveBeenCalledWith('')
    expect(result.current.popupState).toEqual({
      type: 'series',
      draft: 'plan a feature',
      hint: 'Draft prefills from typed/last intent (or pass /series <intent>).',
    })
  })

  it('prefills the series popup from typed intent', async () => {
    const options = createOptions({ getLatestTypedIntent: jest.fn(() => 'typed intent') })
    const { result } = renderHook(() => usePopupManager(options))

    await act(async () => {
      result.current.actions.handleCommandSelection('series')
      await Promise.resolve()
    })

    expect(options.pushHistory).toHaveBeenCalledWith(
      '[series] Using typed intent as draft.',
      'system',
    )
    expect(result.current.popupState).toEqual({
      type: 'series',
      draft: 'typed intent',
      hint: 'Draft prefills from typed/last intent (or pass /series <intent>).',
    })
  })

  it('prefills the series popup from the last run intent', async () => {
    const lastUserIntentRef: MutableRefObject<string | null> = { current: 'last intent' }
    const options = createOptions({ lastUserIntentRef })
    const { result } = renderHook(() => usePopupManager(options))

    await act(async () => {
      result.current.actions.handleCommandSelection('series')
      await Promise.resolve()
    })

    expect(options.pushHistory).toHaveBeenCalledWith(
      '[series] Reusing last intent as draft.',
      'system',
    )
    expect(result.current.popupState).toEqual({
      type: 'series',
      draft: 'last intent',
      hint: 'Draft prefills from typed/last intent (or pass /series <intent>).',
    })
  })

  it('loads the series popup draft from an intent file when empty', async () => {
    const fs = getFsMock()
    fs.readFile.mockResolvedValueOnce('intent from file')

    const options = createOptions({ intentFilePath: '/tmp/intent.md' })
    const { result } = renderHook(() => usePopupManager(options))

    await act(async () => {
      result.current.actions.handleCommandSelection('series')
      await Promise.resolve()
    })

    expect(fs.readFile).toHaveBeenCalledWith('/tmp/intent.md', 'utf8')
    expect(options.pushHistory).toHaveBeenCalledWith(
      '[series] Loaded draft from intent file intent.md.',
      'system',
    )
    expect(options.syncTypedIntentRef).toHaveBeenCalledWith('intent from file')
    expect(result.current.popupState).toEqual({
      type: 'series',
      draft: 'intent from file',
      hint: 'Loaded from intent file intent.md',
    })
  })
})

describe('usePopupManager test command', () => {
  it('logs a hint when running /test with args', () => {
    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('test', 'prompt-tests.yaml')
    })

    expect(options.pushHistory).toHaveBeenCalledWith(
      '[tests] Running /test prompt-tests.yaml',
      'system',
    )
    expect(options.runTestsFromCommand).toHaveBeenCalledWith('prompt-tests.yaml')
  })
})

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
    expect(options.pushHistory).toHaveBeenCalledWith('JSON enabled (payload shown in history)')
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
