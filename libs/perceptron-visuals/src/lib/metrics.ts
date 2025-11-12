import { sigmoid, weightedSum } from '@perceptron/core'
import type { LabeledPoint, Params, Point2 } from './usePerceptronTrainer'

const probability = (params: Params, x: Point2): number => {
  const z = weightedSum([x[0], x[1]], [params.w[0], params.w[1]], params.b)
  return sigmoid(z)
}

export type ConfusionCounts = {
  TP: number
  TN: number
  FP: number
  FN: number
}

export type ConfusionMetrics = ConfusionCounts & {
  accuracy: number
  precision: number
  recall: number
  specificity: number
  f1: number
}

export const computeConfusion = (
  params: Params,
  data: LabeledPoint[],
  threshold: number,
): ConfusionMetrics => {
  let TP = 0
  let TN = 0
  let FP = 0
  let FN = 0

  for (const sample of data) {
    const p = probability(params, sample.x)
    const predicted = p >= threshold ? 1 : 0
    if (predicted === 1 && sample.y === 1) TP += 1
    else if (predicted === 0 && sample.y === 0) TN += 1
    else if (predicted === 1 && sample.y === 0) FP += 1
    else FN += 1
  }

  const total = data.length
  const accuracy = total === 0 ? 0 : (TP + TN) / total
  const precision = TP + FP === 0 ? 0 : TP / (TP + FP)
  const recall = TP + FN === 0 ? 0 : TP / (TP + FN)
  const specificity = TN + FP === 0 ? 0 : TN / (TN + FP)
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)

  return { TP, TN, FP, FN, accuracy, precision, recall, specificity, f1 }
}

export type RocPoint = { fpr: number; tpr: number; threshold: number }
export type RocResult = { points: RocPoint[]; auc: number | null }

export const computeRoc = (params: Params, data: LabeledPoint[], steps = 101): RocResult => {
  const positives = data.filter((sample) => sample.y === 1).length
  const negatives = data.length - positives
  if (positives === 0 || negatives === 0) {
    return { points: [], auc: null }
  }

  const safeSteps = Math.max(2, steps)
  const points: RocPoint[] = []

  for (let i = 0; i < safeSteps; i += 1) {
    const threshold = i / (safeSteps - 1)
    let TP = 0
    let FP = 0
    let TN = 0
    let FN = 0

    for (const sample of data) {
      const p = probability(params, sample.x)
      const predicted = p >= threshold ? 1 : 0
      if (predicted === 1 && sample.y === 1) TP += 1
      else if (predicted === 0 && sample.y === 0) TN += 1
      else if (predicted === 1 && sample.y === 0) FP += 1
      else FN += 1
    }

    const tpr = TP + FN === 0 ? 0 : TP / (TP + FN)
    const fpr = FP + TN === 0 ? 0 : FP / (FP + TN)
    points.push({ fpr, tpr, threshold })
  }

  const sorted = [...points].sort((a, b) => {
    if (a.fpr === b.fpr) return a.tpr - b.tpr
    return a.fpr - b.fpr
  })

  let auc = 0
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1]
    const current = sorted[i]
    if (!previous || !current) {
      continue
    }
    const x0 = previous.fpr
    const x1 = current.fpr
    const y0 = previous.tpr
    const y1 = current.tpr
    auc += ((y0 + y1) / 2) * (x1 - x0)
  }

  return { points: sorted, auc }
}
