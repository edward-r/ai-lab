import type { FileContext } from './file-context'

export const MAX_GITHUB_FILE_BYTES = 64 * 1024
export const MAX_GITHUB_FILES = 60
const GITHUB_FETCH_TIMEOUT_MS = 20_000
const GITHUB_API_BASE = 'https://api.github.com'
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com'

const IGNORE_PATTERNS = [
  /^node_modules\//i,
  /^dist\//i,
  /^coverage\//i,
  /^\.git\//i,
  /^\.nx\//i,
  /package-lock\.json$/i,
  /pnpm-lock\.yaml$/i,
  /yarn\.lock$/i,
  /\.zip$/i,
  /\.tgz$/i,
]

export type ResolveGithubOptions = {
  onProgress?: (message: string) => void
}

type GithubBlobTarget = {
  kind: 'blob'
  owner: string
  repo: string
  ref: string
  path: string
}

type GithubTreeTarget = {
  kind: 'tree'
  owner: string
  repo: string
  ref: string
  path?: string
}

type GithubTarget = GithubBlobTarget | GithubTreeTarget

type GithubTreeResponse = {
  tree?: { path: string; type: string; size?: number }[]
}

type GithubContentResponse = {
  encoding?: string
  content?: string
}

export const resolveGithubUrl = async (
  url: URL,
  options?: ResolveGithubOptions,
): Promise<FileContext[]> => {
  const target = parseGithubUrl(url)

  if (!target) {
    console.warn(`Warning: Unsupported GitHub URL ${url.href}.`)
    return []
  }

  if (target.kind === 'blob') {
    options?.onProgress?.(`Downloading ${target.owner}/${target.repo}/${target.path}`)
    return fetchGithubBlob(target)
  }

  options?.onProgress?.(`Scanning ${target.owner}/${target.repo}`)
  return fetchGithubTree(target, options)
}

