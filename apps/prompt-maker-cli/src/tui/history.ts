import fs from 'node:fs/promises'

import { HISTORY_FILE_PATH } from '../history-logger'
import type { GenerateJsonPayload } from '../generate-command'

export type HistoryEntry = GenerateJsonPayload & {
  timestamp: string
}

const HISTORY_LIMIT = 40

export const loadHistoryEntries = async (limit = HISTORY_LIMIT): Promise<HistoryEntry[]> => {
  try {
    const raw = await fs.readFile(HISTORY_FILE_PATH, 'utf8')
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    const entries: HistoryEntry[] = []

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index]
      if (!line) {
        continue
      }
      try {
        const parsed = JSON.parse(line) as HistoryEntry
        entries.push(parsed)
        if (entries.length >= limit) {
          break
        }
      } catch (error) {
        // Ignore malformed lines but log once for awareness.
        console.error('Failed to parse history entry:', error)
      }
    }

    return entries
  } catch (error) {
    if (isNotFound(error)) {
      return []
    }

    throw error
  }
}

const isNotFound = (error: unknown): error is NodeJS.ErrnoException =>
  Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code &&
      (error as { code?: string }).code === 'ENOENT',
  )
