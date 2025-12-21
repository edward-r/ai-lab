import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export type CommandHistoryRecord = {
  value: string
  timestamp: string
}

const HISTORY_FILE = path.join(os.homedir(), '.config', 'prompt-maker-cli', 'tui-history.json')

const getErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null
  }

  if (!('code' in error)) {
    return null
  }

  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : null
}

const isFileMissingError = (error: unknown): boolean => getErrorCode(error) === 'ENOENT'

const isRecoverableHistoryError = (error: unknown): boolean => {
  if (error instanceof SyntaxError) {
    return true
  }

  if (error instanceof Error && error.message === 'History file must contain a JSON array.') {
    return true
  }

  return false
}

const sanitizeTimestamp = (timestamp: string): string => timestamp.replace(/[:.]/g, '-')

const repairCorruptHistoryFile = async (): Promise<void> => {
  const directory = path.dirname(HISTORY_FILE)
  const backupPath = path.join(
    directory,
    `tui-history.corrupt-${sanitizeTimestamp(new Date().toISOString())}.json`,
  )

  try {
    await fs.mkdir(directory, { recursive: true })
  } catch {
    return
  }

  try {
    await fs.rename(HISTORY_FILE, backupPath)
  } catch {
    // Best effort: ignore backup failures.
  }

  try {
    await fs.writeFile(HISTORY_FILE, '[]\n', 'utf8')
  } catch {
    // Best effort: ignore repair failures.
  }
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
    if (!contents.trim()) {
      return []
    }

    try {
      const parsed = JSON.parse(contents) as unknown
      return parseHistoryRecords(parsed)
    } catch (parseError) {
      if (isRecoverableHistoryError(parseError)) {
        await repairCorruptHistoryFile()
        return []
      }
      throw parseError
    }
  } catch (error) {
    if (isFileMissingError(error)) {
      return []
    }

    if (isRecoverableHistoryError(error)) {
      await repairCorruptHistoryFile()
      return []
    }

    const message = error instanceof Error ? error.message : 'Unknown history error.'
    throw new Error(`Failed to load history at ${HISTORY_FILE}: ${message}`)
  }
}

export const writeCommandHistory = async (entries: CommandHistoryRecord[]): Promise<void> => {
  const directory = path.dirname(HISTORY_FILE)
  await fs.mkdir(directory, { recursive: true })

  const contents = JSON.stringify(entries, null, 2)
  const tempFile = `${HISTORY_FILE}.${process.pid}.tmp`
  await fs.writeFile(tempFile, contents, 'utf8')

  try {
    await fs.rename(tempFile, HISTORY_FILE)
  } catch {
    await fs.writeFile(HISTORY_FILE, contents, 'utf8')
  }
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
