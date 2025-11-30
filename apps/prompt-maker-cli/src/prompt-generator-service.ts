import { callLLM, type Message } from '@prompt-maker/core'

import { loadCliConfig, resolveGeminiCredentials, resolveOpenAiCredentials } from './config'
import { formatContextForPrompt, type FileContext } from './file-context'

const GEN_SYSTEM_PROMPT =
  "You are an expert Prompt Engineer. Analyze the user's intent and context files. " +
  'Structure the output with clear sections: Role, Context, Constraints, and Output Format. ' +
  'Output ONLY the final prompt text.'

const REFINE_SYSTEM_PROMPT =
  'You are an expert Prompt Engineer. You are refining an existing prompt based on user feedback. ' +
  "You will receive the 'Current Prompt' and a 'Refinement Instruction'. " +
  'Modify the prompt to incorporate the feedback while preserving the existing structure where possible. ' +
  'Output ONLY the updated prompt text.'

export type PromptGenerationRequest = {
  intent: string
  model: string
  fileContext: FileContext[]
  previousPrompt?: string
  refinementInstruction?: string
}

export class PromptGeneratorService {
  async generatePrompt(request: PromptGenerationRequest): Promise<string> {
    await ensureModelCredentials(request.model)

    if (request.previousPrompt && request.refinementInstruction) {
      return await this.refinePrompt(request)
    }

    return await this.createInitialPrompt(request)
  }

  private async createInitialPrompt(request: PromptGenerationRequest): Promise<string> {
    const messages: Message[] = [
      { role: 'system', content: GEN_SYSTEM_PROMPT },
      {
        role: 'user',
        content: buildInitialUserMessage(request.intent, request.fileContext),
      },
    ]
    return await callLLM(messages, request.model)
  }

  private async refinePrompt(request: PromptGenerationRequest): Promise<string> {
    const messages: Message[] = [
      { role: 'system', content: REFINE_SYSTEM_PROMPT },
      {
        role: 'user',
        content: buildRefinementMessage(
          request.previousPrompt!,
          request.refinementInstruction!,
          request.intent,
        ),
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

const buildInitialUserMessage = (intent: string, files: FileContext[]): string => {
  const sections: string[] = []

  if (files.length > 0) {
    sections.push('Context Files:\n' + formatContextForPrompt(files))
  }

  sections.push(`User Intent:\n${intent.trim()}`)
  sections.push('Return the final structured prompt now.')

  return sections.join('\n\n')
}

const buildRefinementMessage = (
  previousPrompt: string,
  instruction: string,
  originalIntent: string,
): string => {
  return [
    `Original Intent (for reference):\n${originalIntent}`,
    '---',
    `Current Prompt Draft:\n${previousPrompt}`,
    '---',
    `Refinement Instruction:\n${instruction}`,
    '---',
    'Return the fully updated prompt text.',
  ].join('\n\n')
}
