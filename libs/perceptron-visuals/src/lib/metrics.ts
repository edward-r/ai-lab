import type { LabeledPoint, Params } from './usePerceptronTrainer'

export type ConfusionMetrics = {
  TP: number
  TN: number
  FP: number
  FN: number
  accuracy: number
  precision: number
  recall: number
  specificity: number
  f1: number
}

export const computeConfusion = (
  _params: Params,
  _data: LabeledPoint[],
  _threshold: number,
): ConfusionMetrics => ({
  TP: 0,
  TN: 0,
  FP: 0,
  FN: 0,
  accuracy: 0,
  precision: 0,
  recall: 0,
  specificity: 0,
  f1: 0,
})

export type RocPoint = { fpr: number; tpr: number; threshold: number }
export type RocResult = { points: RocPoint[]; auc: number | null }

export const computeRoc = (_params: Params, _data: LabeledPoint[], _steps = 101): RocResult => ({
  points: [],
  auc: null,
})
