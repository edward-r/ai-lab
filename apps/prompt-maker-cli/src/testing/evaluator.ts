import { callLLM } from '@prompt-maker/core'

import { ensureModelCredentials } from '../prompt-generator-service'

const DEFAULT_JUDGE_MODEL = process.env.PROMPT_MAKER_JUDGE_MODEL?.trim() || 'gpt-4o'
const SYSTEM_PROMPT =
  'You are a QA bot. Evaluate if the following prompt meets these criteria. Return strict JSON with keys "pass" (boolean) and "reason" (string).'

type JudgeVerdict = {
  pass: boolean
  reason: string
}

export const evaluatePrompt = async (
  generatedPrompt: string,
  criteria: string[],
): Promise<JudgeVerdict> => {
  if (!criteria || criteria.length === 0) {
    return { pass: true, reason: 'No criteria provided.' }
  }

  const model = DEFAULT_JUDGE_MODEL
  await ensureModelCredentials(model)

  const criteriaList = criteria.map((item, index) => `${index + 1}. ${item}`).join('\n')

  const userMessage = [
    'Prompt to Evaluate:',
    generatedPrompt,
    '',
    'Criteria:',
    criteriaList,
    '',
    'Return JSON like { "pass": boolean, "reason": string } indicating whether the prompt satisfies all criteria.',
  ].join('\n')

  try {
    const response = await callLLM(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      model,
    )

    const verdict = parseVerdict(response)
    return verdict
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown evaluation error.'
    return { pass: false, reason: `Evaluation failed: ${message}` }
  }
}

const parseVerdict = (text: string): JudgeVerdict => {
  try {
    const cleaned = text
      .trim()
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()
    const parsed = JSON.parse(cleaned) as Partial<JudgeVerdict>
    if (typeof parsed.pass === 'boolean' && typeof parsed.reason === 'string') {
      return parsed as JudgeVerdict
    }
    throw new Error('Missing pass/reason fields')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error'
    return {
      pass: false,
      reason: `Judge returned invalid JSON: ${message}. Raw response: ${truncate(text, 200)}`,
    }
  }
}

const truncate = (value: string, max: number): string => {
  if (value.length <= max) {
    return value
  }
  return `${value.slice(0, max)}…`
}
