import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type Point2 = [number, number]
export type LabeledPoint = { x: Point2; y: 0 | 1 }
export type Params = { w: [number, number]; b: number }
export type Activation = 'step' | 'sigmoid'

export type PerceptronAdapter = {
  getParams: () => Params
  setParams: (params: Params) => void
  predict: (x: Point2) => number
  trainStep: (x: Point2, y: 0 | 1, lr: number, activation: Activation) => Params
}

type TrainerOpts = {
  data: LabeledPoint[]
  initial: Params
  activation: Activation
  lr: number
  epochs: number
  shuffle?: boolean
  adapter?: PerceptronAdapter
  rngSeed?: number
  stepsPerFrame?: number
  onEpochEnd?: (summary: {
    epoch: number
    params: Params
    metrics: { acc: number; loss: number }
  }) => void
}

export type TrainerState = {
  running: boolean
  epoch: number
  step: number
  params: Params
  acc: number
  loss: number
}

export type TrainerControls = {
  start: () => void
  pause: () => void
  reset: (params?: Params) => void
  stepOnce: () => void
  setLr: (lr: number) => void
}

const DEFAULT_PARAMS: Params = { w: [0, 0], b: 0 }

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z))

const predictProb = (params: Params, x: Point2, activation: Activation): number => {
  const z = params.w[0] * x[0] + params.w[1] * x[1] + params.b
  return activation === 'sigmoid' ? sigmoid(z) : z > 0 ? 1 : 0
}

const computeMetrics = (
  params: Params,
  data: LabeledPoint[],
  activation: Activation,
): { acc: number; loss: number } => {
  if (data.length === 0) {
    return { acc: 0, loss: 0 }
  }

  let correct = 0
  let loss = 0

  for (const sample of data) {
    const probability = predictProb(params, sample.x, activation)
    if (activation === 'sigmoid') {
      const eps = 1e-12
      const clamped = Math.min(1 - eps, Math.max(eps, probability))
      loss += -(sample.y * Math.log(clamped) + (1 - sample.y) * Math.log(1 - clamped))
      const predicted = probability >= 0.5 ? 1 : 0
      if (predicted === sample.y) correct += 1
    } else {
      const target = sample.y === 1 ? 1 : -1
      const z = params.w[0] * sample.x[0] + params.w[1] * sample.x[1] + params.b
      loss += Math.max(0, -target * z)
      const predicted = z > 0 ? 1 : 0
      if (predicted === sample.y) correct += 1
    }
  }

  return { acc: correct / data.length, loss: loss / data.length }
}

const shuffleInPlace = <T>(values: T[], rng: () => number): void => {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const current = values[i]
    const swapWith = values[j]
    if (current === undefined || swapWith === undefined) {
      continue
    }
    values[i] = swapWith
    values[j] = current
  }
}

const makeRng = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0xffffffff
  }
}

const perceptronUpdate = (params: Params, sample: LabeledPoint, lr: number): Params => {
  const target = sample.y === 1 ? 1 : -1
  const z = params.w[0] * sample.x[0] + params.w[1] * sample.x[1] + params.b
  if (target * z <= 0) {
    return {
      w: [params.w[0] + lr * target * sample.x[0], params.w[1] + lr * target * sample.x[1]],
      b: params.b + lr * target,
    }
  }
  return params
}

const logisticUpdate = (params: Params, sample: LabeledPoint, lr: number): Params => {
  const z = params.w[0] * sample.x[0] + params.w[1] * sample.x[1] + params.b
  const probability = sigmoid(z)
  const gradient = sample.y - probability
  return {
    w: [params.w[0] + lr * gradient * sample.x[0], params.w[1] + lr * gradient * sample.x[1]],
    b: params.b + lr * gradient,
  }
}

