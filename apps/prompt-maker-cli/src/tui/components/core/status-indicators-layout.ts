import { TOGGLE_LABELS } from '../../config'

import type { ModelProvider } from '../../../model-providers'

export type IndicatorStyle = 'primary' | 'muted' | 'success' | 'warning' | 'danger'

export type IndicatorSegment = {
  id: string
  label: string
  value: string
  style: IndicatorStyle
  raw: string
}

export type IndicatorLine = {
  segments: readonly IndicatorSegment[]
}

const PROVIDER_KEYS: ReadonlySet<ModelProvider> = new Set(['openai', 'gemini', 'other'])

const normalizeChipBody = (raw: string): string | null => {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return null
  }

  return trimmed.slice(1, -1)
}

type ParsedChip = {
  key: string
  value: string
  raw: string
}

const parseIndicatorChip = (raw: string): ParsedChip | null => {
  const body = normalizeChipBody(raw)
  if (!body) {
    return null
  }

  const separatorIndex = body.indexOf(':')
  if (separatorIndex === -1) {
    return { key: 'model', value: body, raw }
  }

  const key = body.slice(0, separatorIndex).trim()
  const value = body.slice(separatorIndex + 1).trim()
  if (!key) {
    return null
  }

  return { key, value, raw }
}

const toTitleCase = (value: string): string => {
  if (!value) {
    return value
  }
  return `${value[0]?.toUpperCase() ?? ''}${value.slice(1)}`
}

const resolveToggleLabel = (key: string): string | null => {
  if (key === 'smart') {
    return 'Smart'
  }

  const label = (TOGGLE_LABELS as Record<string, string>)[key]
  return label ?? null
}

const resolveSegmentLabel = (chip: ParsedChip): string => {
  if (chip.key === 'model') {
    return 'Model'
  }
  if (chip.key === 'target') {
    return 'Target'
  }
  if (chip.key === 'instr') {
    return 'Meta'
  }

  const toggleLabel = resolveToggleLabel(chip.key)
  if (toggleLabel) {
    return toggleLabel
  }

  if (chip.key === 'openai') {
    return 'OpenAI'
  }

  if (chip.key === 'urls') {
    return 'URLs'
  }

  if (PROVIDER_KEYS.has(chip.key as ModelProvider)) {
    return toTitleCase(chip.key)
  }

  return toTitleCase(chip.key)
}

const resolveSegmentStyle = (chip: ParsedChip): IndicatorStyle => {
  if (chip.key === 'status' || chip.key === 'model' || chip.key === 'target') {
    return 'primary'
  }

  if (chip.key === 'tokens') {
    return 'primary'
  }

  if (PROVIDER_KEYS.has(chip.key as ModelProvider)) {
    const suffix = chip.value.toLowerCase()
    if (suffix === 'ok') {
      return 'success'
    }
    if (suffix === 'missing-key' || suffix === 'missing') {
      return 'warning'
    }
    if (suffix === 'error') {
      return 'danger'
    }
    return 'muted'
  }

  if (chip.key === 'files' || chip.key === 'urls') {
    const count = Number.parseInt(chip.value, 10)
    return Number.isFinite(count) && count > 0 ? 'primary' : 'muted'
  }

  const toggleLabel = resolveToggleLabel(chip.key)
  if (toggleLabel) {
    return chip.value.toLowerCase() === 'on' ? 'primary' : 'muted'
  }

  if (chip.key === 'intent') {
    return chip.value.toLowerCase() === 'file' ? 'primary' : 'muted'
  }

  if (chip.key === 'tests') {
    return chip.value.toLowerCase() === 'running' ? 'warning' : 'muted'
  }

  return 'muted'
}

const resolveSortWeight = (segment: IndicatorSegment): number => {
  switch (segment.label) {
    case 'Status':
      return 0
    case 'Model':
      return 1
    case 'Target':
      return 1
    case 'OpenAI':
    case 'Gemini':
    case 'Other':
      return 2
    case 'Tokens':
      return 3
    case 'Intent':
      return 4
    case 'File':
      return 5
    case 'Meta':
      return 6
    case 'Root':
      return 7
    case 'Files':
      return 8
    case 'URLs':
      return 9
    default:
      return 10
  }
}

export const resolveIndicatorSegments = (chips: readonly string[]): IndicatorSegment[] => {
  const segments: IndicatorSegment[] = []

  for (const raw of chips) {
    const parsed = parseIndicatorChip(raw)
    if (!parsed) {
      continue
    }

    const label = resolveSegmentLabel(parsed)
    segments.push({
      id: `${parsed.key}-${segments.length}`,
      label,
      value: parsed.value,
      style: resolveSegmentStyle(parsed),
      raw,
    })
  }

  return segments.sort((left, right) => {
    const weightDiff = resolveSortWeight(left) - resolveSortWeight(right)
    return weightDiff !== 0 ? weightDiff : left.label.localeCompare(right.label)
  })
}

export const formatIndicatorSegmentPlain = (segment: IndicatorSegment): string =>
  `${segment.label}: ${segment.value}`

export const formatIndicatorLines = (params: {
  chips: readonly string[]
  maxWidth: number
}): IndicatorLine[] => {
  const maxWidth = Math.max(16, Math.floor(params.maxWidth))
  const segments = resolveIndicatorSegments(params.chips)

  const lines: IndicatorSegment[][] = []
  let current: IndicatorSegment[] = []
  let currentLength = 0

  const separator = ' · '

  const pushLine = (): void => {
    if (current.length === 0) {
      return
    }
    lines.push(current)
    current = []
    currentLength = 0
  }

  for (const segment of segments) {
    const token = formatIndicatorSegmentPlain(segment)
    const tokenLength = token.length

    if (current.length === 0) {
      current = [segment]
      currentLength = tokenLength
      continue
    }

    const nextLength = currentLength + separator.length + tokenLength
    if (nextLength <= maxWidth) {
      current.push(segment)
      currentLength = nextLength
      continue
    }

    pushLine()
    current = [segment]
    currentLength = tokenLength
  }

  pushLine()

  return lines.map((segmentsForLine) => ({ segments: segmentsForLine }))
}
