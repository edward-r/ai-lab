import fs from 'node:fs/promises'
import path from 'node:path'

import fg from 'fast-glob'

import type { FileContext } from './file-context'
import * as vectorStore from './rag/vector-store'

type ProgressCallback = (message: string) => void

const SMART_CONTEXT_PATTERNS = ['**/*.{ts,tsx,js,jsx,py,md,json}']
const SMART_CONTEXT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/coverage/**',
  '**/.git/**',
  '**/.nx/**',
  '**/.next/**',
  '**/package-lock.json',
  '**/pnpm-lock.yaml',
  '**/yarn.lock',
]

const MAX_EMBEDDING_FILE_SIZE = 25 * 1024

export const resolveSmartContextFiles = async (
  intent: string,
  currentContext: FileContext[],
  onProgress?: ProgressCallback,
  rootDirectory?: string,
): Promise<FileContext[]> => {
  const baseDir = rootDirectory ? path.resolve(rootDirectory) : process.cwd()

  onProgress?.('Scanning workspace for smart context files')
  let filesToIndex: string[] = []
  try {
    filesToIndex = await fg(SMART_CONTEXT_PATTERNS, {
      dot: true,
      absolute: true,
      cwd: baseDir,
      ignore: SMART_CONTEXT_IGNORE_PATTERNS,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown smart context glob error.'
    console.warn(`Smart context scan failed: ${message}`)
    onProgress?.('Smart context scan failed')
    return []
  }

  if (filesToIndex.length === 0) {
    onProgress?.('No smart context files found')
    return []
  }

  const uniqueFiles = [...new Set(filesToIndex.map((filePath) => path.resolve(filePath)))]
  const validFiles: string[] = []

  for (const file of uniqueFiles) {
    try {
      const stats = await fs.stat(file)
      if (stats.size < MAX_EMBEDDING_FILE_SIZE) {
        validFiles.push(file)
      }
    } catch {
      // Ignore files that cannot be read
    }
  }

  if (validFiles.length === 0) {
    onProgress?.('No smart context files within size limit')
    return []
  }

  onProgress?.('Indexing smart context')
  try {
    await vectorStore.indexFiles(validFiles)
    onProgress?.('Indexed smart context ✓')
  } catch (error) {
    onProgress?.('Failed to index smart context')
    const message = error instanceof Error ? error.message : 'Unknown smart context error.'
    console.warn(`Smart context indexing failed: ${message}`)
    return []
  }

  onProgress?.('Searching smart context')
  let relatedPaths: string[] = []
  try {
    relatedPaths = await vectorStore.search(intent, 5, validFiles)
  } catch (error) {
    onProgress?.('Failed to search smart context')
    const message = error instanceof Error ? error.message : 'Unknown smart context search error.'
    console.warn(`Smart context search failed: ${message}`)
    return []
  }

  const availableSet = new Set(validFiles.map((filePath) => normalizePath(filePath)))
  const filtered = relatedPaths
    .map((filePath) => normalizePath(filePath))
    .filter((filePath) => availableSet.has(filePath))

  if (filtered.length === 0) {
    onProgress?.('No related smart context files found')
    return []
  }

  const results = await readSmartContextFiles(filtered, currentContext)
  if (results.length > 0) {
    onProgress?.('Smart context ready')
  } else {
    onProgress?.('No smart context files added')
  }
  return results
}

const readSmartContextFiles = async (
  candidatePaths: string[],
  currentContext: FileContext[],
): Promise<FileContext[]> => {
  const existingPaths = new Set(currentContext.map((file) => normalizePath(file.path)))
  const results: FileContext[] = []

  for (const filePath of candidatePaths) {
    if (existingPaths.has(filePath)) {
      continue
    }

    try {
      const content = await fs.readFile(filePath, 'utf8')
      results.push({ path: toDisplayPath(filePath), content })
      existingPaths.add(filePath)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown file read error.'
      console.warn(`Warning: Failed to read smart context file ${filePath}: ${message}`)
    }
  }

  return results
}

const normalizePath = (filePath: string): string => path.resolve(filePath)

const toDisplayPath = (absolutePath: string): string => {
  const cwd = process.cwd()
  const relative = path.relative(cwd, absolutePath)
  if (!relative || relative.startsWith('..')) {
    return absolutePath
  }
  return relative
}
