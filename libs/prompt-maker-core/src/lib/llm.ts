type Message = { role: 'system' | 'user'; content: string }

type ChatCompletionMessage = Message | { role: 'assistant'; content: string }

type ChatCompletionChoice = {
  index: number
  message: ChatCompletionMessage
}

type ChatCompletionResponse = {
  choices: ChatCompletionChoice[]
}

type GeminiContentPart = { text: string }

type GeminiContent = {
  role: 'user' | 'model' | 'system'
  parts: GeminiContentPart[]
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? process.env.GEMINI_MODEL ?? 'gpt-5.1-codex'
const OPENAI_ENDPOINT = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1/chat/completions'
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com'

export const callLLM = async (
  messages: Message[],
  model: string = DEFAULT_MODEL,
): Promise<string> => {
  const provider = resolveProvider(model)

  if (provider === 'gemini') {
    return callGemini(messages, model)
  }

  return callOpenAI(messages, model)
}

const resolveProvider = (model: string): 'openai' | 'gemini' => {
  if (model.trim().toLowerCase().startsWith('gemini')) {
    return 'gemini'
  }
  return 'openai'
}

const callOpenAI = async (messages: Message[], model: string): Promise<string> => {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY env var is not set.')
  }

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages,
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`OpenAI request failed with status ${response.status}: ${details}`)
  }

  const data = (await response.json()) as ChatCompletionResponse
  const content = data.choices?.[0]?.message?.content?.trim()

  if (!content) {
    throw new Error('OpenAI response did not include assistant content.')
  }

  return content
}

const callGemini = async (messages: Message[], model: string): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY env var is not set.')
  }

  const endpointBase = GEMINI_BASE_URL.replace(/\/$/, '')
  const url = `${endpointBase}/v1beta/models/${model}:generateContent?key=${apiKey}`
  const body = buildGeminiRequestBody(messages)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Gemini request failed with status ${response.status}: ${details}`)
  }

  const data = (await response.json()) as GeminiResponse
  const content = extractGeminiText(data)

  if (!content) {
    throw new Error('Gemini response did not include text content.')
  }

  return content
}

const buildGeminiRequestBody = (
  messages: Message[],
): {
  contents: GeminiContent[]
  systemInstruction?: GeminiContent
  generationConfig: { temperature: number }
} => {
  const systemMessages = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content.trim())
    .filter(Boolean)

  const contents: GeminiContent[] = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: message.content }],
    }))

  if (contents.length === 0) {
    throw new Error('Gemini requests require at least one user message.')
  }

  const payload: {
    contents: GeminiContent[]
    systemInstruction?: GeminiContent
    generationConfig: { temperature: number }
  } = {
    contents,
    generationConfig: { temperature: 0.2 },
  }

  if (systemMessages.length > 0) {
    payload.systemInstruction = {
      role: 'system',
      parts: [{ text: systemMessages.join('\n\n') }],
    }
  }

  return payload
}

const extractGeminiText = (response: GeminiResponse): string | null => {
  const firstCandidate = response.candidates?.[0]
  const parts = firstCandidate?.content?.parts ?? []
  const text = parts
    .map((part) => part.text ?? '')
    .join('')
    .trim()

  return text || null
}

export type { Message }
