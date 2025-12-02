import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { getEmbedding } from '@prompt-maker/core'

const CACHE_DIR = path.join(os.homedir(), '.config', 'prompt-maker-cli')
const CACHE_FILE = path.join(CACHE_DIR, 'embeddings_cache.json')

type CacheEntry = {
  hash: string
  embedding: number[]
}

type EmbeddingCache = Record<string, CacheEntry>

let inMemoryCache: EmbeddingCache | null = null

export const indexFiles = async (filePaths: string[]): Promise<void> => {
  if (filePaths.length === 0) {
    return
  }

  const uniquePaths = [...new Set(filePaths)]
  const cache = await loadCache()
  let changed = false

  for (const filePath of uniquePaths) {
    try {
      const contents = await fs.readFile(filePath, 'utf8')
      const hash = hashContent(contents)
      const existing = cache[filePath]
      if (existing && existing.hash === hash) {
        continue
      }

      const embedding = await getEmbedding(contents)
      cache[filePath] = { hash, embedding }
      changed = true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Failed to index ${filePath}: ${message}`)
    }
  }

  if (changed) {
    await saveCache(cache)
  }
}

export const search = async (
  query: string,
  k: number,
  allowedPaths?: Iterable<string>,
): Promise<string[]> => {
  if (!query.trim() || k <= 0) {
    return []
  }

  const cache = await loadCache()
  let entries = Object.entries(cache)
  if (entries.length === 0) {
    return []
  }

  if (allowedPaths) {
    const allowedSet = new Set(Array.from(allowedPaths, (filePath) => path.resolve(filePath)))
    entries = entries.filter(([filePath]) => allowedSet.has(path.resolve(filePath)))
    if (entries.length === 0) {
      return []
    }
  }

  const queryEmbedding = await getEmbedding(query)

  const scored = entries
    .map(([filePath, entry]) => ({
      filePath,
      score: cosineSimilarity(queryEmbedding, entry.embedding),
    }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(k, entries.length))
    .map(({ filePath }) => filePath)

  return scored
}

const loadCache = async (): Promise<EmbeddingCache> => {
  if (inMemoryCache) {
    return inMemoryCache
  }

  try {
    const contents = await fs.readFile(CACHE_FILE, 'utf8')
    const parsed = JSON.parse(contents) as unknown
    if (isEmbeddingCache(parsed)) {
      inMemoryCache = parsed
      return parsed
    }
    console.warn('Embeddings cache file is malformed. Resetting cache.')
  } catch (error) {
    if (!isFileMissingError(error)) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Failed to load embeddings cache: ${message}`)
    }
  }

  inMemoryCache = {}
  return inMemoryCache
}

const saveCache = async (cache: EmbeddingCache): Promise<void> => {
  await fs.mkdir(CACHE_DIR, { recursive: true })
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8')
  inMemoryCache = cache
}

const hashContent = (contents: string): string => {
  return crypto.createHash('sha256').update(contents).digest('hex')
}

const cosineSimilarity = (left: number[], right: number[]): number => {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return Number.NEGATIVE_INFINITY
  }

  let dot = 0
  let normLeft = 0
  let normRight = 0

  for (let i = 0; i < left.length; i += 1) {
    const a = left[i]
    const b = right[i]
    if (a === undefined || b === undefined) {
      return Number.NEGATIVE_INFINITY
    }
    dot += a * b
    normLeft += a * a
    normRight += b * b
  }

  if (normLeft === 0 || normRight === 0) {
    return Number.NEGATIVE_INFINITY
  }

  return dot / (Math.sqrt(normLeft) * Math.sqrt(normRight))
}

const isEmbeddingCache = (value: unknown): value is EmbeddingCache => {
  if (!value || typeof value !== 'object') {
    return false
  }

  return Object.values(value as Record<string, unknown>).every(isCacheEntry)
}

const isCacheEntry = (value: unknown): value is CacheEntry => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    typeof record.hash === 'string' &&
    Array.isArray(record.embedding) &&
    record.embedding.every(isFiniteNumber)
  )
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const hasErrnoCode = (error: unknown): error is { code: string } =>
  typeof error === 'object' && error !== null && 'code' in error

const isFileMissingError = (error: unknown): boolean =>
  hasErrnoCode(error) && error.code === 'ENOENT'
