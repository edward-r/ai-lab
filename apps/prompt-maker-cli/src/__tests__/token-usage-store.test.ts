import { createTokenUsageStore } from '../tui/token-usage-store'

describe('token-usage-store', () => {
  it('computes totals and estimates cost when supported', () => {
    const store = createTokenUsageStore()
    const runId = store.startRun('gpt-4o-mini')

    store.recordTelemetry(runId, {
      files: [],
      intentTokens: 100,
      fileTokens: 200,
      systemTokens: 50,
      totalTokens: 350,
    })

    store.recordIteration(runId, { iteration: 1, promptTokens: 75, reasoningTokens: 25 })

    const breakdown = store.getLatestBreakdown()
    expect(breakdown).not.toBeNull()
    expect(breakdown?.input.total).toBe(350)
    expect(breakdown?.output.total).toBe(100)
    expect(breakdown?.totals.tokens).toBe(450)
    expect(breakdown?.totals.estimatedCostUsd).toBe(0.000113)
  })

  it('deduplicates iterations by iteration number', () => {
    const store = createTokenUsageStore()
    const runId = store.startRun('gpt-4o-mini')

    store.recordTelemetry(runId, {
      files: [],
      intentTokens: 1,
      fileTokens: 1,
      systemTokens: 1,
      totalTokens: 3,
    })

    store.recordIteration(runId, { iteration: 1, promptTokens: 5, reasoningTokens: 0 })
    store.recordIteration(runId, { iteration: 1, promptTokens: 6, reasoningTokens: 2 })

    const run = store.getLatestRun()
    expect(run?.iterations).toEqual([{ iteration: 1, promptTokens: 6, reasoningTokens: 2 }])
  })
})
