import React from 'react'
import { act, renderHook } from '@testing-library/react'
import { JSDOM } from 'jsdom'

import type { ThemeDescriptor } from '../../tui/theme/theme-loader'
import { ThemeProvider, useTheme } from '../../tui/theme/theme-provider'
import { loadThemeSelection } from '../../tui/theme/theme-settings-service'

const pmDarkTheme: ThemeDescriptor = {
  name: 'pm-dark',
  label: 'Prompt Maker Dark',
  source: 'builtin',
  theme: {
    theme: {
      background: '#000000',
      text: '#ffffff',
      mutedText: '#888888',
      border: '#444444',
      accent: '#00ffff',
      accentText: '#000000',
      warning: '#ffff00',
      error: '#ff0000',
      success: '#00ff00',
      panelBackground: '#111111',
      popupBackground: 'panelBackground',
      selectionBackground: '#333333',
      selectionText: '#ffffff',
      chipBackground: '#222222',
      chipText: '#ffffff',
      chipMutedText: '#aaaaaa',
    },
  },
}

const pmLightTheme: ThemeDescriptor = {
  name: 'pm-light',
  label: 'Prompt Maker Light',
  source: 'builtin',
  theme: {
    theme: {
      background: '#ffffff',
      text: '#000000',
      mutedText: '#555555',
      border: '#dddddd',
      accent: '#0000ff',
      accentText: '#ffffff',
      warning: '#ff8800',
      error: '#ff0000',
      success: '#00aa00',
      panelBackground: '#f6f8fa',
      popupBackground: 'panelBackground',
      selectionBackground: '#ddddff',
      selectionText: '#000000',
      chipBackground: '#f6f8fa',
      chipText: '#000000',
      chipMutedText: '#555555',
    },
  },
}

jest.mock('../../tui/theme/theme-settings-service')

const dom = new JSDOM('<!doctype html><html><body></body></html>')

type GlobalDom = { window: Window; document: Document }

beforeAll(() => {
  const target = globalThis as unknown as GlobalDom
  target.window = dom.window as unknown as Window
  target.document = dom.window.document
})

afterAll(() => {
  const target = globalThis as unknown as Partial<GlobalDom>
  delete target.window
  delete target.document
})

describe('ThemeProvider', () => {
  beforeEach(() => {
    const mockedLoad = jest.mocked(loadThemeSelection)
    mockedLoad.mockResolvedValue({
      themes: [pmDarkTheme, pmLightTheme],
      loadErrors: [],
      selection: { themeName: 'pm-dark', themeMode: 'dark' },
      warnings: [],
    })
  })

  test('provides theme and re-resolves on setTheme', async () => {
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
      React.createElement(ThemeProvider, null, children)

    const { result } = renderHook(() => useTheme(), { wrapper })

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.activeThemeName).toBe('pm-dark')
    expect(result.current.theme.background).toBe('#000000')

    act(() => {
      result.current.setTheme('pm-light')
    })

    expect(result.current.activeThemeName).toBe('pm-light')
    expect(result.current.theme.background).toBe('#ffffff')
  })

  test('re-resolves on setMode', async () => {
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
      React.createElement(ThemeProvider, null, children)

    const { result } = renderHook(() => useTheme(), { wrapper })

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.mode).toBe('dark')

    act(() => {
      result.current.setMode('light')
    })

    expect(result.current.mode).toBe('light')
  })
})
