type Message = { role: 'system' | 'user'; content: string }

type ChatCompletionMessage = Message | { role: 'assistant'; content: string }

type ChatCompletionChoice = {
  index: number
  message: ChatCompletionMessage
}

type ChatCompletionResponse = {
  choices: ChatCompletionChoice[]
}

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
const OPENAI_ENDPOINT = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1/chat/completions'

export const callLLM = async (
  messages: Message[],
  model: string = DEFAULT_MODEL,
): Promise<string> => {
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

export type { Message }
