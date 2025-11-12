import React from 'react'
import type { ConfusionMetrics } from './metrics'

type ConfusionMatrixProps = {
  metrics: ConfusionMetrics
}

export const ConfusionMatrix: React.FC<ConfusionMatrixProps> = ({ metrics }) => {
  return (
    <div className="space-y-3">
      <table className="border-collapse">
        <thead>
          <tr>
            <th />
            <th className="px-3 py-1 text-sm text-gray-600">Pred 0</th>
            <th className="px-3 py-1 text-sm text-gray-600">Pred 1</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-2 py-1 text-sm text-gray-600">True 0</td>
            <td className="border px-3 py-2 text-center">{metrics.TN}</td>
            <td className="border px-3 py-2 text-center">{metrics.FP}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-sm text-gray-600">True 1</td>
            <td className="border px-3 py-2 text-center">{metrics.FN}</td>
            <td className="border px-3 py-2 text-center">{metrics.TP}</td>
          </tr>
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 sm:grid-cols-3">
        <div>accuracy: {(metrics.accuracy * 100).toFixed(1)}%</div>
        <div>precision: {(metrics.precision * 100).toFixed(1)}%</div>
        <div>recall (TPR): {(metrics.recall * 100).toFixed(1)}%</div>
        <div>specificity (TNR): {(metrics.specificity * 100).toFixed(1)}%</div>
        <div>F₁: {metrics.f1.toFixed(3)}</div>
      </div>
    </div>
  )
}
