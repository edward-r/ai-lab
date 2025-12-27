import { createHash } from 'node:crypto'

const padTwoDigits = (value: number): string => value.toString().padStart(2, '0')

export const formatSeriesTimestamp = (date: Date = new Date()): string => {
  const year = date.getFullYear().toString()
  const month = padTwoDigits(date.getMonth() + 1)
  const day = padTwoDigits(date.getDate())
  const hours = padTwoDigits(date.getHours())
  const minutes = padTwoDigits(date.getMinutes())
  const seconds = padTwoDigits(date.getSeconds())
  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

export const sanitizeForPathSegment = (
  value: string,
  fallback: string,
  maxLength?: number,
): string => {
  const normalized = value.trim().toLowerCase()
  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  const candidate = slug || fallback
  if (!maxLength || candidate.length <= maxLength) {
    return candidate
  }

  const truncated = candidate.slice(0, maxLength).replace(/-+$/g, '')
  return truncated || fallback
}

export const sanitizeForPathSegmentWithHash = (
  value: string,
  fallback: string,
  maxLength: number,
): string => {
  const candidate = sanitizeForPathSegment(value, fallback)
  if (candidate.length <= maxLength) {
    return candidate
  }

  const digest = createHash('sha1').update(value).digest('hex').slice(0, 8)
  const suffix = `-${digest}`
  const available = Math.max(0, maxLength - suffix.length)
  const prefix = candidate.slice(0, available).replace(/-+$/g, '')

  if (prefix.length === 0) {
    return fallback.slice(0, maxLength)
  }

  return `${prefix}${suffix}`
}

export const buildSeriesOutputDirName = (intent: string, date: Date = new Date()): string => {
  const timestamp = formatSeriesTimestamp(date)
  const intentSlug = sanitizeForPathSegmentWithHash(intent, 'intent', 80)
  return `${timestamp}-${intentSlug}`
}
