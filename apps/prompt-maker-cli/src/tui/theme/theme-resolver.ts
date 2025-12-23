import {
  REQUIRED_THEME_SLOTS,
  type InkColorValue,
  type ResolvedTheme,
  type ThemeAppearanceMode,
  type ThemeColorValue,
  type ThemeJson,
  type ThemeSlot,
} from './theme-types'

export type ResolveColorContext = {
  mode: ThemeAppearanceMode
  defs: Record<string, ThemeColorValue>
  theme: Record<string, ThemeColorValue>
}

type ResolutionState = {
  stack: string[]
  cache: Map<string, InkColorValue>
}

const HEX_6_RE = /^#[0-9a-fA-F]{6}$/
const HEX_8_RE = /^#[0-9a-fA-F]{8}$/

const ANSI_16_HEX: readonly string[] = [
  '#000000',
  '#800000',
  '#008000',
  '#808000',
  '#000080',
  '#800080',
  '#008080',
  '#c0c0c0',
  '#808080',
  '#ff0000',
  '#00ff00',
  '#ffff00',
  '#0000ff',
  '#ff00ff',
  '#00ffff',
  '#ffffff',
]

const ANSI_CUBE_LEVELS: readonly number[] = [0, 95, 135, 175, 215, 255]

const toHexByte = (value: number): string => value.toString(16).padStart(2, '0')

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`

export const ansiToHex = (code: number): string => {
  if (!Number.isInteger(code) || code < 0 || code > 255) {
    throw new Error(`ANSI color must be an integer 0..255 (received: ${String(code)})`)
  }

  if (code < 16) {
    const value = ANSI_16_HEX[code]
    if (!value) {
      throw new Error(`Internal ANSI mapping missing for code ${code}`)
    }
    return value
  }

  if (code < 232) {
    const index = code - 16
    const rIndex = Math.floor(index / 36)
    const gIndex = Math.floor((index % 36) / 6)
    const bIndex = index % 6

    const r = ANSI_CUBE_LEVELS[rIndex]
    const g = ANSI_CUBE_LEVELS[gIndex]
    const b = ANSI_CUBE_LEVELS[bIndex]

    if (r === undefined || g === undefined || b === undefined) {
      throw new Error(`Internal ANSI color cube mapping failed for code ${code}`)
    }

    return rgbToHex(r, g, b)
  }

  const gray = 8 + 10 * (code - 232)
  return rgbToHex(gray, gray, gray)
}

const normalizeSpecial = (value: string): InkColorValue | null => {
  const lowered = value.toLowerCase()
  if (lowered === 'none' || lowered === 'transparent') {
    return undefined
  }
  return null
}

const normalizeHex = (value: string): InkColorValue | null => {
  if (HEX_6_RE.test(value)) {
    return value.toLowerCase()
  }

  if (HEX_8_RE.test(value)) {
    const rgb = value.slice(0, 7).toLowerCase()
    const alpha = value.slice(7, 9).toLowerCase()
    return alpha === '00' ? undefined : rgb
  }

  return null
}

const isVariant = (
  value: ThemeColorValue,
): value is { dark: ThemeColorValue; light: ThemeColorValue } =>
  typeof value === 'object' && value !== null && 'dark' in value && 'light' in value

const resolveNamed = (
  key: string,
  raw: ThemeColorValue,
  ctx: ResolveColorContext,
  state: ResolutionState,
) => {
  const cached = state.cache.get(key)
  if (cached !== undefined || state.cache.has(key)) {
    return cached
  }

  const cycleStart = state.stack.indexOf(key)
  if (cycleStart >= 0) {
    const cyclePath = [...state.stack.slice(cycleStart), key].join(' -> ')
    throw new Error(`Theme reference cycle detected: ${cyclePath}`)
  }

  state.stack.push(key)
  const resolved = resolveColorInternal(raw, ctx, state)
  state.stack.pop()
  state.cache.set(key, resolved)
  return resolved
}

const resolveReference = (
  name: string,
  ctx: ResolveColorContext,
  state: ResolutionState,
): InkColorValue => {
  const def = ctx.defs[name]
  if (def !== undefined) {
    return resolveNamed(`defs.${name}`, def, ctx, state)
  }

  const themeValue = ctx.theme[name]
  if (themeValue !== undefined) {
    return resolveNamed(`theme.${name}`, themeValue, ctx, state)
  }

  throw new Error(`Unknown theme color reference: ${name}`)
}

const resolveColorInternal = (
  value: ThemeColorValue,
  ctx: ResolveColorContext,
  state: ResolutionState,
): InkColorValue => {
  if (typeof value === 'number') {
    return ansiToHex(value)
  }

  if (typeof value === 'string') {
    const special = normalizeSpecial(value)
    if (special !== null) {
      return special
    }

    const hex = normalizeHex(value)
    if (hex !== null) {
      return hex
    }

    return resolveReference(value, ctx, state)
  }

  if (isVariant(value)) {
    const selected = value[ctx.mode]
    return resolveColorInternal(selected, ctx, state)
  }

  const exhaustive: never = value
  return exhaustive
}

export const resolveColor = (value: ThemeColorValue, ctx: ResolveColorContext): InkColorValue => {
  return resolveColorInternal(value, ctx, { stack: [], cache: new Map() })
}

const resolveRequiredSlot = (
  slot: ThemeSlot,
  ctx: ResolveColorContext,
  state: ResolutionState,
): InkColorValue => {
  const raw = ctx.theme[slot]
  if (raw === undefined) {
    throw new Error(`Theme is missing required slot: ${slot}`)
  }

  return resolveNamed(`theme.${slot}`, raw, ctx, state)
}

export const resolveTheme = (themeJson: ThemeJson, mode: ThemeAppearanceMode): ResolvedTheme => {
  const missing = REQUIRED_THEME_SLOTS.filter((slot) => themeJson.theme[slot] === undefined)
  if (missing.length > 0) {
    throw new Error(`Theme is missing required slots: ${missing.join(', ')}`)
  }

  const ctx: ResolveColorContext = {
    mode,
    defs: themeJson.defs ?? {},
    theme: themeJson.theme,
  }

  const state: ResolutionState = { stack: [], cache: new Map() }

  const resolved: Partial<ResolvedTheme> = {}
  for (const slot of REQUIRED_THEME_SLOTS) {
    resolved[slot] = resolveRequiredSlot(slot, ctx, state)
  }

  return resolved as ResolvedTheme
}
