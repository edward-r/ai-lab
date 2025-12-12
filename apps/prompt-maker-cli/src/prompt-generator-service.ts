import { callLLM, type Message, type MessageContent, type VideoPart } from '@prompt-maker/core'

import { loadCliConfig, resolveGeminiCredentials, resolveOpenAiCredentials } from './config'
import { formatContextForPrompt, type FileContext } from './file-context'
import { resolveImageParts } from './image-loader'
import { inferVideoMimeType, uploadFileForGemini } from './media-loader'
import { isGeminiModelId } from './model-providers'

const PROMPT_CONTRACT_REQUIREMENTS = `
Prompt Contract Requirements:
1. Start with a concise "# Title" summarizing the requested deliverable.
2. Include the following sections in order, each with actionable markdown content:
   "Role", "Context", "Goals & Tasks", "Inputs", "Constraints", "Execution Plan",
   "Output Format", "Quality Checks".
3. Reference any provided context files or inputs explicitly when relevant (e.g., file paths).
4. Use bullet lists or short paragraphs; keep instructions concrete and testable.
5. Do NOT execute the task or provide the final deliverable—only craft instructions for another assistant.
`

const META_PROMPT = `
You are an expert Prompt Engineer. Your goal is to convert the user's intent into an optimized prompt contract that another assistant will later execute.
${PROMPT_CONTRACT_REQUIREMENTS}

Response Format:
You must output a valid JSON object with exactly two keys:
1. "reasoning": A string containing your step-by-step analysis of the user's intent, missing details, and strategy.
2. "prompt": The final, polished prompt text (including all markdown formatting).

Do not output any text outside of this JSON object.
`

const GEN_SYSTEM_PROMPT = META_PROMPT

const REFINE_SYSTEM_PROMPT = `
You are an expert Prompt Engineer refining an existing prompt based on user feedback. The result must remain a prompt contract for another assistant, never the finished work.
${PROMPT_CONTRACT_REQUIREMENTS}

Response Format:
You must output a valid JSON object with exactly two keys:
1. "reasoning": A string explaining how you interpreted the refinement instructions and intent.
2. "prompt": The fully updated prompt text, preserving useful structure from the prior draft.

Do not output any text outside of this JSON object.
`

const SERIES_SYSTEM_PROMPT = `
You are a Lead Architect Agent. Decompose the user's intent into a cohesive plan consisting of:
- One overview prompt that frames the entire effort.
- A sequence of atomic prompts that can be executed and tested independently.

Atomic Prompt Standards:
- Every atomic prompt must be self-contained—never rely on text from previous steps.
- Each atomic prompt must target a single, verifiable state change.
- Each atomic prompt must end with a "Validation" section describing how a human can confirm the work is complete.

Return strict JSON matching this schema (do not wrap in markdown fences):
{
  "reasoning": string,
  "overviewPrompt": string,
  "atomicPrompts": [
    { "title": string, "content": string },
    { "title": string, "content": string }
  ]
}

Do not perform the work yourself. Only return the JSON payload described above.
`

export type UploadState = 'start' | 'finish'
export type UploadDetail = { kind: 'image' | 'video'; filePath: string }
export type UploadStateChange = (state: UploadState, detail: UploadDetail) => void

export type PromptGenerationRequest = {
  intent: string
  model: string
  fileContext: FileContext[]
  images: string[]
  videos: string[]
  previousPrompt?: string
  refinementInstruction?: string
  onUploadStateChange?: UploadStateChange
}

type CoTResponse = {
  reasoning: string
  prompt: string
}

