import { callLLM, type Message, type MessageContent, type VideoPart } from '@prompt-maker/core'

import { loadCliConfig, resolveGeminiCredentials, resolveOpenAiCredentials } from './config'
import { formatContextForPrompt, type FileContext } from './file-context'
import { resolveImageParts } from './image-loader'
import { inferVideoMimeType, uploadFileForGemini } from './media-loader'

const META_PROMPT = `
You are an expert Prompt Engineer. Your goal is to convert the user's intent into an optimized prompt.

Response Format:
You must output a valid JSON object with exactly two keys:
1. "reasoning": A string containing your step-by-step analysis of the user's intent, missing details, and strategy.
2. "prompt": The final, polished prompt text (including all markdown formatting).

Do not output any text outside of this JSON object.
`

const GEN_SYSTEM_PROMPT = META_PROMPT

const REFINE_SYSTEM_PROMPT = `
You are an expert Prompt Engineer refining an existing prompt based on user feedback.

Response Format:
You must output a valid JSON object with exactly two keys:
1. "reasoning": A string explaining how you interpreted the refinement instructions and intent.
2. "prompt": The fully updated prompt text, preserving useful structure from the prior draft.

Do not output any text outside of this JSON object.
`

const GEMINI_MODEL_PREFIXES = ['gemini', 'gemma']

export type PromptGenerationRequest = {
  intent: string
  model: string
  fileContext: FileContext[]
  images: string[]
  videos: string[]
  previousPrompt?: string
  refinementInstruction?: string
}

type CoTResponse = {
  reasoning: string
  prompt: string
}

export class PromptGeneratorService {
  async generatePrompt(request: PromptGenerationRequest): Promise<string> {
    await ensureModelCredentials(request.model)

    const isRefinement = Boolean(request.previousPrompt && request.refinementInstruction)
    const systemContent = isRefinement ? REFINE_SYSTEM_PROMPT : GEN_SYSTEM_PROMPT

    const userContent = isRefinement
      ? await buildRefinementMessage(
          request.previousPrompt!,
          request.refinementInstruction!,
          request.intent,
          request.fileContext,
          request.images,
          request.videos,
        )
      : await buildInitialUserMessage(
          request.intent,
          request.fileContext,
          request.images,
          request.videos,
        )

    const messages: Message[] = [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ]

    const rawResponse = await callLLM(messages, request.model)

    try {
      const result = parseLLMJson<CoTResponse>(rawResponse)

      if (process.env.DEBUG || process.env.VERBOSE) {
        console.error('\n--- AI Reasoning ---')
        console.error(result.reasoning)
        console.error('--------------------\n')
      }

      return result.prompt
    } catch (error) {
      return rawResponse
    }
  }
}

export const createPromptGeneratorService = async (): Promise<PromptGeneratorService> => {
  return new PromptGeneratorService()
}

export const resolveDefaultGenerateModel = async (): Promise<string> => {
  const config = await loadCliConfig()
  return (
    config?.promptGenerator?.defaultModel?.trim() ||
    process.env.PROMPT_MAKER_GENERATE_MODEL?.trim() ||
    'gpt-4o-mini'
  )
}

export const ensureModelCredentials = async (model: string): Promise<void> => {
  if (isGemini(model)) {
    if (!process.env.GEMINI_API_KEY) {
      const credentials = await resolveGeminiCredentials()
      process.env.GEMINI_API_KEY = credentials.apiKey
      if (credentials.baseUrl && !process.env.GEMINI_BASE_URL) {
        process.env.GEMINI_BASE_URL = credentials.baseUrl
      }
    }
    return
  }

  if (!process.env.OPENAI_API_KEY) {
    const credentials = await resolveOpenAiCredentials()
    process.env.OPENAI_API_KEY = credentials.apiKey
    if (credentials.baseUrl && !process.env.OPENAI_BASE_URL) {
      process.env.OPENAI_BASE_URL = credentials.baseUrl
    }
  }
}

export const isGemini = (model: string): boolean => {
  const normalized = model.trim().toLowerCase()
  return GEMINI_MODEL_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}

const buildInitialUserMessage = async (
  intent: string,
  files: FileContext[],
  imagePaths: string[],
  videoPaths: string[],
): Promise<MessageContent> => {
  const sections: string[] = []

  if (files.length > 0) {
    sections.push('Context Files:\n' + formatContextForPrompt(files))
  }

  sections.push(`User Intent:\n${intent.trim()}`)
  sections.push('Return the final structured prompt now.')

  const text = sections.join('\n\n')
  return await mergeMediaWithText(text, imagePaths, videoPaths)
}

const buildRefinementMessage = async (
  previousPrompt: string,
  instruction: string,
  originalIntent: string,
  files: FileContext[],
  imagePaths: string[],
  videoPaths: string[],
): Promise<MessageContent> => {
  const sections: string[] = []

  if (files.length > 0) {
    sections.push('Context Files:\n' + formatContextForPrompt(files))
  }

  sections.push(`Original Intent (for reference):\n${originalIntent}`)
  sections.push(`Current Prompt Draft:\n${previousPrompt}`)
  sections.push(`Refinement Instruction:\n${instruction}`)
  sections.push('Return the fully updated prompt text.')

  const text = sections.join('\n\n')
  return await mergeMediaWithText(text, imagePaths, videoPaths)
}

const mergeMediaWithText = async (
  text: string,
  imagePaths: string[],
  videoPaths: string[],
): Promise<MessageContent> => {
  const [imageParts, videoParts] = await Promise.all([
    resolveImageParts(imagePaths),
    resolveVideoParts(videoPaths),
  ])

  if (imageParts.length === 0 && videoParts.length === 0) {
    return text
  }

  return [...imageParts, ...videoParts, { type: 'text', text }]
}

const resolveVideoParts = async (videoPaths: string[]): Promise<VideoPart[]> => {
  const parts: VideoPart[] = []

  for (const videoPath of videoPaths) {
    try {
      const fileUri = await uploadFileForGemini(videoPath)
      const mimeType = inferVideoMimeType(videoPath)
      parts.push({ type: 'video_uri', fileUri, mimeType })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown video upload error.'
      console.warn(`Failed to upload video ${videoPath}: ${message}`)
    }
  }

  return parts
}

const parseLLMJson = <T>(text: string): T => {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned) as T
  } catch (error) {
    console.warn('Failed to parse LLM JSON response. Falling back to raw text.')
    throw new Error('LLM did not return valid JSON.')
  }
}
