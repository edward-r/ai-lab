import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const readJson = async (filePath: string): Promise<unknown> => {
  const contents = await fs.readFile(filePath, 'utf8')
  return JSON.parse(contents) as unknown
}

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

describe('theme persistence', () => {
  const envBefore = { ...process.env }

  afterEach(() => {
    process.env = { ...envBefore }
  })

  test('defaults theme + mode when config lacks fields', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pm-theme-persist-'))
    const configPath = path.join(tempRoot, 'config.json')
    const globalThemesDir = path.join(tempRoot, 'global-themes')

    await writeJson(configPath, {})

    process.env.PROMPT_MAKER_CLI_CONFIG = configPath

    jest.resetModules()
    const { loadThemeSelection } = await import('../../tui/theme/theme-settings-service')
    const { DEFAULT_THEME_NAME } = await import('../../tui/theme/theme-registry')

    const result = await loadThemeSelection({
      themeLoadOptions: {
        cwd: tempRoot,
        stopAt: tempRoot,
        globalThemesDir,
      },
    })

    expect(result.selection.themeName).toBe(DEFAULT_THEME_NAME)
    expect(result.selection.themeMode).toBe('dark')
    expect(result.warnings).toEqual([])
  })

  test('invalid theme name falls back deterministically with warning', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pm-theme-persist-'))
    const configPath = path.join(tempRoot, 'config.json')
    const globalThemesDir = path.join(tempRoot, 'global-themes')

    await writeJson(configPath, { theme: 'not-a-theme' })

    process.env.PROMPT_MAKER_CLI_CONFIG = configPath

    jest.resetModules()
    const { loadThemeSelection } = await import('../../tui/theme/theme-settings-service')
    const { DEFAULT_THEME_NAME } = await import('../../tui/theme/theme-registry')

    const result = await loadThemeSelection({
      themeLoadOptions: {
        cwd: tempRoot,
        stopAt: tempRoot,
        globalThemesDir,
      },
    })

    expect(result.selection.themeName).toBe(DEFAULT_THEME_NAME)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]?.kind).toBe('unknown-theme')
    expect(result.warnings[0]?.requested).toBe('not-a-theme')
    expect(result.warnings[0]?.fallback).toBe(DEFAULT_THEME_NAME)
  })

  test('auto themeMode is treated as system', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pm-theme-persist-'))
    const configPath = path.join(tempRoot, 'config.json')
    const globalThemesDir = path.join(tempRoot, 'global-themes')

    await writeJson(configPath, { themeMode: 'auto' })

    process.env.PROMPT_MAKER_CLI_CONFIG = configPath

    jest.resetModules()
    const { loadThemeSelection } = await import('../../tui/theme/theme-settings-service')

    const result = await loadThemeSelection({
      themeLoadOptions: {
        cwd: tempRoot,
        stopAt: tempRoot,
        globalThemesDir,
      },
    })

    expect(result.selection.themeMode).toBe('system')
  })

  test('saving updates config without rewriting other fields', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pm-theme-persist-'))
    const configPath = path.join(tempRoot, 'config.json')

    await writeJson(configPath, {
      openaiApiKey: 'keep-me',
      theme: 'pm-dark',
      themeMode: 'dark',
      promptGenerator: { defaultModel: 'gpt-4o' },
    })

    process.env.PROMPT_MAKER_CLI_CONFIG = configPath

    jest.resetModules()
    const { saveThemeSelection } = await import('../../tui/theme/theme-settings-service')

    await saveThemeSelection({ themeName: 'pm-light', themeMode: 'light' })

    const updated = await readJson(configPath)
    expect(updated).toMatchObject({
      openaiApiKey: 'keep-me',
      theme: 'pm-light',
      themeMode: 'light',
      promptGenerator: { defaultModel: 'gpt-4o' },
    })
  })
})