export type SeriesResponse = {
  reasoning: string
  overviewPrompt: string
  atomicPrompts: Array<{ title: string; content: string }>
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
          request.onUploadStateChange,
        )
      : await buildInitialUserMessage(
          request.intent,
          request.fileContext,
          request.images,
          request.videos,
          request.onUploadStateChange,
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

  async generatePromptSeries(request: PromptGenerationRequest): Promise<SeriesResponse> {
    await ensureModelCredentials(request.model)

    const userContent = await buildSeriesUserMessage(
      request.intent,
      request.fileContext,
      request.images,
      request.videos,
      request.onUploadStateChange,
    )

    const messages: Message[] = [
      { role: 'system', content: SERIES_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ]

    const rawResponse = await callLLM(messages, request.model)

    let series: SeriesResponse
    try {
      series = parseLLMJson<SeriesResponse>(rawResponse)
    } catch (error) {
      throw new Error('LLM did not return valid SeriesResponse JSON.')
    }

    validateSeriesResponse(series)

    if (process.env.DEBUG || process.env.VERBOSE) {
      console.error('\n--- Series Reasoning ---')
      console.error(series.reasoning)
      console.error('------------------------\n')
    }

    return series
  }
}

export const createPromptGeneratorService = async (): Promise<PromptGeneratorService> => {
  return new PromptGeneratorService()
}

export const generatePromptSeries = async (
  request: PromptGenerationRequest,
): Promise<SeriesResponse> => {
  const service = await createPromptGeneratorService()
  return await service.generatePromptSeries(request)
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

export const isGemini = (model: string): boolean => isGeminiModelId(model)

const buildInitialUserMessage = async (
  intent: string,
  files: FileContext[],
  imagePaths: string[],
  videoPaths: string[],
  onUploadStateChange?: UploadStateChange,
): Promise<MessageContent> => {
  const sections: string[] = []

  if (files.length > 0) {
    sections.push('Context Files:\n' + formatContextForPrompt(files))
  }

  sections.push(`User Intent:\n${intent.trim()}`)
  sections.push(
    [
      'Return the final structured prompt contract now.',
      'Do NOT perform the task yourself; only craft instructions for another assistant using the required sections.',
    ].join(' '),
  )

  const text = sections.join('\n\n')
  return await mergeMediaWithText(text, imagePaths, videoPaths, onUploadStateChange)
}

const buildRefinementMessage = async (
  previousPrompt: string,
  instruction: string,
  originalIntent: string,
  files: FileContext[],
  imagePaths: string[],
  videoPaths: string[],
  onUploadStateChange?: UploadStateChange,
): Promise<MessageContent> => {
  const sections: string[] = []

  if (files.length > 0) {
    sections.push('Context Files:\n' + formatContextForPrompt(files))
  }

  sections.push(`Original Intent (for reference):\n${originalIntent}`)
  sections.push(`Current Prompt Draft:\n${previousPrompt}`)
  sections.push(`Refinement Instruction:\n${instruction}`)
  sections.push(
    [
      'Return the fully updated prompt contract.',
      'Maintain the required sections and continue to avoid performing the task yourself.',
    ].join(' '),
  )

  const text = sections.join('\n\n')
  return await mergeMediaWithText(text, imagePaths, videoPaths, onUploadStateChange)
}

const buildSeriesUserMessage = async (
  intent: string,
  files: FileContext[],
  imagePaths: string[],
  videoPaths: string[],
  onUploadStateChange?: UploadStateChange,
): Promise<MessageContent> => {
  const sections: string[] = []

  if (files.length > 0) {
    sections.push('Context Files:\n' + formatContextForPrompt(files))
  }

  sections.push(`User Intent:\n${intent.trim()}`)
  sections.push(
    [
      'Task:',
      'Design a planning artifact consisting of one overview prompt plus a set of atomic prompts.',
      'Each atomic prompt must be self-contained, target a specific verifiable state change, and include a "Validation" section describing how a human can confirm completion.',
      'Do not perform the tasks; only describe them.',
    ].join(' '),
  )
  sections.push(
    [
      'Output Requirements:',
      'Return strict JSON matching the schema { "reasoning": string, "overviewPrompt": string, "atomicPrompts": Array<{ "title": string; "content": string }> }.',
      'Never wrap the JSON in markdown code fences and never add extra keys.',
    ].join(' '),
  )

  const text = sections.join('\n\n')
  return await mergeMediaWithText(text, imagePaths, videoPaths, onUploadStateChange)
}

const mergeMediaWithText = async (
  text: string,
  imagePaths: string[],
  videoPaths: string[],
  onUploadStateChange?: UploadStateChange,
): Promise<MessageContent> => {
  const [imageParts, videoParts] = await Promise.all([
    resolveImageParts(imagePaths, onUploadStateChange),
    resolveVideoParts(videoPaths, onUploadStateChange),
  ])

  if (imageParts.length === 0 && videoParts.length === 0) {
    return text
  }

  return [...imageParts, ...videoParts, { type: 'text', text }]
}

const resolveVideoParts = async (
  videoPaths: string[],
  onUploadStateChange?: UploadStateChange,
): Promise<VideoPart[]> => {
  const parts: VideoPart[] = []

  for (const videoPath of videoPaths) {
    onUploadStateChange?.('start', { kind: 'video', filePath: videoPath })
    try {
      const fileUri = await uploadFileForGemini(videoPath)
      const mimeType = inferVideoMimeType(videoPath)
      parts.push({ type: 'video_uri', fileUri, mimeType })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown video upload error.'
      console.warn(`Failed to upload video ${videoPath}: ${message}`)
    } finally {
      onUploadStateChange?.('finish', { kind: 'video', filePath: videoPath })
    }
  }

  return parts
}

const validateSeriesResponse = (response: SeriesResponse): void => {
  if (!response || typeof response !== 'object') {
    throw new Error('LLM returned SeriesResponse with invalid shape.')
  }

  if (typeof response.reasoning !== 'string' || !response.reasoning.trim()) {
    throw new Error('Series reasoning is required.')
  }

  if (typeof response.overviewPrompt !== 'string' || !response.overviewPrompt.trim()) {
    throw new Error('Series overviewPrompt is required.')
  }

  if (!Array.isArray(response.atomicPrompts) || response.atomicPrompts.length === 0) {
    throw new Error('Series atomicPrompts must include at least one entry.')
  }

  response.atomicPrompts.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Atomic prompt ${index + 1} is invalid.`)
    }
    if (typeof entry.title !== 'string' || !entry.title.trim()) {
      throw new Error(`Atomic prompt ${index + 1} is missing a title.`)
    }
    if (typeof entry.content !== 'string' || !entry.content.trim()) {
      throw new Error(`Atomic prompt ${index + 1} is missing content.`)
    }
  })
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
