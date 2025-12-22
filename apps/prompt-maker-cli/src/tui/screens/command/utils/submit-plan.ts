import { resolveIntentSource } from '../../../intent-source'
import type { IntentSourceSelection } from '../../../intent-source'
import type { CommandDescriptor } from '../../../types'

export type SubmitPlanHistoryKind = 'system' | 'user' | 'progress'

export type SubmitPlanAction =
  | { type: 'set-input'; value: string }
  | { type: 'push-history'; kind: SubmitPlanHistoryKind; content: string }
  | { type: 'add-command-history'; value: string }
  | { type: 'set-last-user-intent'; value: string }
  | { type: 'submit-refinement'; value: string }
  | { type: 'run-generation'; intent?: string; intentFile?: string }
  | { type: 'run-new'; argsRaw: string }
  | { type: 'run-reuse' }
  | { type: 'run-command'; commandId: CommandDescriptor['id']; argsRaw: string }

export type ResolveSubmitPlanInput = {
  expandedValue: string
  isAwaitingRefinement: boolean
  popupOpen: boolean
  isCommandMenuActive: boolean
  selectedCommandId: CommandDescriptor['id'] | null
  commandMenuArgsRaw: string
  isCommandMode: boolean
  intentFilePath: string
  isGenerating: boolean
}

const buildCommandHistoryEntry = (commandId: CommandDescriptor['id'], argsRaw: string): string => {
  const trimmedArgs = argsRaw.trim()
  return `/${commandId}${trimmedArgs ? ` ${trimmedArgs}` : ''}`
}

export const resolveSubmitPlan = (input: ResolveSubmitPlanInput): SubmitPlanAction[] => {
  const actions: SubmitPlanAction[] = []

  if (input.isAwaitingRefinement) {
    actions.push({ type: 'submit-refinement', value: input.expandedValue })
    actions.push({ type: 'set-input', value: '' })
    return actions
  }

  if (input.popupOpen) {
    return actions
  }

  if (input.isCommandMenuActive) {
    if (input.selectedCommandId) {
      actions.push({
        type: 'add-command-history',
        value: buildCommandHistoryEntry(input.selectedCommandId, input.commandMenuArgsRaw),
      })

      if (input.selectedCommandId === 'new') {
        actions.push({ type: 'run-new', argsRaw: input.commandMenuArgsRaw })
      } else if (input.selectedCommandId === 'reuse') {
        actions.push({ type: 'run-reuse' })
      } else {
        actions.push({
          type: 'run-command',
          commandId: input.selectedCommandId,
          argsRaw: input.commandMenuArgsRaw,
        })
      }
    }

    actions.push({ type: 'set-input', value: '' })
    return actions
  }

  if (input.isCommandMode) {
    actions.push({ type: 'set-input', value: '' })
    return actions
  }

  const trimmed = input.expandedValue.trim()
  const intentSource: IntentSourceSelection = resolveIntentSource(trimmed, input.intentFilePath)

  if (intentSource.kind === 'empty') {
    actions.push({ type: 'set-input', value: '' })
    return actions
  }

  if (input.isGenerating) {
    actions.push({
      type: 'push-history',
      kind: 'system',
      content: 'Generation already running. Please wait.',
    })
    actions.push({ type: 'set-input', value: '' })
    return actions
  }

  if (intentSource.kind === 'file') {
    actions.push({
      type: 'push-history',
      kind: 'user',
      content: `> [intent file] ${intentSource.intentFile}`,
    })

    if (trimmed.length > 0) {
      actions.push({
        type: 'push-history',
        kind: 'system',
        content: 'Typed intent ignored because an intent file is active.',
      })
    }

    actions.push({ type: 'set-input', value: '' })
    actions.push({ type: 'run-generation', intentFile: intentSource.intentFile })
    return actions
  }

  actions.push({ type: 'add-command-history', value: intentSource.intent })
  actions.push({ type: 'push-history', kind: 'user', content: `> ${intentSource.intent}` })
  actions.push({ type: 'set-last-user-intent', value: intentSource.intent })
  actions.push({ type: 'set-input', value: '' })
  actions.push({ type: 'run-generation', intent: intentSource.intent })

  return actions
}
