import { act, renderHook } from '@testing-library/react'
import { JSDOM } from 'jsdom'
import type { MutableRefObject } from 'react'

import { resetRecentSessionModelsForTests } from '../tui/model-session'
import { usePopupManager } from '../tui/hooks/usePopupManager'
import type { UsePopupManagerOptions } from '../tui/hooks/usePopupManager'
import type { ModelOption } from '../tui/types'

jest.mock('../tui/file-suggestions', () => ({
  discoverDirectorySuggestions: jest.fn(),
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

beforeEach(() => {
  resetRecentSessionModelsForTests()
})

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
    currentTargetModel: 'gpt-4o-mini',
    modelOptions: defaultModelOptions,
    activeThemeName: 'pm-dark',
    themeMode: 'dark',
    themes: [
      { name: 'pm-dark', label: 'Prompt Maker Dark' },
      { name: 'pm-light', label: 'Prompt Maker Light' },
    ],
    smartContextEnabled: false,
    smartContextRoot: null,
    toggleSmartContext: jest.fn(),
    setSmartRoot: jest.fn(),
    images: [],
    videos: [],
    addImage: jest.fn(),
    addVideo: jest.fn(),
    lastTestFile: null,
    defaultTestFile: 'prompt.test.ts',
    interactiveTransportPath: undefined,
    isGenerating: false,
    lastUserIntentRef: baseRef,
    pushHistory: jest.fn(),
    notify: jest.fn(),
    setInputValue: jest.fn(),
    runSeriesGeneration: jest.fn(),
    runTestsFromCommand: jest.fn(),
    exitApp: jest.fn(),
    setCurrentModel: jest.fn(),
    setCurrentTargetModel: jest.fn(),
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
  discoverDirectorySuggestions: jest.Mock
  discoverFileSuggestions: jest.Mock
}

const getFsMock = () =>
  jest.requireMock('node:fs/promises') as {
    readFile: jest.MockedFunction<(file: string, encoding: string) => Promise<string>>
  }

describe('usePopupManager theme popup', () => {
  it('opens theme popup with current selection', () => {
    const options = createOptions({
      activeThemeName: 'pm-light',
      themes: [
        { name: 'pm-dark', label: 'Prompt Maker Dark' },
        { name: 'pm-light', label: 'Prompt Maker Light' },
      ],
    })

    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.openThemePopup()
    })

    expect(result.current.popupState).toEqual({
      type: 'theme',
      selectionIndex: 1,
      initialThemeName: 'pm-light',
    })
  })
})

describe('usePopupManager theme mode popup', () => {
  it('opens theme mode popup with current mode', () => {
    const options = createOptions({
      themeMode: 'system',
    })

    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.openThemeModePopup()
    })

    expect(result.current.popupState).toEqual({
      type: 'themeMode',
      selectionIndex: 0,
      initialMode: 'system',
    })
  })
})

describe('usePopupManager file popup', () => {
  beforeEach(() => {
    resetRecentSessionModelsForTests()
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

describe('usePopupManager image popup', () => {
  beforeEach(() => {
    fileSuggestions.discoverFileSuggestions.mockReset()
  })

  it('initializes image popup with suggestion defaults', () => {
    const deferred = createDeferred<string[]>()
    fileSuggestions.discoverFileSuggestions.mockReturnValue(deferred.promise)

    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.openImagePopup()
    })

    expect(result.current.popupState).toEqual({
      type: 'image',
      draft: '',
      selectionIndex: 0,
      suggestedItems: [],
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    })
  })

  it('filters image popup suggestions after scanning', async () => {
    const deferred = createDeferred<string[]>()
    fileSuggestions.discoverFileSuggestions.mockReturnValue(deferred.promise)

    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.openImagePopup()
    })

    await act(async () => {
      deferred.resolve(['src/index.ts', 'diagram.png', 'clip.mp4', 'photo.JPG'])
      await deferred.promise
    })

    expect(result.current.popupState).toEqual({
      type: 'image',
      draft: '',
      selectionIndex: 0,
      suggestedItems: ['diagram.png', 'photo.JPG'],
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    })
  })

  it('attaches an image via command args', () => {
    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('image', 'diagram.png')
    })

    expect(options.addImage).toHaveBeenCalledWith('diagram.png')
    expect(options.pushHistory).toHaveBeenCalledWith('[image] Attached: diagram.png', 'system')
    expect(options.setInputValue).toHaveBeenCalledWith('')
    expect(result.current.popupState).toBeNull()
  })
})

