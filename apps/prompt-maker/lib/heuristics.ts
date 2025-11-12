import { CriterionKey, CriterionScore, CriterionWeights, Diagnosis } from './types'

const weights: CriterionWeights = {
  outcome: 0.25,
  outputFormat: 0.25,
  constraints: 0.2,
  context: 0.15,
  processRubric: 0.1,
  uncertainty: 0.05,
}

const has = (s: string, pat: RegExp) => pat.test(s)

const scoreOutcome = (p: string): number => {
  const hasVerb = has(p, /\b(produce|return|generate|create|draft|summarize)\b/i)
  const hasLimits = has(p, /\b(≤|<=|no more than|limit(ed)? to|exact(?:ly)?)\b/i)
  return (hasVerb ? 0.6 : 0) + (hasLimits ? 0.4 : 0)
}

const scoreOutput = (p: string): number => {
  const codeFence = has(p, /```[a-z]*\n/)
  const jsonKeys = has(p, /\{[^}]*:[^}]*\}/s)
  const headings = has(p, /^#+\s|\bsections?:\b/im)
  return [codeFence, jsonKeys, headings].filter(Boolean).length / 3
}

const scoreConstraints = (p: string): number => {
  const mentionsTS = has(p, /\bTypeScript|TS\b/i)
  const noAny = has(p, /\bno ['"]?any['"]?\b/i)
  const noClasses = has(p, /\bno classes?\b/i)
  const stack = has(p, /\bNext\.?js|Prisma|Zod|ESM\b/i)
  const denies = has(p, /\b(do not|never)\b/i)
  const features = [mentionsTS, noAny, noClasses, stack, denies]
  return features.filter(Boolean).length / features.length
}

const scoreContext = (p: string): number => {
  const hasFacts = has(p, /\bAPI|endpoint|dataset|policy|definition|edge cases?\b/i)
  const hasLinksOrSnips = has(p, /(http|https):\/\/|\bcode snippet\b/i)
  return (hasFacts ? 0.6 : 0) + (hasLinksOrSnips ? 0.4 : 0)
}

const scoreProcessRubric = (p: string): number => {
  const hasSteps = has(p, /\b(step|process|plan|assumptions|tests?)\b/i)
  const hasRubric = has(p, /\brubric|pass|fail|acceptance\b/i)
  return (hasSteps ? 0.6 : 0) + (hasRubric ? 0.4 : 0)
}

const scoreUncertainty = (p: string): number => {
  const asks = has(p, /\bunknown|uncertain|ask|questions?\b/i)
  const defaults = has(p, /\bdefaults?\b/i)
  return (asks ? 0.6 : 0) + (defaults ? 0.4 : 0)
}

export const diagnose = (prompt: string): Diagnosis => {
  const raw: CriterionScore = {
    outcome: scoreOutcome(prompt),
    outputFormat: scoreOutput(prompt),
    constraints: scoreConstraints(prompt),
    context: scoreContext(prompt),
    processRubric: scoreProcessRubric(prompt),
    uncertainty: scoreUncertainty(prompt),
  }

  const notes: Diagnosis['notes'] = {
    outcome: raw.outcome < 1 ? ['Add a single, testable deliverable and a word/length limit.'] : [],
    outputFormat:
      raw.outputFormat < 1 ? ['Specify exact sections or a JSON/Markdown contract.'] : [],
    constraints:
      raw.constraints < 1
        ? ["State stack/style rules, non-goals, and bans (e.g., no classes, no 'any')."]
        : [],
    context:
      raw.context < 1
        ? ['Provide only necessary facts: API endpoints, data sources, edge cases.']
        : [],
    processRubric:
      raw.processRubric < 1 ? ['Add steps (assumptions→plan→final) and acceptance checks.'] : [],
    uncertainty: raw.uncertainty < 1 ? ['Ask for missing info or define safe defaults.'] : [],
  }

  const missing = (Object.keys(raw) as CriterionKey[]).filter((k) => raw[k] < 0.67)

  const overall = (Object.keys(raw) as CriterionKey[]).reduce(
    (acc, k) => acc + raw[k] * weights[k],
    0,
  )

  return { scores: raw, notes, missing, overall }
}