export const usePerceptronTrainer = (options: TrainerOpts): [TrainerState, TrainerControls] => {
  const {
    data,
    initial,
    activation,
    epochs,
    adapter,
    rngSeed = 12345,
    stepsPerFrame = 1,
    onEpochEnd,
  } = options

  const [lr, updateLr] = useState(options.lr)

  const paramsRef = useRef<Params>(adapter ? adapter.getParams() : initial)
  const runningRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const orderRef = useRef<number[]>([])
  const indexRef = useRef(0)
  const epochRef = useRef(0)

  const rng = useMemo(() => makeRng(rngSeed), [rngSeed])

  const ensureOrder = useCallback(() => {
    const size = data.length
    const order = Array.from({ length: size }, (_, idx) => idx)
    if (options.shuffle && size > 1) {
      shuffleInPlace(order, rng)
    }
    orderRef.current = order
    indexRef.current = 0
  }, [data.length, options.shuffle, rng])

  const [state, setState] = useState<TrainerState>(() => {
    const base = paramsRef.current
    const metrics = computeMetrics(base, data, activation)
    return {
      running: false,
      epoch: 0,
      step: 0,
      params: base,
      acc: metrics.acc,
      loss: metrics.loss,
    }
  })

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    runningRef.current = false
    setState((prev) => ({ ...prev, running: false }))
  }, [])

  const applyStep = useCallback((): boolean => {
    if (data.length === 0) {
      const metricsEmpty = computeMetrics(paramsRef.current, data, activation)
      setState({
        running: runningRef.current,
        epoch: epochRef.current,
        step: 0,
        params: paramsRef.current,
        acc: metricsEmpty.acc,
        loss: metricsEmpty.loss,
      })
      return false
    }

    if (indexRef.current >= data.length) {
      ensureOrder()
    }

    const order = orderRef.current
    const sampleIndex = order[indexRef.current]
    if (sampleIndex === undefined) {
      return false
    }
    const sample = data[sampleIndex]
    if (sample === undefined) {
      return false
    }

    if (adapter) {
      paramsRef.current = adapter.trainStep(sample.x, sample.y, lr, activation)
      paramsRef.current = adapter.getParams()
    } else {
      paramsRef.current =
        activation === 'sigmoid'
          ? logisticUpdate(paramsRef.current, sample, lr)
          : perceptronUpdate(paramsRef.current, sample, lr)
    }

    indexRef.current += 1
    const completedEpoch = indexRef.current >= data.length

    const metricsNow = computeMetrics(paramsRef.current, data, activation)

    if (completedEpoch) {
      epochRef.current += 1
      onEpochEnd?.({
        epoch: epochRef.current,
        params: paramsRef.current,
        metrics: metricsNow,
      })

      if (epochRef.current >= epochs) {
        setState({
          running: runningRef.current,
          epoch: epochRef.current,
          step: data.length,
          params: paramsRef.current,
          acc: metricsNow.acc,
          loss: metricsNow.loss,
        })
        return false
      }

      ensureOrder()
    }

    setState({
      running: runningRef.current,
      epoch: epochRef.current,
      step: completedEpoch ? 0 : indexRef.current,
      params: paramsRef.current,
      acc: metricsNow.acc,
      loss: metricsNow.loss,
    })

    return true
  }, [activation, adapter, data, ensureOrder, epochs, lr, onEpochEnd])

  const loop = useCallback(() => {
    let keepRunning = true
    for (let i = 0; i < stepsPerFrame && keepRunning; i += 1) {
      keepRunning = applyStep()
    }
    if (keepRunning && runningRef.current) {
      rafRef.current = requestAnimationFrame(loop)
      return
    }
    stopLoop()
  }, [applyStep, stepsPerFrame, stopLoop])

  const start = useCallback(() => {
    if (runningRef.current) return
    if (epochRef.current === 0 && indexRef.current === 0) {
      ensureOrder()
    }
    runningRef.current = true
    setState((prev) => ({ ...prev, running: true }))
    rafRef.current = requestAnimationFrame(loop)
  }, [ensureOrder, loop])

  const pause = useCallback(() => {
    stopLoop()
  }, [stopLoop])

  const reset = useCallback(
    (params?: Params) => {
      stopLoop()
      epochRef.current = 0
      indexRef.current = 0
      ensureOrder()

      const base = params ?? (adapter ? adapter.getParams() : initial) ?? DEFAULT_PARAMS
      paramsRef.current = base
      if (adapter) {
        adapter.setParams(base)
      }
      const metrics = computeMetrics(base, data, activation)
      setState({
        running: false,
        epoch: 0,
        step: 0,
        params: base,
        acc: metrics.acc,
        loss: metrics.loss,
      })
    },
    [activation, adapter, data, ensureOrder, initial, stopLoop],
  )

  const stepOnce = useCallback(() => {
    if (runningRef.current) return
    if (epochRef.current === 0 && indexRef.current === 0) {
      ensureOrder()
    }
    applyStep()
  }, [applyStep, ensureOrder])

  const setLr = useCallback((value: number) => {
    updateLr(value)
  }, [])

  useEffect(() => () => stopLoop(), [stopLoop])

  useEffect(() => {
    updateLr(options.lr)
  }, [options.lr])

  return [state, { start, pause, reset, stepOnce, setLr }]
}
