export type CriterionKey =
  | 'outcome'
  | 'outputFormat'
  | 'constraints'
  | 'context'
  | 'processRubric'
  | 'uncertainty'

export type CriterionScore = Record<CriterionKey, number>

export type CriterionWeights = Record<CriterionKey, number>

export type Diagnosis = {
  scores: CriterionScore
  notes: Partial<Record<CriterionKey, string[]>>
  missing: CriterionKey[]
  overall: number
}

export type ClarifyingQ = {
  key: CriterionKey
  question: string
  hint?: string
  options?: string[]
}

export type PromptSections = {
  role: string
  objective: string
  audienceUse?: string
  context?: string
  constraints?: string[]
  outputFormat?: string[]
  process?: string[]
  rubric?: string[]
  uncertainty?: string
}

export type ImproveInput = {
  original: string
  answers: Partial<Record<CriterionKey, string>>
  defaults?: Partial<PromptSections>
}

export type ImproveResult = {
  improvedPrompt: string
  diagnosisBefore: Diagnosis
  diagnosisAfter: Diagnosis
  questionsAsked: ClarifyingQ[]
  polishedPrompt?: string
  polishError?: string
  model?: string
}
