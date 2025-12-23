import fs from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { listThemes, type ThemeRegistryEntry } from './theme-registry'
import {
  REQUIRED_THEME_SLOTS,
  type ThemeColorValue,
  type ThemeJson,
  type ThemeSlot,
} from './theme-types'

export type ThemeSource = 'builtin' | 'global' | 'project'

export type ThemeDescriptor = {
  name: string
  label: string
  source: ThemeSource
  theme: ThemeJson
  filePath?: string
}

export type ThemeLoadErrorKind = 'read' | 'parse' | 'validate'

export type ThemeLoadError = {
  kind: ThemeLoadErrorKind
  filePath: string
  message: string
}

export type LoadThemesOptions = {
  cwd?: string
  stopAt?: string | undefined
  homedir?: string
  globalThemesDir?: string
}

type ThemeCandidate = {
  name: string
  theme: ThemeJson
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isThemeColorVariant = (value: unknown): value is { dark: unknown; light: unknown } => {
  if (!isRecord(value)) {
    return false
  }
  return 'dark' in value && 'light' in value
}

const isThemeColorValue = (value: unknown): value is ThemeColorValue => {
  if (typeof value === 'string') {
    return true
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }
  if (isThemeColorVariant(value)) {
    return isThemeColorValue(value.dark) && isThemeColorValue(value.light)
  }
  return false
}

const validateThemeJson = (
  value: unknown,
): { ok: true; theme: ThemeJson } | { ok: false; message: string } => {
  if (!isRecord(value)) {
    return { ok: false, message: 'Theme JSON must be an object.' }
  }

  const theme = value.theme
  if (!isRecord(theme)) {
    return { ok: false, message: 'Theme JSON must include a `theme` object.' }
  }

  const defs = value.defs
  if (defs !== undefined) {
    if (!isRecord(defs)) {
      return { ok: false, message: '`defs` must be an object when present.' }
    }

    for (const [key, defValue] of Object.entries(defs)) {
      if (!isThemeColorValue(defValue)) {
        return { ok: false, message: `Invalid defs color value for key: ${key}` }
      }
    }
  }

  const missingSlots: ThemeSlot[] = []
  for (const slot of REQUIRED_THEME_SLOTS) {
    const slotValue = theme[slot]
    if (slotValue === undefined) {
      missingSlots.push(slot)
      continue
    }
    if (!isThemeColorValue(slotValue)) {
      return { ok: false, message: `Invalid theme color value for slot: ${slot}` }
    }
  }

  if (missingSlots.length > 0) {
    return {
      ok: false,
      message: `Theme JSON missing required slots: ${missingSlots.join(', ')}`,
    }
  }

  for (const [key, slotValue] of Object.entries(theme)) {
    if (!isThemeColorValue(slotValue)) {
      return { ok: false, message: `Invalid theme color value for key: ${key}` }
    }
  }

  return { ok: true, theme: value as ThemeJson }
}

const defaultGlobalThemesDir = (homedir: string): string =>
  path.join(homedir, '.config', 'prompt-maker-cli', 'themes')

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.stat(targetPath)
    return true
  } catch {
    return false
  }
}

const readJsonFile = async (filePath: string): Promise<unknown> => {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw) as unknown
}

const loadThemeCandidateFromFile = async (
  filePath: string,
): Promise<{ ok: true; candidate: ThemeCandidate } | { ok: false; error: ThemeLoadError }> => {
  const name = path.basename(filePath, '.json')

  let parsed: unknown
  try {
    parsed = await readJsonFile(filePath)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown theme file read error.'
    const kind: ThemeLoadErrorKind = error instanceof SyntaxError ? 'parse' : 'read'
    return { ok: false, error: { kind, filePath, message } }
  }

  const validated = validateThemeJson(parsed)
  if (!validated.ok) {
    return { ok: false, error: { kind: 'validate', filePath, message: validated.message } }
  }

  return { ok: true, candidate: { name, theme: validated.theme } }
}