describe('usePopupManager video popup', () => {
  beforeEach(() => {
    fileSuggestions.discoverFileSuggestions.mockReset()
  })

  it('filters video popup suggestions after scanning', async () => {
    const deferred = createDeferred<string[]>()
    fileSuggestions.discoverFileSuggestions.mockReturnValue(deferred.promise)

    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.openVideoPopup()
    })

    await act(async () => {
      deferred.resolve(['clip.mp4', 'diagram.png', 'movie.MOV', 'README.md'])
      await deferred.promise
    })

    expect(result.current.popupState).toEqual({
      type: 'video',
      draft: '',
      selectionIndex: 0,
      suggestedItems: ['clip.mp4', 'movie.MOV'],
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    })
  })

  it('attaches a video via command args', () => {
    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('video', 'clip.mp4')
    })

    expect(options.addVideo).toHaveBeenCalledWith('clip.mp4')
    expect(options.pushHistory).toHaveBeenCalledWith('[video] Attached: clip.mp4', 'system')
    expect(options.setInputValue).toHaveBeenCalledWith('')
    expect(result.current.popupState).toBeNull()
  })
})

describe('usePopupManager smart-root popup', () => {
  beforeEach(() => {
    fileSuggestions.discoverDirectorySuggestions.mockReset()
  })

  it('initializes smart-root popup with suggestion defaults', () => {
    const deferred = createDeferred<string[]>()
    fileSuggestions.discoverDirectorySuggestions.mockReturnValue(deferred.promise)

    const options = createOptions({ smartContextRoot: 'src' })
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.openSmartRootPopup()
    })

    expect(result.current.popupState).toEqual({
      type: 'smart',
      draft: 'src',
      suggestedItems: [],
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    })
  })

  it('opens smart-root popup from command selection', () => {
    const deferred = createDeferred<string[]>()
    fileSuggestions.discoverDirectorySuggestions.mockReturnValue(deferred.promise)

    const options = createOptions({ smartContextRoot: 'src' })
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('smart-root')
    })

    expect(result.current.popupState).toEqual({
      type: 'smart',
      draft: 'src',
      suggestedItems: [],
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    })
  })

  it('auto-enables smart context when setting a root via args', () => {
    const toggleSmartContext = jest.fn()
    const setSmartRoot = jest.fn()

    const options = createOptions({
      smartContextEnabled: false,
      toggleSmartContext,
      setSmartRoot,
    })
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('smart-root', 'src')
    })

    expect(setSmartRoot).toHaveBeenCalledWith('src')
    expect(toggleSmartContext).toHaveBeenCalledTimes(1)
    expect(options.setInputValue).toHaveBeenCalledWith('')
    expect(result.current.popupState).toBeNull()
  })

  it('clears the root when running /smart off', () => {
    const toggleSmartContext = jest.fn()
    const setSmartRoot = jest.fn()

    const options = createOptions({
      smartContextEnabled: true,
      smartContextRoot: 'src',
      toggleSmartContext,
      setSmartRoot,
    })
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('smart', 'off')
    })

    expect(setSmartRoot).toHaveBeenCalledWith('')
    expect(toggleSmartContext).toHaveBeenCalledTimes(1)
    expect(options.setInputValue).toHaveBeenCalledWith('')
    expect(result.current.popupState).toBeNull()
  })

  it('populates smart-root popup suggestions after scanning', async () => {
    const deferred = createDeferred<string[]>()
    fileSuggestions.discoverDirectorySuggestions.mockReturnValue(deferred.promise)

    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.openSmartRootPopup()
    })

    await act(async () => {
      deferred.resolve(['src', 'apps/prompt-maker-cli'])
      await deferred.promise
    })

    expect(result.current.popupState).toEqual({
      type: 'smart',
      draft: '',
      suggestedItems: ['src', 'apps/prompt-maker-cli'],
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    })
  })

  it('logs a history entry when scanning fails for smart-root', async () => {
    const deferred = createDeferred<string[]>()
    fileSuggestions.discoverDirectorySuggestions.mockReturnValue(deferred.promise)

    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.openSmartRootPopup()
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
      '[smart] Failed to scan workspace: boom',
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

  it('applies meta instructions from command args', () => {
    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('instructions', 'Focus on security')
    })

    expect(options.setMetaInstructions).toHaveBeenCalledWith('Focus on security')
    expect(options.pushHistory).toHaveBeenCalledWith('[instr] Focus on security')
    expect(options.setInputValue).toHaveBeenCalledWith('')
    expect(result.current.popupState).toBeNull()
  })
})

