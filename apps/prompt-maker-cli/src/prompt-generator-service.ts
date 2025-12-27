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

export const GEN_SYSTEM_PROMPT = META_PROMPT

export const REFINE_SYSTEM_PROMPT = `
You are an expert Prompt Engineer refining an existing prompt based on user feedback. The result must remain a prompt contract for another assistant, never the finished work.
${PROMPT_CONTRACT_REQUIREMENTS}

Response Format:
You must output a valid JSON object with exactly two keys:
1. "reasoning": A string explaining how you interpreted the refinement instructions and intent.
2. "prompt": The fully updated prompt text, preserving useful structure from the prior draft.

Do not output any text outside of this JSON object.
`

export const SERIES_SYSTEM_PROMPT = `
You are a Lead Architect Agent. Decompose the user's intent into a cohesive plan consisting of:
- One overview prompt that frames the entire effort.
- A sequence of atomic prompts that can be executed and tested independently.

Atomic Prompt Standards (non-negotiable):
- Standalone rule (critical): Every atomic prompt must be fully self-contained. Do NOT reference any other prompt, step number, or earlier/later content.
  - Forbidden examples include: "as above", "previous step", "prior step", "earlier step", "from step 2", "in step 3", "see step 1", "continue from step".
  - If a prompt depends on earlier work, express the dependency as "Expected Repo State" / "Prerequisites" using concrete artifacts (file paths, exported functions/types, UI elements), never by referencing another prompt.
  - Include a short re-entry check: "If this is already implemented, verify and skip to Validation".
- Single outcome: Each atomic prompt must target exactly one verifiable state change.
- Completeness: Each atomic prompt must include all context, assumptions, file paths, commands, and acceptance criteria needed to execute the step in a fresh session.
- Validation required: Each atomic prompt must end with a "Validation" section describing concrete commands + expected outcomes.

Required Atomic Prompt Structure (must appear in EACH atomic prompt content, in this order):
- # Title
- Role
- Context
- Goals & Tasks
- Inputs
- Constraints
- Execution Plan
- Output Format
- Validation

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

export const SERIES_REPAIR_SYSTEM_PROMPT = `
You are a Prompt Repair Agent.

You will be given:
- The user's intent
- A previously generated SeriesResponse JSON payload
- A validation error describing what is non-compliant

Your task:
- Return a corrected SeriesResponse JSON payload (same schema) that passes validation.
- Preserve the overall plan and keep the number/order of atomicPrompts the same unless the validation error explicitly indicates the shape is invalid.
- Fix any missing required sections in atomic prompt content.
- Remove ALL cross-references between prompts. Do NOT mention any other step/prompt number.
  - If a prompt depends on earlier work, restate the dependency as "Expected Repo State" / "Prerequisites" using concrete artifacts (file paths, exported functions/types, UI elements), not step references.
  - Add a re-entry instruction (e.g., "If already implemented, verify and skip to Validation") inside the prompt content.
- Ensure each atomic prompt ends with a "Validation" section containing concrete checks.

