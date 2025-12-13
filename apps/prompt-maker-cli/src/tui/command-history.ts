import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export type CommandHistoryRecord = {
  value: string
  timestamp: string
}

const HISTORY_FILE = path.join(os.homedir(), '.config', 'prompt-maker-cli', 'tui-history.json')

const isFileMissingError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false
  }
  return 'code' in error && error.code === 'ENOENT'
}

const parseHistoryRecords = (raw: unknown): CommandHistoryRecord[] => {
  if (!Array.isArray(raw)) {
    throw new Error('History file must contain a JSON array.')
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null
      }
      if (!('value' in entry) || typeof entry.value !== 'string') {
        return null
      }
      const timestamp =
        'timestamp' in entry && typeof entry.timestamp === 'string' ? entry.timestamp : null
      return { value: entry.value, timestamp: timestamp ?? new Date().toISOString() }
    })
    .filter((entry): entry is CommandHistoryRecord => Boolean(entry))
}

export const readCommandHistory = async (): Promise<CommandHistoryRecord[]> => {
  try {
    const contents = await fs.readFile(HISTORY_FILE, 'utf8')
    const parsed = JSON.parse(contents) as unknown
    return parseHistoryRecords(parsed)
  } catch (error) {
    if (isFileMissingError(error)) {
      return []
    }
    const message = error instanceof Error ? error.message : 'Unknown history error.'
    throw new Error(`Failed to load history at ${HISTORY_FILE}: ${message}`)
  }
}

export const writeCommandHistory = async (entries: CommandHistoryRecord[]): Promise<void> => {
  await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true })
  await fs.writeFile(HISTORY_FILE, JSON.stringify(entries, null, 2), 'utf8')
}

export const updateCommandHistory = (params: {
  previous: CommandHistoryRecord[]
  nextValue: string
  timestamp?: string
  maxEntries: number
}): CommandHistoryRecord[] => {
  const normalized = params.nextValue.trim()
  if (!normalized) {
    return params.previous
  }

  const lastEntry = params.previous[0]
  if (lastEntry && lastEntry.value === normalized) {
    return params.previous
  }

  const next: CommandHistoryRecord[] = [
    { value: normalized, timestamp: params.timestamp ?? new Date().toISOString() },
    ...params.previous,
  ]

  return next.slice(0, Math.max(1, params.maxEntries))
}
