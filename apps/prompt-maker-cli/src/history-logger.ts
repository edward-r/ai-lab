import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const HISTORY_FILE = path.join(os.homedir(), '.config', 'prompt-maker-cli', 'history.jsonl')

export const appendToHistory = async (payload: object): Promise<void> => {
  try {
    await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true })
    const line = `${JSON.stringify(payload)}\n`
    await fs.appendFile(HISTORY_FILE, line, 'utf8')
  } catch (error) {
    console.warn('Failed to write history entry:', error)
  }
}
