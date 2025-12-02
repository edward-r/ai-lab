import { htmlToText } from 'html-to-text'

import type { FileContext } from './file-context'
import { resolveGithubUrl } from './github-context'

export const MAX_HTML_BYTES = 1 * 1024 * 1024
const URL_FETCH_TIMEOUT_MS = 15_000

export type ResolveUrlContextOptions = {
  onProgress?: (message: string) => void
}

export const resolveUrlContext = async (
  urls: string[],
  options?: ResolveUrlContextOptions,
): Promise<FileContext[]> => {
  if (urls.length === 0) {
    return []
  }

  const entries: FileContext[] = []
  const seen = new Set<string>()

  for (const raw of urls) {
    const trimmed = raw?.trim()
    if (!trimmed || seen.has(trimmed)) {
      continue
    }

    seen.add(trimmed)

    let parsed: URL
    try {
      parsed = new URL(trimmed)
    } catch {
      console.warn(`Warning: Skipping invalid URL "${trimmed}".`)
      continue
    }

    if (!/^https?:$/.test(parsed.protocol)) {
      console.warn(
        `Warning: Unsupported protocol for ${parsed.href}. Only HTTP(S) URLs are allowed.`,
      )
      continue
    }

    if (isGithubHost(parsed.host)) {
      try {
        const githubFiles = await resolveGithubUrl(parsed, options)
        if (githubFiles.length === 0) {
          continue
        }
        entries.push(...githubFiles)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown GitHub error.'
        console.warn(`Warning: Failed to fetch GitHub URL ${parsed.href}: ${message}`)
      }
      continue
    }

    options?.onProgress?.(`Downloading ${parsed.href}`)
    const file = await fetchGenericUrl(parsed)
    if (file) {
      entries.push(file)
    }
  }

  return entries
}

const fetchGenericUrl = async (url: URL): Promise<FileContext | null> => {
  try {
    const response = await fetchWithTimeout(url.href)

    if (!response.ok) {
      console.warn(`Warning: ${url.href} responded with ${response.status}. Skipping.`)
      return null
    }

    const contentLengthHeader = response.headers.get('content-length')
    if (contentLengthHeader) {
      const declaredLength = Number(contentLengthHeader)
      if (!Number.isNaN(declaredLength) && declaredLength > MAX_HTML_BYTES) {
        console.warn(
          `Warning: ${url.href} is ${Math.round(declaredLength / 1024)} KB which exceeds the ${
            MAX_HTML_BYTES / 1024
          } KB limit. Skipping.`,
        )
        return null
      }
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength > MAX_HTML_BYTES) {
      console.warn(
        `Warning: ${url.href} exceeded the ${MAX_HTML_BYTES / 1024} KB limit while downloading. Skipping.`,
      )
      return null
    }

    const html = buffer.toString('utf8')
    const text = extractText(html)
    if (!text) {
      console.warn(`Warning: ${url.href} did not contain readable text.`)
      return null
    }

    return {
      path: `url:${url.href}`,
      content: text,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown fetch error.'
    console.warn(`Warning: Failed to download ${url.href}: ${message}`)
    return null
  }
}

const extractText = (html: string): string => {
  const text = htmlToText(html, {
    wordwrap: false,
    preserveNewlines: true,
    selectors: [
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'noscript', format: 'inline' },
    ],
  })
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return text
}

const fetchWithTimeout = async (url: string): Promise<Response> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS)

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'prompt-maker-cli',
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

const isGithubHost = (host: string): boolean => {
  const normalized = host.toLowerCase()
  return normalized === 'github.com' || normalized === 'www.github.com'
}
