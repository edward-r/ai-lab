import { sigmoid, step, weightedSum } from '@perceptron/core'
import type { Activation, Params, PerceptronAdapter, Point2 } from './usePerceptronTrainer'

const cloneParams = (params: Params): Params => ({
  w: [params.w[0], params.w[1]],
  b: params.b,
})

export const makeCoreAdapter = (initial: Params): PerceptronAdapter => {
  let current = cloneParams(initial)

  const getParams = (): Params => cloneParams(current)

  const setParams = (params: Params): void => {
    current = cloneParams(params)
  }

  const predict = (x: Point2): number =>
    weightedSum([x[0], x[1]], [current.w[0], current.w[1]], current.b)

  const trainStep = (x: Point2, y: 0 | 1, lr: number, activation: Activation): Params => {
    const z = predict(x)

    if (activation === 'sigmoid') {
      const probability = sigmoid(z)
      const gradient = probability - y
      current = {
        w: [current.w[0] - lr * gradient * x[0], current.w[1] - lr * gradient * x[1]],
        b: current.b - lr * gradient,
      }
    } else {
      const prediction = step(z) as 0 | 1
      const error = (y - prediction) as -1 | 0 | 1
      if (error !== 0) {
        current = {
          w: [current.w[0] + lr * error * x[0], current.w[1] + lr * error * x[1]],
          b: current.b + lr * error,
        }
      }
    }

    return getParams()
  }

  return { getParams, setParams, predict, trainStep }
}
