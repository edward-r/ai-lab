import { diagnose } from '@/lib/heuristics'
import { generateQuestions } from '@/lib/questions'

type DiagnoseRequest = {
  original: string
  maxQuestions?: number
}

export const POST = async (request: Request) => {
  const body = (await request.json()) as DiagnoseRequest
  const trimmed = body.original?.trim()

  if (!trimmed) {
    return Response.json({ error: 'Original prompt is required.' }, { status: 400 })
  }

  const diagnosis = diagnose(trimmed)
  const questions = generateQuestions(diagnosis, body.maxQuestions ?? 4)

  return Response.json({ diagnosis, questions })
}
