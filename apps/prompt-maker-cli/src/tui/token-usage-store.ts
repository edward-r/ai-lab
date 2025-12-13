import type { TokenTelemetry } from '../generate-command'

export type TokenUsageIteration = {
  iteration: number
  promptTokens: number
  reasoningTokens: number
}

export type TokenUsageRun = {
  id: string
  startedAt: string
  model: string
  telemetry: TokenTelemetry | null
  iterations: TokenUsageIteration[]
}

export type TokenUsageBreakdown = {
  input: {
    intent: number
    files: number
    system: number
    total: number
  }
  output: {
    reasoning: number
    prompt: number
    total: number
  }
  totals: {
    tokens: number
    estimatedCostUsd: number | null
  }
}

type ModelPricing = {
  inputUsdPer1K: number
  outputUsdPer1K: number
}

const MODEL_PRICING_USD_PER_1K: Record<string, ModelPricing> = {
  // OpenAI published list prices (approx): https://openai.com/pricing
  'gpt-4o-mini': { inputUsdPer1K: 0.00015, outputUsdPer1K: 0.0006 },
  'gpt-4o': { inputUsdPer1K: 0.005, outputUsdPer1K: 0.015 },
}

const roundUsd = (value: number): number => Math.round(value * 1_000_000) / 1_000_000

const estimateCostUsd = (
  model: string,
  inputTokens: number,
  outputTokens: number,
): number | null => {
  const pricing = MODEL_PRICING_USD_PER_1K[model]
  if (!pricing) {
    return null
  }

  const inputCost = (inputTokens / 1000) * pricing.inputUsdPer1K
  const outputCost = (outputTokens / 1000) * pricing.outputUsdPer1K
  return roundUsd(inputCost + outputCost)
}

const sumBy = <T>(items: readonly T[], selector: (item: T) => number): number =>
  items.reduce((total, item) => total + selector(item), 0)

export type TokenUsageStore = {
  startRun: (model: string) => string
  recordTelemetry: (runId: string, telemetry: TokenTelemetry) => void
  recordIteration: (runId: string, iteration: TokenUsageIteration) => void
  getRuns: () => readonly TokenUsageRun[]
  getLatestRun: () => TokenUsageRun | null
  getLatestBreakdown: () => TokenUsageBreakdown | null
  clear: () => void
}

export const createTokenUsageStore = (): TokenUsageStore => {
  let runs: TokenUsageRun[] = []
  let counter = 0

  const startRun = (model: string): string => {
    counter += 1
    const runId = `run-${counter}`
    const startedAt = new Date().toISOString()

    const run: TokenUsageRun = {
      id: runId,
      startedAt,
      model,
      telemetry: null,
      iterations: [],
    }

    runs = [run, ...runs].slice(0, 50)
    return runId
  }

  const updateRun = (runId: string, updater: (run: TokenUsageRun) => TokenUsageRun): void => {
    runs = runs.map((run) => (run.id === runId ? updater(run) : run))
  }

  const recordTelemetry = (runId: string, telemetry: TokenTelemetry): void => {
    updateRun(runId, (run) => ({ ...run, telemetry }))
  }

  const recordIteration = (runId: string, iteration: TokenUsageIteration): void => {
    updateRun(runId, (run) => {
      const withoutDuplicate = run.iterations.filter(
        (value) => value.iteration !== iteration.iteration,
      )
      const nextIterations = [...withoutDuplicate, iteration].sort(
        (a, b) => a.iteration - b.iteration,
      )
      return { ...run, iterations: nextIterations }
    })
  }

  const getRuns = (): readonly TokenUsageRun[] => runs

  const getLatestRun = (): TokenUsageRun | null => runs[0] ?? null

  const getLatestBreakdown = (): TokenUsageBreakdown | null => {
    const run = getLatestRun()
    if (!run?.telemetry) {
      return null
    }

    const intent = run.telemetry.intentTokens
    const files = run.telemetry.fileTokens
    const system = run.telemetry.systemTokens
    const inputTotal = intent + files + system

    const reasoning = sumBy(run.iterations, (entry) => entry.reasoningTokens)
    const prompt = sumBy(run.iterations, (entry) => entry.promptTokens)
    const outputTotal = reasoning + prompt

    const estimatedCostUsd = estimateCostUsd(run.model, inputTotal, outputTotal)

    return {
      input: { intent, files, system, total: inputTotal },
      output: { reasoning, prompt, total: outputTotal },
      totals: { tokens: inputTotal + outputTotal, estimatedCostUsd },
    }
  }

  const clear = (): void => {
    runs = []
    counter = 0
  }

  return {
    startRun,
    recordTelemetry,
    recordIteration,
    getRuns,
    getLatestRun,
    getLatestBreakdown,
    clear,
  }
}
