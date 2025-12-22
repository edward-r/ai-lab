import {
  generationPipelineReducer,
  INITIAL_GENERATION_PIPELINE_STATE,
  type GenerationPipelineState,
} from '../tui/generation-pipeline-reducer'

describe('generationPipelineReducer', () => {
  const reduce = (
    state: GenerationPipelineState,
    action: Parameters<typeof generationPipelineReducer>[1],
  ): GenerationPipelineState => generationPipelineReducer(state, action)

  it('starts generation and clears interactive state', () => {
    const next = reduce(
      { ...INITIAL_GENERATION_PIPELINE_STATE, awaitingInteractiveMode: 'transport' },
      { type: 'generation-start', statusMessage: 'Preparing…' },
    )

    expect(next.isGenerating).toBe(true)
    expect(next.statusMessage).toBe('Preparing…')
    expect(next.awaitingInteractiveMode).toBeNull()
    expect(next.isAwaitingRefinement).toBe(false)
    expect(next.latestTelemetry).toBeNull()
  })

  it('stops generation and clears awaiting flags', () => {
    const next = reduce(
      {
        ...INITIAL_GENERATION_PIPELINE_STATE,
        isGenerating: true,
        statusMessage: 'Working…',
        awaitingInteractiveMode: 'tty',
        isAwaitingRefinement: true,
      },
      { type: 'generation-stop', statusMessage: 'Complete' },
    )

    expect(next.isGenerating).toBe(false)
    expect(next.statusMessage).toBe('Complete')
    expect(next.awaitingInteractiveMode).toBeNull()
    expect(next.isAwaitingRefinement).toBe(false)
  })

  it('updates interactive awaiting mode and status together', () => {
    const next = reduce(INITIAL_GENERATION_PIPELINE_STATE, {
      type: 'set-awaiting-interactive',
      awaitingInteractiveMode: 'transport',
      statusMessage: 'Waiting…',
    })

    expect(next.awaitingInteractiveMode).toBe('transport')
    expect(next.statusMessage).toBe('Waiting…')
  })

  it('does not overwrite status when updating awaiting mode without a message', () => {
    const next = reduce(
      { ...INITIAL_GENERATION_PIPELINE_STATE, statusMessage: 'Keep me' },
      { type: 'set-awaiting-interactive', awaitingInteractiveMode: null },
    )

    expect(next.awaitingInteractiveMode).toBeNull()
    expect(next.statusMessage).toBe('Keep me')
  })
})
