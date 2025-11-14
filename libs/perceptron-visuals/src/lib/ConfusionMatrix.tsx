import React from 'react'
import type { ConfusionMetrics } from './metrics'

type ConfusionMatrixProps = {
  metrics: ConfusionMetrics
  showSummary?: boolean
}

export const ConfusionMatrix: React.FC<ConfusionMatrixProps> = ({ metrics, showSummary }) => {
  const showSummarySection = showSummary ?? true

  return (
    <div className="overflow-x-auto">
      <div className="space-y-3">
        <table className="table-fixed w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="whitespace-nowrap px-2 py-1 text-center" />
              <th className="whitespace-nowrap pr-6 py-1 text-center text-xs text-gray-600">
                Pred 0
              </th>
              <th className="whitespace-nowrap pl-1 py-1 text-center text-xs text-gray-600">
                Pred 1
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="whitespace-nowrap pr-2 py-1 text-center text-sm text-gray-600">
                True 0
              </td>
              <td className="whitespace-nowrap px-2 py-1 text-center border">{metrics.TN}</td>
              <td className="whitespace-nowrap px-2 py-1 text-center border">{metrics.FP}</td>
            </tr>
            <tr>
              <td className="whitespace-nowrap pr-2 py-1 text-center text-sm text-gray-600">
                True 1
              </td>
              <td className="whitespace-nowrap px-2 py-1 text-center border">{metrics.FN}</td>
              <td className="whitespace-nowrap px-2 py-1 text-center border">{metrics.TP}</td>
            </tr>
          </tbody>
        </table>

        {showSummarySection ? (
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 sm:grid-cols-3">
            <div>accuracy: {(metrics.accuracy * 100).toFixed(1)}%</div>
            <div>precision: {(metrics.precision * 100).toFixed(1)}%</div>
            <div>recall (TPR): {(metrics.recall * 100).toFixed(1)}%</div>
            <div>specificity (TNR): {(metrics.specificity * 100).toFixed(1)}%</div>
            <div>F₁: {metrics.f1.toFixed(3)}</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
