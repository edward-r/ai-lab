/*
 * Generation pipeline reducer (pure state transitions).
 *
 * This reducer manages UI-facing generation state for the Ink TUI:
 * - whether we are generating
 * - current status message
 * - whether we're waiting for interactive input/refinement
 * - latest token telemetry
 *
 * Why a reducer?
 * - It’s common to update multiple related fields at once (e.g. set generating +
 *   clear interactive waiting + update the status message).
 * - A single reducer action lets us do that in one render.
 *
 * This file is intentionally pure:
 * - no React/Ink imports
 * - easy to unit test
 */

import type { GeneratePipelineResult } from '../generate-command'

export type InteractiveAwaitingMode = 'transport' | 'tty'

export type GenerationTelemetry = GeneratePipelineResult['telemetry']

export type GenerationPipelineState = {
  isGenerating: boolean
  statusMessage: string
  isAwaitingRefinement: boolean
  awaitingInteractiveMode: InteractiveAwaitingMode | null
  latestTelemetry: GenerationTelemetry | null
}

export type GenerationPipelineAction =
  | { type: 'generation-start'; statusMessage: string }
  | { type: 'generation-stop'; statusMessage?: string }
  | { type: 'set-status'; statusMessage: string }
  | {
      type: 'set-awaiting-interactive'
      awaitingInteractiveMode: InteractiveAwaitingMode | null
      statusMessage?: string
    }
  | { type: 'set-awaiting-refinement'; isAwaitingRefinement: boolean }
  | { type: 'set-telemetry'; telemetry: GenerationTelemetry | null }

export const INITIAL_GENERATION_PIPELINE_STATE: GenerationPipelineState = {
  isGenerating: false,
  statusMessage: 'Idle',
  isAwaitingRefinement: false,
  awaitingInteractiveMode: null,
  latestTelemetry: null,
}

export const generationPipelineReducer = (
  state: GenerationPipelineState,
  action: GenerationPipelineAction,
): GenerationPipelineState => {
  switch (action.type) {
    case 'generation-start':
      return {
        ...state,
        isGenerating: true,
        statusMessage: action.statusMessage,
        isAwaitingRefinement: false,
        awaitingInteractiveMode: null,
        latestTelemetry: null,
      }

    case 'generation-stop':
      return {
        ...state,
        isGenerating: false,
        // Preserve the existing status message unless explicitly overridden.
        statusMessage: action.statusMessage ?? state.statusMessage,
        isAwaitingRefinement: false,
        awaitingInteractiveMode: null,
      }

    case 'set-status':
      return { ...state, statusMessage: action.statusMessage }

    case 'set-awaiting-interactive':
      return {
        ...state,
        awaitingInteractiveMode: action.awaitingInteractiveMode,
        ...(action.statusMessage ? { statusMessage: action.statusMessage } : {}),
      }

    case 'set-awaiting-refinement':
      return { ...state, isAwaitingRefinement: action.isAwaitingRefinement }

    case 'set-telemetry':
      return { ...state, latestTelemetry: action.telemetry }

    default:
      return state
  }
}
