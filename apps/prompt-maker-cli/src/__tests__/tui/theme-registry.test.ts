import { DEFAULT_THEME_NAME, getTheme, listThemes } from '../../tui/theme/theme-registry'

describe('theme registry', () => {
  test('returns built-in themes deterministically', () => {
    const first = listThemes().map((theme) => theme.name)
    const second = listThemes().map((theme) => theme.name)

    expect(first).toEqual(second)
    expect(first).toEqual(['pm-dark', 'pm-light'])
  })

  test('default theme exists in registry', () => {
    const names = listThemes().map((theme) => theme.name)
    expect(names).toContain(DEFAULT_THEME_NAME)
    expect(getTheme(DEFAULT_THEME_NAME)).toBeDefined()
  })
})