const fetchGithubBlob = async (target: GithubBlobTarget): Promise<FileContext[]> => {
  const rawPath = buildRawPath(target.path)
  const rawUrl = `${GITHUB_RAW_BASE}/${target.owner}/${target.repo}/${encodeURIComponent(target.ref)}/${rawPath}`

  let response: Response
  try {
    response = await fetchWithTimeout(rawUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown fetch error.'
    console.warn(`Warning: Failed to download ${target.path}: ${message}`)
    return []
  }

  if (!response.ok) {
    console.warn(`Warning: Failed to download ${target.path} (HTTP ${response.status}).`)
    return []
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (!isWithinSize(buffer)) {
    console.warn(
      `Warning: ${target.path} is ${Math.round(buffer.byteLength / 1024)} KB (> ${
        MAX_GITHUB_FILE_BYTES / 1024
      } KB limit). Skipping.`,
    )
    return []
  }

  if (isBinary(buffer)) {
    console.warn(`Warning: ${target.path} appears to be binary. Skipping.`)
    return []
  }

  return [
    {
      path: `github:${target.owner}/${target.repo}/${target.path}`,
      content: buffer.toString('utf8'),
    },
  ]
}

const fetchGithubTree = async (
  target: GithubTreeTarget,
  options?: ResolveGithubOptions,
): Promise<FileContext[]> => {
  const treeUrl = `${GITHUB_API_BASE}/repos/${target.owner}/${target.repo}/git/trees/${encodeURIComponent(
    target.ref,
  )}?recursive=1`

  let response: Response
  try {
    response = await fetchWithTimeout(treeUrl, { headers: apiHeaders(true) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown GitHub error.'
    console.warn(`Warning: Failed to list ${target.owner}/${target.repo}: ${message}`)
    return []
  }

  if (!response.ok) {
    console.warn(`Warning: GitHub tree request failed with ${response.status}.`)
    return []
  }

  const payload = (await response.json()) as GithubTreeResponse
  const treeEntries = payload.tree ?? []

  const targetPath = target.path
  const pathPrefix =
    typeof targetPath === 'string' && targetPath.length > 0
      ? withTrailingSlash(targetPath)
      : undefined

  const filtered = treeEntries
    .filter((entry) => entry.type === 'blob')
    .filter((entry) => !pathPrefix || entry.path.startsWith(pathPrefix))
    .filter((entry) => !matchesIgnore(entry.path))
    .filter((entry) => typeof entry.size !== 'number' || entry.size <= MAX_GITHUB_FILE_BYTES)
    .slice(0, MAX_GITHUB_FILES)

  if (filtered.length === 0) {
    console.warn(`Warning: No eligible files found in ${target.owner}/${target.repo}.`)
    return []
  }

  const files: FileContext[] = []

  for (const entry of filtered) {
    options?.onProgress?.(`Fetching ${entry.path}`)
    const content = await fetchFileContent(target, entry.path, target.ref)
    if (!content) {
      continue
    }
    files.push({ path: `github:${target.owner}/${target.repo}/${entry.path}`, content })
    if (files.length >= MAX_GITHUB_FILES) {
      break
    }
  }

  return files
}

const fetchFileContent = async (
  target: GithubTreeTarget,
  path: string,
  ref: string,
): Promise<string | null> => {
  const encodedPath = encodeGithubPath(path)
  const contentsUrl = `${GITHUB_API_BASE}/repos/${target.owner}/${target.repo}/contents/${encodedPath}?ref=${encodeURIComponent(
    ref,
  )}`

  let response: Response
  try {
    response = await fetchWithTimeout(contentsUrl, { headers: apiHeaders() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown download error.'
    console.warn(`Warning: Failed to download ${path}: ${message}`)
    return null
  }

  if (!response.ok) {
    console.warn(`Warning: Failed to download ${path} (HTTP ${response.status}).`)
    return null
  }

  const json = (await response.json()) as GithubContentResponse
  if (json.encoding !== 'base64' || !json.content) {
    console.warn(`Warning: Unexpected content response for ${path}.`)
    return null
  }

  const buffer = Buffer.from(json.content, 'base64')
  if (!isWithinSize(buffer) || isBinary(buffer)) {
    return null
  }

  return buffer.toString('utf8')
}

const fetchWithTimeout = async (url: string, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GITHUB_FETCH_TIMEOUT_MS)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': 'prompt-maker-cli',
        ...(init?.headers ?? {}),
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

const parseGithubUrl = (url: URL): GithubTarget | null => {
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length < 2) {
    return null
  }

  const owner = segments[0]
  const rawRepo = segments[1]
  if (!owner || !rawRepo) {
    return null
  }

  const type = segments[2]
  const ref = segments[3]
  const rest = segments.slice(4)
  const repo = sanitizeRepo(rawRepo)

  if (!type) {
    return { kind: 'tree', owner, repo, ref: 'HEAD' }
  }

  if (type === 'blob') {
    if (!ref || rest.length === 0) {
      return null
    }
    return { kind: 'blob', owner, repo, ref, path: rest.join('/') }
  }

  if (type === 'tree') {
    if (!ref) {
      return null
    }
    const joined = rest.join('/')
    if (joined) {
      return { kind: 'tree', owner, repo, ref, path: joined }
    }
    return { kind: 'tree', owner, repo, ref }
  }

  if (!ref) {
    return { kind: 'tree', owner, repo, ref: 'HEAD' }
  }

  return null
}

const matchesIgnore = (path: string): boolean =>
  IGNORE_PATTERNS.some((pattern) => pattern.test(path))

const withTrailingSlash = (value: string): string => (value.endsWith('/') ? value : `${value}/`)

const isWithinSize = (buffer: Buffer): boolean => buffer.byteLength <= MAX_GITHUB_FILE_BYTES

const isBinary = (buffer: Buffer): boolean => {
  if (buffer.includes(0)) {
    return true
  }
  let printable = 0
  for (const byte of buffer) {
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126)) {
      printable += 1
    }
  }
  return printable / buffer.length < 0.8
}

const buildRawPath = (path: string): string => path.split('/').map(encodeURIComponent).join('/')

const encodeGithubPath = (path: string): string => path.split('/').map(encodeURIComponent).join('/')

const apiHeaders = (json?: boolean): HeadersInit => {
  const headers: Record<string, string> = {
    'User-Agent': 'prompt-maker-cli',
  }

  if (json) {
    headers.accept = 'application/vnd.github+json'
  }

  const token = process.env.GITHUB_TOKEN?.trim()
  if (token) {
    headers.authorization = `Bearer ${token}`
  }

  return headers
}

const sanitizeRepo = (repo: string): string => (repo.endsWith('.git') ? repo.slice(0, -4) : repo)
