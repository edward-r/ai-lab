import fs from 'node:fs/promises'
import fg from 'fast-glob'

export type FileContext = {
  path: string
  content: string
}

export const resolveFileContext = async (patterns: string[]): Promise<FileContext[]> => {
  if (patterns.length === 0) {
    return []
  }

  const entries = await fg(patterns, { dot: true })

  if (entries.length === 0) {
    console.warn(`Warning: No files matched the context patterns: ${patterns.join(', ')}`)
    return []
  }

  const results: FileContext[] = []

  for (const filePath of entries) {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      results.push({ path: filePath, content })
    } catch {
      console.warn(`Warning: Failed to read context file ${filePath}`)
    }
  }

  return results
}

export const formatContextForPrompt = (files: FileContext[]): string => {
  if (files.length === 0) return ''

  return files.map((file) => `<file path="${file.path}">\n${file.content}\n</file>`).join('\n\n')
}
