import { ClarifyingQ, CriterionKey, Diagnosis } from './types'

const builders: Record<CriterionKey, () => ClarifyingQ> = {
  outcome: () => ({
    key: 'outcome',
    question:
      "What single observable deliverable do you want (e.g., 'one Markdown page', 'a JSON schema', 'a ```ts``` function') and any length limits?",
    options: [
      'One Markdown page ≤ 350 words',
      'One ```ts``` block + tests',
      'JSON object matching a schema',
    ],
  }),
  outputFormat: () => ({
    key: 'outputFormat',
    question: 'How should the output be structured—exact sections/keys and their order?',
    hint: 'Specify headings or JSON keys; include code fences where applicable.',
  }),
  constraints: () => ({
    key: 'constraints',
    question:
      "What constraints and non-goals should be enforced (stack, style, bans like 'no classes', 'no any')?",
    options: ['Functional TypeScript', 'No external deps', 'No classes', "No 'any'"],
  }),
  context: () => ({
    key: 'context',
    question: 'What minimal domain facts are necessary (APIs, datasets, definitions, edge cases)?',
  }),
  processRubric: () => ({
    key: 'processRubric',
    question:
      'Do you want steps and a rubric? If so, list them (e.g., assumptions→plan→final; pass/fail checks).',
    options: ['Assumptions→Plan→Draft→Critique→Final', 'Pass if: X; Fail if: Y'],
  }),
  uncertainty: () => ({
    key: 'uncertainty',
    question:
      'What is unknown or risky? Should the model propose safe defaults and ask next questions?',
    options: ['List uncertainties + propose defaults', 'Ask 3 next questions'],
  }),
}

export const generateQuestions = (diagnosis: Diagnosis, max = 4): ClarifyingQ[] => {
  const prioritized = diagnosis.missing.sort((a, b) => {
    const weights: Record<CriterionKey, number> = {
      outcome: 0.25,
      outputFormat: 0.25,
      constraints: 0.2,
      context: 0.15,
      processRubric: 0.1,
      uncertainty: 0.05,
    }
    return weights[b] - weights[a]
  })
  return prioritized.slice(0, max).map((key) => builders[key]())
}
