import { improve } from '@/lib/improve'
import { callLLM } from '@/lib/llm'
import type { PromptSections } from '@/lib/types'

type ImproveRequest = {
  original: string
  answers?: Record<string, string>
  defaults?: Partial<PromptSections>
  polish?: boolean
}

export const POST = async (request: Request) => {
  const body = (await request.json()) as ImproveRequest
  const trimmed = body.original?.trim()

  if (!trimmed) {
    return Response.json({ error: 'Original prompt is required.' }, { status: 400 })
  }

  const result = improve({
    original: trimmed,
    answers: body.answers ?? {},
    defaults: {
      constraints: ['Functional TypeScript', 'No classes', "No 'any'"],
      outputFormat: ['Exact sections with headings', 'One ```ts``` block when code is requested'],
      process: ['Assumptions→Plan→Draft→Critique→Final'],
      rubric: ['Concrete, balanced, actionable; fails if generic.'],
      ...body.defaults,
    },
  })

  if (!body.polish) {
    return Response.json(result)
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
  try {
    const polishedPrompt = await callLLM(
      [
        {
          role: 'system',
          content:
            'You refine prompt contracts for language models. Preserve headings, bullet ordering, and constraints. Only tighten wording and fix inconsistencies.',
        },
        {
          role: 'user',
          content: [
            'Original prompt:',
            trimmed,
            '---',
            'Improved prompt candidate:',
            result.improvedPrompt,
            '---',
            'Return the polished prompt text, preserving exact sections.',
          ].join('\n'),
        },
      ],
      model,
    )

    return Response.json({
      ...result,
      polishedPrompt,
      model,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to polish prompt.'

    return Response.json({
      ...result,
      polishError: message,
    })
  }
}
