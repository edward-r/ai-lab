import { ansiToHex, resolveColor, resolveTheme } from '../../tui/theme/theme-resolver'
import type { ResolveColorContext } from '../../tui/theme/theme-resolver'
import type {
  ThemeAppearanceMode,
  ThemeColorValue,
  ThemeJson,
  ThemeSlot,
} from '../../tui/theme/theme-types'

const makeTheme = (
  overrides: Partial<Record<ThemeSlot, ThemeColorValue>> = {},
  defs: Record<string, ThemeColorValue> = {},
): ThemeJson => {
  const base: Record<ThemeSlot, ThemeColorValue> = {
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
    popupBackground: '#111111',
    selectionBackground: '#333333',
    selectionText: '#ffffff',
    chipBackground: '#222222',
    chipText: '#ffffff',
    chipMutedText: '#aaaaaa',
  }

  return {
    defs,
    theme: {
      ...base,
      ...overrides,
    },
  }
}

describe('theme resolver', () => {
  test('hex pass-through', () => {
    const ctx: ResolveColorContext = { mode: 'dark', defs: {}, theme: {} }
    expect(resolveColor('#112233', ctx)).toBe('#112233')
  })

  test('variant selects by mode', () => {
    const ctxDark: ResolveColorContext = { mode: 'dark', defs: {}, theme: {} }
    const ctxLight: ResolveColorContext = { mode: 'light', defs: {}, theme: {} }

    expect(resolveColor({ dark: '#000000', light: '#ffffff' }, ctxDark)).toBe('#000000')
    expect(resolveColor({ dark: '#000000', light: '#ffffff' }, ctxLight)).toBe('#ffffff')
  })

  test('defs references resolve before theme slots', () => {
    const themeJson = makeTheme({ accent: 'accentDef' }, { accentDef: '#123456' })
    expect(resolveTheme(themeJson, 'dark').accent).toBe('#123456')
  })

  test('theme-slot references resolve recursively', () => {
    const themeJson = makeTheme({ text: 'background', background: '#101010' })
    expect(resolveTheme(themeJson, 'dark').text).toBe('#101010')
  })

  test('reference cycles throw with cycle path', () => {
    const themeJson = makeTheme({ background: 'text', text: 'background' })

    expect(() => resolveTheme(themeJson, 'dark')).toThrow(/Theme reference cycle detected:/)
    expect(() => resolveTheme(themeJson, 'dark')).toThrow(/theme\.background/)
    expect(() => resolveTheme(themeJson, 'dark')).toThrow(/theme\.text/)
  })

  test('missing required slots throw descriptive error', () => {
    const themeJson: ThemeJson = {
      theme: {
        background: '#000000',
      },
    }

    expect(() => resolveTheme(themeJson, 'dark')).toThrow(/missing required slots/i)
    expect(() => resolveTheme(themeJson, 'dark')).toThrow(/text/)
  })

  test('ANSI mapping converts 0..255 to hex', () => {
    expect(ansiToHex(0)).toBe('#000000')
    expect(ansiToHex(15)).toBe('#ffffff')
    expect(ansiToHex(196)).toBe('#ff0000')
    expect(ansiToHex(232)).toBe('#080808')
  })

  test('none/transparent normalize to undefined', () => {
    const ctx: ResolveColorContext = { mode: 'dark', defs: {}, theme: {} }
    expect(resolveColor('none', ctx)).toBeUndefined()
    expect(resolveColor('transparent', ctx)).toBeUndefined()
  })

  test('8-digit hex ignores alpha (00 => transparent)', () => {
    const ctx: ResolveColorContext = { mode: 'dark', defs: {}, theme: {} }
    expect(resolveColor('#11223300', ctx)).toBeUndefined()
    expect(resolveColor('#112233ff', ctx)).toBe('#112233')
  })

  test('mode type excludes system for resolution', () => {
    const mode: ThemeAppearanceMode = 'dark'
    const themeJson = makeTheme()
    expect(resolveTheme(themeJson, mode).background).toBe('#000000')
  })
})
