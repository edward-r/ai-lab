import { callLLM, type Message } from '@prompt-maker/core'

import { loadCliConfig, resolveGeminiCredentials, resolveOpenAiCredentials } from './config'
import { formatContextForPrompt, type FileContext } from './file-context'

const META_PROMPT =
  "You are an expert Prompt Engineer. Your goal is to take the user's rough notes/intent and convert them into a structured, optimized prompt. You should include sections for Role, Context, Constraints, and Output Format. If the request implies code, suggest a tech stack and file structure. Output ONLY the final prompt text."

export type PromptGenerationRequest = {
  intent: string
  refinements: string[]
  model: string
  fileContext: FileContext[]
}

export class PromptGeneratorService {
  async generatePrompt(request: PromptGenerationRequest): Promise<string> {
    await ensureModelCredentials(request.model)

    const messages: Message[] = [
      { role: 'system', content: META_PROMPT },
      {
        role: 'user',
        content: buildUserMessage(request.intent, request.refinements, request.fileContext),
      },
    ]

    return await callLLM(messages, request.model)
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
  if (isGeminiModel(model)) {
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

const isGeminiModel = (model: string): boolean => model.trim().toLowerCase().startsWith('gemini')

const buildUserMessage = (intent: string, refinements: string[], files: FileContext[]): string => {
  const sections: string[] = []

  if (files.length > 0) {
    sections.push('Context Files:\n' + formatContextForPrompt(files))
  }

  sections.push(`User intent (rough notes):\n${intent.trim()}`)

  refinements.forEach((refinement, index) => {
    sections.push(`Refinement ${index + 1}:\n${refinement.trim()}`)
  })

  sections.push('Return the final structured prompt now.')

  return sections.join('\n\n')
}