describe('usePopupManager intent command', () => {
  it('applies intent file from command args', () => {
    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('intent', '/tmp/intent.md')
    })

    expect(options.setIntentFilePath).toHaveBeenCalledWith('/tmp/intent.md')
    expect(options.pushHistory).toHaveBeenCalledWith('Intent file set to /tmp/intent.md')
    expect(options.setInputValue).toHaveBeenCalledWith('')
    expect(result.current.popupState).toBeNull()
  })
})

describe('usePopupManager exit command', () => {
  it('clears the screen before exiting', () => {
    const clearScreen = jest.fn()
    const exitApp = jest.fn()
    const options = createOptions({ clearScreen, exitApp })
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('exit')
    })

    expect(options.pushHistory).toHaveBeenCalledWith('Exiting…', 'system')
    expect(options.setInputValue).toHaveBeenCalledWith('')
    expect(clearScreen).toHaveBeenCalledTimes(1)
    expect(exitApp).toHaveBeenCalledTimes(1)

    const clearOrder = clearScreen.mock.invocationCallOrder[0]
    const exitOrder = exitApp.mock.invocationCallOrder[0]

    if (clearOrder === undefined || exitOrder === undefined) {
      throw new Error('Expected clearScreen and exitApp to be called')
    }

    expect(clearOrder).toBeLessThan(exitOrder)
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

describe('usePopupManager reasoning command', () => {
  it('opens the reasoning popup', () => {
    const options = createOptions()
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.handleCommandSelection('reasoning')
    })

    expect(options.setInputValue).toHaveBeenCalledWith('')
    expect(result.current.popupState).toEqual({ type: 'reasoning', scrollOffset: 0 })
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
    expect(options.notify).toHaveBeenCalledWith('JSON output is ON (payload shown in history)', {
      kind: 'info',
    })
    expect(options.pushHistory).not.toHaveBeenCalled()
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
    expect(options.notify).toHaveBeenCalledWith('JSON output is OFF (payload hidden)', {
      kind: 'warning',
    })
    expect(options.pushHistory).not.toHaveBeenCalled()
  })
})

describe('usePopupManager model popup', () => {
  it('notifies on model selection without history', () => {
    const modelOptions: ModelOption[] = [
      {
        id: 'gpt-4o-mini',
        label: 'GPT-4o Mini',
        provider: 'openai',
        description: 'test',
        capabilities: [],
        source: 'builtin',
      },
      {
        id: 'gemini-1.5-pro',
        label: 'Gemini 1.5 Pro',
        provider: 'gemini',
        description: 'test',
        capabilities: [],
        source: 'builtin',
      },
    ]

    const options = createOptions({ currentModel: 'gpt-4o-mini', modelOptions })
    const { result } = renderHook(() => usePopupManager(options))

    act(() => {
      result.current.actions.openModelPopup()
    })

    act(() => {
      result.current.actions.handleModelPopupSubmit(modelOptions[1])
    })

    expect(options.setCurrentModel).toHaveBeenCalledWith('gemini-1.5-pro')
    expect(options.notify).toHaveBeenCalledWith('Selected model: Gemini 1.5 Pro (gemini-1.5-pro)', {
      kind: 'info',
    })
    expect(options.pushHistory).not.toHaveBeenCalled()
    expect(options.setInputValue).toHaveBeenCalledWith('')
    expect(result.current.popupState).toBeNull()
  })
})
