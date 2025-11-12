import { PromptSections } from './types'

const join = (label: string, value?: string | string[]) =>
  !value || (Array.isArray(value) && value.length === 0)
    ? ''
    : Array.isArray(value)
      ? `${label}:\n- ${value.join('\n- ')}\n`
      : `${label}: ${value}\n`

export const buildPrompt = (sections: PromptSections): string =>
  [
    join('Role', sections.role),
    join('Objective', sections.objective),
    join('Audience & Use', sections.audienceUse),
    join('Context', sections.context),
    join('Constraints', sections.constraints),
    join('Output Format', sections.outputFormat),
    join('Process', sections.process),
    join('Rubric', sections.rubric),
    join('Uncertainty', sections.uncertainty),
  ]
    .filter(Boolean)
    .join('\n')
