import path from 'node:path'

import {
  discoverDirectorySuggestions,
  discoverFileSuggestions,
  discoverIntentFileSuggestions,
  type DiscoverDirectorySuggestionsOptions,
  type DiscoverFileSuggestionsOptions,
  type DiscoverIntentFileSuggestionsOptions,
} from '../file-suggestions'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.avi', '.mpeg', '.mpg', '.gif'])

export const scanFileSuggestions = async (
  options: DiscoverFileSuggestionsOptions = {},
): Promise<string[]> => discoverFileSuggestions(options)

export const scanImageSuggestions = async (
  options: DiscoverFileSuggestionsOptions = {},
): Promise<string[]> => {
  const suggestions = await discoverFileSuggestions(options)
  return suggestions.filter((candidate) => {
    const ext = path.extname(candidate).toLowerCase()
    return IMAGE_EXTENSIONS.has(ext)
  })
}

export const scanVideoSuggestions = async (
  options: DiscoverFileSuggestionsOptions = {},
): Promise<string[]> => {
  const suggestions = await discoverFileSuggestions(options)
  return suggestions.filter((candidate) => {
    const ext = path.extname(candidate).toLowerCase()
    return VIDEO_EXTENSIONS.has(ext)
  })
}

export const scanSmartSuggestions = async (
  options: DiscoverDirectorySuggestionsOptions = {},
): Promise<string[]> => discoverDirectorySuggestions(options)

export const scanIntentSuggestions = async (
  options: DiscoverIntentFileSuggestionsOptions = {},
): Promise<string[]> => discoverIntentFileSuggestions(options)
