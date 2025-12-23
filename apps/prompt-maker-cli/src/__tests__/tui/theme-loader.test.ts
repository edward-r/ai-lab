import path from 'node:path'

import { loadThemes } from '../../tui/theme/theme-loader'

const FIXTURES_ROOT = path.join(__dirname, '..', '__fixtures__', 'themes')
const GLOBAL_DIR = path.join(FIXTURES_ROOT, 'global')
const PROJECT_ROOT = path.join(FIXTURES_ROOT, 'project')
const PROJECT_CWD = path.join(PROJECT_ROOT, 'a')

describe('theme loader', () => {
  test('merges built-in + global + project with correct precedence', async () => {
    const { themes, errors } = await loadThemes({
      cwd: PROJECT_CWD,
      stopAt: PROJECT_ROOT,
      globalThemesDir: GLOBAL_DIR,
    })

    expect(errors).not.toHaveLength(0)

    const names = themes.map((theme) => theme.name)
    expect(names).toEqual(['pm-dark', 'pm-light', 'forest', 'ocean'])

    const pmDark = themes.find((theme) => theme.name === 'pm-dark')
    expect(pmDark?.source).toBe('project')
    expect(pmDark?.filePath).toContain(
      path.join('a', '.prompt-maker-cli', 'themes', 'pm-dark.json'),
    )

    const ocean = themes.find((theme) => theme.name === 'ocean')
    expect(ocean?.source).toBe('global')

    // Project-local `pm-dark` fixture uses ANSI numbers.
    expect(pmDark?.theme.theme.border).toBe(240)
  })

  test('invalid themes surface errors but do not prevent other themes from loading', async () => {
    const { themes, errors } = await loadThemes({
      cwd: PROJECT_CWD,
      stopAt: PROJECT_ROOT,
      globalThemesDir: GLOBAL_DIR,
    })

    expect(themes.map((theme) => theme.name)).toContain('ocean')
    expect(themes.map((theme) => theme.name)).toContain('forest')

    const errorFiles = errors.map((error) => path.basename(error.filePath))
    expect(errorFiles).toContain('invalid.json')
    expect(errorFiles).toContain('broken-theme.json')
  })

  test('listing is deterministic across calls', async () => {
    const first = await loadThemes({
      cwd: PROJECT_CWD,
      stopAt: PROJECT_ROOT,
      globalThemesDir: GLOBAL_DIR,
    })
    const second = await loadThemes({
      cwd: PROJECT_CWD,
      stopAt: PROJECT_ROOT,
      globalThemesDir: GLOBAL_DIR,
    })

    expect(first.themes.map((theme) => theme.name)).toEqual(
      second.themes.map((theme) => theme.name),
    )
    expect(first.themes.map((theme) => theme.source)).toEqual(
      second.themes.map((theme) => theme.source),
    )
  })
})
