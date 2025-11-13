import type { Activation, Params, PerceptronAdapter, Point2 } from './usePerceptronTrainer'

const defaultParams = (): Params => ({ w: [0, 0], b: 0 })

export const makeCoreAdapter = (_initial: Params): PerceptronAdapter => {
  const getParams = (): Params => defaultParams()

  const setParams = (_params: Params): void => {}

  const predict = (_x: Point2): number => 0

  const trainStep = (_x: Point2, _y: 0 | 1, _lr: number, _activation: Activation): Params =>
    defaultParams()

  return { getParams, setParams, predict, trainStep }
}
