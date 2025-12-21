export type SessionCommandId = 'new' | 'reuse'

export type SessionCommandPlan =
  | { type: 'reset-only'; message: string }
  | { type: 'reset-and-load-meta'; message: string; metaInstructions: string }

export type PlanSessionCommandOptions = {
  commandId: SessionCommandId
  lastGeneratedPrompt: string | null
}

export const planSessionCommand = ({
  commandId,
  lastGeneratedPrompt,
}: PlanSessionCommandOptions): SessionCommandPlan => {
  if (commandId === 'new') {
    return { type: 'reset-only', message: '[new] Session reset.' }
  }

  const prompt = lastGeneratedPrompt?.trim() ?? ''
  if (!prompt) {
    return { type: 'reset-only', message: '[reuse] Session reset · no previous prompt to reuse.' }
  }

  return {
    type: 'reset-and-load-meta',
    message: '[reuse] Session reset · loaded last prompt into meta instructions.',
    metaInstructions: prompt,
  }
}
