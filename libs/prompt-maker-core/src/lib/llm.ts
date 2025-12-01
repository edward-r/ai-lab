export type TextPart = { type: 'text'; text: string }
export type ImagePart = { type: 'image'; mimeType: string; data: string }
export type VideoPart = { type: 'video_uri'; mimeType: string; fileUri: string }
export type MessageContent = string | (TextPart | ImagePart | VideoPart)[]

export type Message = {
  role: 'system' | 'user' | 'assistant'
  content: MessageContent
}

type OpenAIChatMessageContent =
  | string
  | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>

type OpenAIChatCompletionMessage = {
  role: 'system' | 'user' | 'assistant'
  content: OpenAIChatMessageContent
}

type OpenAIResponseContentPart = { type: 'text'; text: string }

type ChatCompletionChoice = {
  index: number
  message: { role: 'assistant'; content: string | OpenAIResponseContentPart[] }
}

type ChatCompletionResponse = {
  choices: ChatCompletionChoice[]
}

type GeminiContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { fileData: { mimeType: string; fileUri: string } }

type GeminiContent = {
  role: 'user' | 'model' | 'system'
  parts: GeminiContentPart[]
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: GeminiContentPart[] } }>
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

  const payloadMessages = messages.map(toOpenAIMessage)

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: payloadMessages,
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`OpenAI request failed with status ${response.status}: ${details}`)
  }

  const data = (await response.json()) as ChatCompletionResponse
  const rawContent = data.choices?.[0]?.message?.content
  const content =
    typeof rawContent === 'string'
      ? rawContent.trim()
      : rawContent
        ? rawContent
            .map((part) => part.text ?? '')
            .join('')
            .trim()
        : ''

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
  const systemMessages = messages.filter((message) => message.role === 'system')

  const contents: GeminiContent[] = messages
    .filter((message) => message.role !== 'system')
    .map((message) => {
      const role = message.role === 'user' ? 'user' : 'model'
      const parts = toGeminiParts(message.content)
      if (parts.length === 0) {
        parts.push({ text: '' })
      }
      return {
        role,
        parts,
      }
    })

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

  const systemParts = systemMessages.flatMap((message) => toGeminiParts(message.content))

  if (systemParts.length > 0) {
    payload.systemInstruction = {
      role: 'system',
      parts: systemParts,
    }
  }

  return payload
}

const extractGeminiText = (response: GeminiResponse): string | null => {
  const firstCandidate = response.candidates?.[0]
  const parts = firstCandidate?.content?.parts ?? []
  const text = parts
    .map((part) => ('text' in part ? (part.text ?? '') : ''))
    .join('')
    .trim()

  return text || null
}

const toOpenAIMessage = (message: Message): OpenAIChatCompletionMessage => ({
  role: message.role,
  content: toOpenAIContent(message.content),
})

const toOpenAIContent = (content: MessageContent): OpenAIChatMessageContent => {
  if (typeof content === 'string') {
    return content
  }

  return content.map((part) => {
    if ('text' in part) {
      return { type: 'text', text: part.text }
    }

    if ('data' in part) {
      const imagePart = part as ImagePart
      return {
        type: 'image_url',
        image_url: { url: `data:${imagePart.mimeType};base64,${imagePart.data}` },
      }
    }

    if ('fileUri' in part) {
      throw new Error(
        'Video inputs are only supported when using Gemini models. Remove --video or switch to a Gemini model.',
      )
    }

    return { type: 'text', text: '' }
  })
}

const toGeminiParts = (content: MessageContent): GeminiContentPart[] => {
  if (typeof content === 'string') {
    return content ? [{ text: content }] : []
  }

  return content.map((part) => {
    if ('text' in part) {
      return { text: part.text }
    }

    if ('data' in part) {
      const imagePart = part as ImagePart
      return { inlineData: { mimeType: imagePart.mimeType, data: imagePart.data } }
    }

    if ('fileUri' in part) {
      const videoPart = part as VideoPart
      return { fileData: { mimeType: videoPart.mimeType, fileUri: videoPart.fileUri } }
    }

    return { text: '' }
  })
}
