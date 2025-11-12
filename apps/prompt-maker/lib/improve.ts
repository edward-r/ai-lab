import { diagnose } from './heuristics'
import { buildPrompt } from './contract'
import { ImproveInput, ImproveResult, PromptSections } from './types'

const mergeSections = (
  answers: ImproveInput['answers'],
  defaults?: Partial<PromptSections>,
): PromptSections => {
  const role = defaults?.role ?? 'Senior assistant tuned for accuracy and specificity'
  const objective = answers.outcome ?? 'Produce a clear, testable deliverable.'
  const audienceUse = defaults?.audienceUse ?? 'For immediate decision or copy/paste into tools.'
  const context = answers.context ?? defaults?.context ?? ''
  const constraints = [
    ...(defaults?.constraints ?? []),
    ...(answers.constraints ? [answers.constraints] : []),
  ]
  const outputFormat = [
    ...(defaults?.outputFormat ?? []),
    ...(answers.outputFormat ? [answers.outputFormat] : []),
  ]
  const process = [
    ...(defaults?.process ?? []),
    ...(answers.processRubric ? [answers.processRubric] : []),
  ]
  const rubric = defaults?.rubric ?? ['Pass if all sections present and constraints respected.']
  const uncertainty =
    answers.uncertainty ??
    defaults?.uncertainty ??
    'If data is missing, ask 3 clarifying questions and propose safe defaults.'

  return {
    role,
    objective,
    audienceUse,
    context,
    constraints,
    outputFormat,
    process,
    rubric,
    uncertainty,
  }
}

export const improve = (input: ImproveInput): ImproveResult => {
  const before = diagnose(input.original)
  const sections = mergeSections(input.answers, input.defaults)
  const improvedPrompt = buildPrompt(sections)
  const after = diagnose(improvedPrompt)

  return {
    improvedPrompt,
    diagnosisBefore: before,
    diagnosisAfter: after,
    questionsAsked: [],
  }
}