const listThemeJsonFiles = async (
  themesDir: string,
): Promise<{ files: string[]; errors: ThemeLoadError[] }> => {
  const errors: ThemeLoadError[] = []

  if (!(await pathExists(themesDir))) {
    return { files: [], errors }
  }

  let entries: Dirent[]
  try {
    entries = await fs.readdir(themesDir, { withFileTypes: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown directory read error.'
    errors.push({ kind: 'read', filePath: themesDir, message })
    return { files: [], errors }
  }

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(themesDir, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)))

  return { files, errors }
}

const discoverProjectThemesDirs = async (
  cwd: string,
  stopAt?: string | undefined,
): Promise<string[]> => {
  const discovered: string[] = []

  const resolvedStopAt = stopAt ? path.resolve(stopAt) : null
  let current: string | null = path.resolve(cwd)

  while (current !== null) {
    const candidate = path.join(current, '.prompt-maker-cli', 'themes')
    if (await pathExists(candidate)) {
      discovered.push(candidate)
    }

    if (resolvedStopAt && current === resolvedStopAt) {
      current = null
      continue
    }

    const parent = path.dirname(current)
    if (parent === current) {
      current = null
      continue
    }

    current = parent
  }

  return discovered
}

const toBuiltinDescriptor = (entry: ThemeRegistryEntry): ThemeDescriptor => ({
  name: entry.name,
  label: entry.label,
  source: 'builtin',
  theme: entry.theme,
})

const toCustomDescriptor = (
  candidate: ThemeCandidate,
  source: Exclude<ThemeSource, 'builtin'>,
  filePath: string,
  existing?: ThemeDescriptor,
): ThemeDescriptor => ({
  name: candidate.name,
  label: existing?.label ?? candidate.name,
  source,
  theme: candidate.theme,
  filePath,
})

export const loadThemes = async (
  options: LoadThemesOptions = {},
): Promise<{ themes: ThemeDescriptor[]; errors: ThemeLoadError[] }> => {
  const cwd = options.cwd ?? process.cwd()
  const homedir = options.homedir ?? os.homedir()
  const globalThemesDir = options.globalThemesDir ?? defaultGlobalThemesDir(homedir)

  const builtins = listThemes()
  const order: string[] = builtins.map((theme) => theme.name)
  const extras = new Set<string>()

  const themesByName = new Map<string, ThemeDescriptor>()
  for (const entry of builtins) {
    themesByName.set(entry.name, toBuiltinDescriptor(entry))
  }

  const errors: ThemeLoadError[] = []

  const applyThemeFiles = async (
    source: Exclude<ThemeSource, 'builtin'>,
    themesDir: string,
  ): Promise<void> => {
    const listing = await listThemeJsonFiles(themesDir)
    errors.push(...listing.errors)

    for (const filePath of listing.files) {
      const loaded = await loadThemeCandidateFromFile(filePath)
      if (!loaded.ok) {
        errors.push(loaded.error)
        continue
      }

      const existing = themesByName.get(loaded.candidate.name)
      themesByName.set(
        loaded.candidate.name,
        toCustomDescriptor(loaded.candidate, source, filePath, existing),
      )

      if (!order.includes(loaded.candidate.name)) {
        extras.add(loaded.candidate.name)
      }
    }
  }

  await applyThemeFiles('global', globalThemesDir)

  const projectDirs = await discoverProjectThemesDirs(cwd, options.stopAt)
  const orderedProjectDirs = [...projectDirs].reverse()

  for (const dir of orderedProjectDirs) {
    await applyThemeFiles('project', dir)
  }

  const extrasSorted = Array.from(extras).sort((a, b) => a.localeCompare(b))
  const finalNames = [...order, ...extrasSorted]

  return {
    themes: finalNames
      .map((name) => themesByName.get(name))
      .filter((theme): theme is ThemeDescriptor => Boolean(theme)),
    errors,
  }
}