Return strict JSON only. Do not wrap in markdown fences. Do not perform the work yourself.
`

export type UploadState = 'start' | 'finish'
export type UploadDetail = { kind: 'image' | 'video'; filePath: string }
export type UploadStateChange = (state: UploadState, detail: UploadDetail) => void

export type SeriesRepairAttemptDetail = {
  attempt: number
  maxAttempts: number
  validationError: string
}

export type PromptGenerationRequest = {
  intent: string
  model: string
  targetModel: string
  fileContext: FileContext[]
  images: string[]
  videos: string[]
  metaInstructions?: string
  previousPrompt?: string
  refinementInstruction?: string
  onUploadStateChange?: UploadStateChange
  onSeriesRepairAttempt?: (detail: SeriesRepairAttemptDetail) => void
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

export type PromptGenerationResult = {
  prompt: string
  reasoning?: string
}

export class PromptGeneratorService {
  async generatePromptDetailed(request: PromptGenerationRequest): Promise<PromptGenerationResult> {
    await ensureModelCredentials(request.model)

    const isRefinement = Boolean(request.previousPrompt && request.refinementInstruction)
    const systemContent = isRefinement ? REFINE_SYSTEM_PROMPT : GEN_SYSTEM_PROMPT

    let userContent: MessageContent
    if (isRefinement) {
      const previousPrompt = request.previousPrompt
      const refinementInstruction = request.refinementInstruction
      if (!previousPrompt || !refinementInstruction) {
        throw new Error('Refinement requests require previousPrompt and refinementInstruction.')
      }

      userContent = await buildRefinementMessage(
        previousPrompt,
        refinementInstruction,
        request.intent,
        request.fileContext,
        request.images,
        request.videos,
        request.metaInstructions,
        request.onUploadStateChange,
      )
    } else {
      userContent = await buildInitialUserMessage(
        request.intent,
        request.fileContext,
        request.images,
        request.videos,
        request.metaInstructions,
        request.onUploadStateChange,
      )
    }

    const targetGuidance = buildTargetRuntimeModelGuidance(request.targetModel)

    const messages: Message[] = [
      { role: 'system', content: systemContent },
      ...(targetGuidance ? [{ role: 'system' as const, content: targetGuidance }] : []),
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

      const sanitizedPrompt = sanitizePromptForTargetModelLeakage({
        prompt: result.prompt,
        intent: request.intent,
        targetModel: request.targetModel,
      })

      return {
        prompt: sanitizedPrompt,
        ...(result.reasoning ? { reasoning: result.reasoning } : {}),
      }
    } catch {
      return {
        prompt: sanitizePromptForTargetModelLeakage({
          prompt: rawResponse,
          intent: request.intent,
          targetModel: request.targetModel,
        }),
      }
    }
  }

  async generatePrompt(request: PromptGenerationRequest): Promise<string> {
    const result = await this.generatePromptDetailed(request)
    return result.prompt
  }

  async generatePromptSeries(request: PromptGenerationRequest): Promise<SeriesResponse> {
    await ensureModelCredentials(request.model)

    const userContent = await buildSeriesUserMessage(
      request.intent,
      request.fileContext,
      request.images,
      request.videos,
      request.metaInstructions,
      request.onUploadStateChange,
    )

    const targetGuidance = buildTargetRuntimeModelGuidance(request.targetModel)

    const messages: Message[] = [
      { role: 'system', content: SERIES_SYSTEM_PROMPT },
      ...(targetGuidance ? [{ role: 'system' as const, content: targetGuidance }] : []),
      { role: 'user', content: userContent },
    ]

    const MAX_SERIES_REPAIR_ATTEMPTS = 2

    const isRepairableSeriesValidationError = (error: unknown): boolean => {
      const message = error instanceof Error ? error.message : String(error)
      return (
        message.startsWith('Atomic prompt ') &&
        (message.includes('missing required section(s)') ||
          message.includes('contains forbidden cross-reference phrase') ||
          message.includes('is missing a title') ||
          message.includes('is missing content'))
      )
    }

    const buildSeriesRepairUserMessage = (options: {
      intent: string
      validationError: string
      previousSeries: SeriesResponse
    }): string => {
      return [
        `User Intent:\n${options.intent.trim()}`,
        '',
        `Validation Error:\n${options.validationError.trim()}`,
        '',
        'Previous SeriesResponse JSON:',
        JSON.stringify(options.previousSeries, null, 2),
        '',
        'Return a corrected SeriesResponse JSON payload now.',
      ].join('\n')
    }

    let rawResponse = await callLLM(messages, request.model)

    let series: SeriesResponse
    try {
      series = parseLLMJson<SeriesResponse>(rawResponse)
    } catch {
      throw new Error('LLM did not return valid SeriesResponse JSON.')
    }

    for (let attempt = 0; attempt <= MAX_SERIES_REPAIR_ATTEMPTS; attempt++) {
      try {
        validateSeriesResponse(series)
        break
      } catch (error) {
        if (attempt === MAX_SERIES_REPAIR_ATTEMPTS || !isRepairableSeriesValidationError(error)) {
          throw error
        }

        const validationError = error instanceof Error ? error.message : String(error)

        request.onSeriesRepairAttempt?.({
          attempt: attempt + 1,
          maxAttempts: MAX_SERIES_REPAIR_ATTEMPTS,
          validationError,
        })

        const repairUserContent = buildSeriesRepairUserMessage({
          intent: request.intent,
          validationError,
          previousSeries: series,
        })

        const repairMessages: Message[] = [
          { role: 'system', content: SERIES_REPAIR_SYSTEM_PROMPT },
          ...(targetGuidance ? [{ role: 'system' as const, content: targetGuidance }] : []),
          { role: 'user', content: repairUserContent },
        ]

        rawResponse = await callLLM(repairMessages, request.model)

        try {
          series = parseLLMJson<SeriesResponse>(rawResponse)
        } catch {
          throw new Error('LLM did not return valid SeriesResponse JSON.')
        }
      }
    }

    const sanitizedOverviewPrompt = sanitizePromptForTargetModelLeakage({
      prompt: series.overviewPrompt,
      intent: request.intent,
      targetModel: request.targetModel,
    })

    const sanitizedAtomicPrompts = series.atomicPrompts.map((step) => ({
      ...step,
      content: sanitizePromptForTargetModelLeakage({
        prompt: step.content,
        intent: request.intent,
        targetModel: request.targetModel,
      }),
    }))

    if (process.env.DEBUG || process.env.VERBOSE) {
      console.error('\n--- Series Reasoning ---')
      console.error(series.reasoning)
      console.error('------------------------\n')
    }

    return {
      ...series,
      overviewPrompt: sanitizedOverviewPrompt,
      atomicPrompts: sanitizedAtomicPrompts,
    }
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

const TARGET_RUNTIME_MODEL_PHRASE_REGEX = /target runtime model/i

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const sanitizePromptForTargetModelLeakage = ({
  prompt,
  intent,
  targetModel,
}: {
  prompt: string
  intent: string
  targetModel: string
}): string => {
  const normalizedTargetModel = targetModel.trim()
  if (!normalizedTargetModel) {
    return prompt
  }

  const normalizedIntent = intent.trim().toLowerCase()
  const normalizedTargetLower = normalizedTargetModel.toLowerCase()
  if (normalizedIntent.includes(normalizedTargetLower)) {
    return prompt
  }

  const normalizedPromptLower = prompt.toLowerCase()
  if (
    !TARGET_RUNTIME_MODEL_PHRASE_REGEX.test(prompt) &&
    !normalizedPromptLower.includes(normalizedTargetLower)
  ) {
    return prompt
  }

  const withoutTargetModelLines = prompt
    .split('\n')
    .filter((line) => !TARGET_RUNTIME_MODEL_PHRASE_REGEX.test(line))
    .join('\n')

  const targetRegex = new RegExp(escapeRegExp(normalizedTargetModel), 'gi')
  const withoutTargetMentions = withoutTargetModelLines.replace(targetRegex, '')

  const cleaned = withoutTargetMentions
    .split('\n')
    .map((line) =>
      line
        .replace(/\*\*\s*\*\*/g, '')
        .replace(/[ \t]{2,}/g, ' ')
        .trimEnd(),
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')

  return cleaned.trim()
}

const buildTargetRuntimeModelGuidance = (targetModel: string): string => {
  const normalized = targetModel.trim()
  if (!normalized) {
    return ''
  }

  return [
    'Internal Optimization Target (do not include in output):',
    `- targetRuntimeModel: ${normalized}`,
    '',
    'Rules (non-negotiable):',
    '- Use the target runtime model only to tune the contract for compliance, clarity, and formatting expectations.',
    '- Do NOT mention or output the target runtime model id/label/name anywhere in the returned prompt text.',
    '- Do NOT include phrases like "Target runtime model" / "Target Runtime Model" in the returned prompt text.',
    '- Only include the target model id/label/name if the user intent explicitly asks to mention it.',
  ].join('\n')
}

const buildInitialUserMessage = async (
  intent: string,
  files: FileContext[],
  imagePaths: string[],
  videoPaths: string[],
  metaInstructions?: string,
  onUploadStateChange?: UploadStateChange,
): Promise<MessageContent> => {
  const sections: string[] = []

  if (files.length > 0) {
    sections.push('Context Files:\n' + formatContextForPrompt(files))
  }

  sections.push(`User Intent:\n${intent.trim()}`)

  const trimmedInstructions = metaInstructions?.trim()
  if (trimmedInstructions) {
    sections.push(`Meta-Instructions:\n${trimmedInstructions}`)
  }

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
  refinementInstruction: string,
  intent: string,
  files: FileContext[],
  imagePaths: string[],
  videoPaths: string[],
  metaInstructions?: string,
  onUploadStateChange?: UploadStateChange,
): Promise<MessageContent> => {
  const sections: string[] = []

  if (files.length > 0) {
    sections.push('Context Files:\n' + formatContextForPrompt(files))
  }

  sections.push(`Original Intent (for reference):\n${intent.trim()}`)
  sections.push(`Current Prompt Draft:\n${previousPrompt}`)
  sections.push(`Refinement Instruction:\n${refinementInstruction.trim()}`)

  const trimmedInstructions = metaInstructions?.trim()
  if (trimmedInstructions) {
    sections.push(`Meta-Instructions:\n${trimmedInstructions}`)
  }

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
  metaInstructions?: string,
  onUploadStateChange?: UploadStateChange,
): Promise<MessageContent> => {
  const sections: string[] = []

  if (files.length > 0) {
    sections.push('Context Files:\n' + formatContextForPrompt(files))
  }

  sections.push(`User Intent:\n${intent.trim()}`)

  const trimmedInstructions = metaInstructions?.trim()
  if (trimmedInstructions) {
    sections.push(`Meta-Instructions:\n${trimmedInstructions}`)
  }

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

const REQUIRED_ATOMIC_PROMPT_SECTIONS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: '# Title', pattern: /^#\s*Title\b/im },
  { label: 'Role', pattern: /^(?:#{1,6}\s*)?Role\b/im },
  { label: 'Context', pattern: /^(?:#{1,6}\s*)?Context\b/im },
  {
    label: 'Goals & Tasks',
    pattern: /^(?:#{1,6}\s*)?Goals\s*(?:&|and)\s*Tasks\b/im,
  },
  { label: 'Inputs', pattern: /^(?:#{1,6}\s*)?Inputs\b/im },
  { label: 'Constraints', pattern: /^(?:#{1,6}\s*)?Constraints\b/im },
  { label: 'Execution Plan', pattern: /^(?:#{1,6}\s*)?Execution\s+Plan\b/im },
  { label: 'Output Format', pattern: /^(?:#{1,6}\s*)?Output\s+Format\b/im },
  { label: 'Validation', pattern: /^(?:#{1,6}\s*)?Validation\b/im },
]

const FORBIDDEN_CROSS_REFERENCE_PATTERNS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: '"as above"', pattern: /\bas above\b/i },
  { label: '"as mentioned earlier"', pattern: /\bas mentioned earlier\b/i },
  { label: '"as described earlier"', pattern: /\bas described earlier\b/i },
  {
    label: '"previous step" / "prior step" / "earlier step"',
    pattern: /\b(previous|prior|earlier)\s+step\b/i,
  },
  {
    label: '"previous prompt" / "prior prompt" / "earlier prompt"',
    pattern: /\b(previous|prior|earlier)\s+prompt\b/i,
  },
  { label: '"from step N"', pattern: /\bfrom\s+step\s+\d+\b/i },
  { label: '"in step N"', pattern: /\bin\s+step\s+\d+\b/i },
  { label: '"see step N"', pattern: /\bsee\s+step\s+\d+\b/i },
  { label: '"step N above/below"', pattern: /\bstep\s+\d+\s+(above|below)\b/i },
  { label: '"continue from step N"', pattern: /\bcontinue\s+from\s+step\s+\d+\b/i },
]

const findMissingAtomicPromptSections = (content: string): string[] => {
  return REQUIRED_ATOMIC_PROMPT_SECTIONS.filter((section) => !section.pattern.test(content)).map(
    (section) => section.label,
  )
}

const findForbiddenCrossReference = (content: string): string | null => {
  const hit = FORBIDDEN_CROSS_REFERENCE_PATTERNS.find((entry) => entry.pattern.test(content))
  return hit?.label ?? null
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
    const promptNumber = index + 1

    if (!entry || typeof entry !== 'object') {
      throw new Error(`Atomic prompt ${promptNumber} is invalid.`)
    }
    if (typeof entry.title !== 'string' || !entry.title.trim()) {
      throw new Error(`Atomic prompt ${promptNumber} is missing a title.`)
    }
    if (typeof entry.content !== 'string' || !entry.content.trim()) {
      throw new Error(`Atomic prompt ${promptNumber} is missing content.`)
    }

    const missingSections = findMissingAtomicPromptSections(entry.content)
    if (missingSections.length > 0) {
      throw new Error(
        `Atomic prompt ${promptNumber} is missing required section(s): ${missingSections.join(', ')}.`,
      )
    }

    const forbiddenCrossReference = findForbiddenCrossReference(entry.content)
    if (forbiddenCrossReference) {
      throw new Error(
        `Atomic prompt ${promptNumber} contains forbidden cross-reference phrase ${forbiddenCrossReference}. Atomic prompts must be standalone.`,
      )
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
  } catch {
    console.warn('Failed to parse LLM JSON response. Falling back to raw text.')
    throw new Error('LLM did not return valid JSON.')
  }
}
