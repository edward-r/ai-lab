import OpenAI from 'openai'
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions'

import { loadCliConfig, resolveOpenAiCredentials } from './config'

const META_PROMPT =
  "You are an expert Prompt Engineer. Your goal is to take the user's rough notes/intent and convert them into a structured, optimized prompt. You should include sections for Role, Context, Constraints, and Output Format. If the request implies code, suggest a tech stack and file structure. Output ONLY the final prompt text."

export type PromptGenerationRequest = {
  intent: string
  refinements: string[]
  model: string
}

export class PromptGeneratorService {
  private readonly client: OpenAI

  constructor(client: OpenAI) {
    this.client = client
  }

  async generatePrompt(request: PromptGenerationRequest): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: request.model,
      temperature: 0.15,
      messages: [
        { role: 'system', content: META_PROMPT },
        { role: 'user', content: buildUserMessage(request.intent, request.refinements) },
      ],
    })

    const content = response.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('OpenAI response did not include assistant content.')
    }

    return normalizeContent(content)
  }
}

export const createPromptGeneratorService = async (): Promise<PromptGeneratorService> => {
  const credentials = await resolveOpenAiCredentials()

  const client = new OpenAI({
    apiKey: credentials.apiKey,
    baseURL: credentials.baseUrl,
  })

  return new PromptGeneratorService(client)
}

export const resolveDefaultGenerateModel = async (): Promise<string> => {
  const config = await loadCliConfig()
  return (
    config?.promptGenerator?.defaultModel?.trim() ||
    process.env.PROMPT_MAKER_GENERATE_MODEL?.trim() ||
    'gpt-4o-mini'
  )
}

type ChatContent = string | ChatCompletionContentPart[] | null

const normalizeContent = (content: ChatContent): string => {
  if (typeof content === 'string') {
    return content.trim()
  }

  if (!Array.isArray(content) || content.length === 0) {
    throw new Error('OpenAI response did not include text content.')
  }

  const text = content
    .map((part: ChatCompletionContentPart) => {
      if (part.type === 'text') {
        return part.text
      }
      return ''
    })
    .join('')
    .trim()

  if (!text) {
    throw new Error('OpenAI response did not include text content.')
  }

  return text
}

const buildUserMessage = (intent: string, refinements: string[]): string => {
  const sections = [`User intent (rough notes):\n${intent.trim()}`]

  refinements.forEach((refinement, index) => {
    sections.push(`Refinement ${index + 1}:\n${refinement.trim()}`)
  })

  sections.push('Return the final structured prompt now.')

  return sections.join('\n\n')
}
