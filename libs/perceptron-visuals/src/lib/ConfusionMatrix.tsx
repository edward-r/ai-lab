import React from 'react'
import { motion } from 'framer-motion'
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
              <td className="whitespace-nowrap px-2 py-1 text-center border">
                <motion.span
                  key={metrics.TN}
                  initial={{ scale: 0.9, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.18 }}
                >
                  {metrics.TN}
                </motion.span>
              </td>
              <td className="whitespace-nowrap px-2 py-1 text-center border">
                <motion.span
                  key={metrics.FP}
                  initial={{ scale: 0.9, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.18 }}
                >
                  {metrics.FP}
                </motion.span>
              </td>
            </tr>
            <tr>
              <td className="whitespace-nowrap pr-2 py-1 text-center text-sm text-gray-600">
                True 1
              </td>
              <td className="whitespace-nowrap px-2 py-1 text-center border">
                <motion.span
                  key={metrics.FN}
                  initial={{ scale: 0.9, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.18 }}
                >
                  {metrics.FN}
                </motion.span>
              </td>
              <td className="whitespace-nowrap px-2 py-1 text-center border">
                <motion.span
                  key={metrics.TP}
                  initial={{ scale: 0.9, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.18 }}
                >
                  {metrics.TP}
                </motion.span>
              </td>
            </tr>
          </tbody>
        </table>

        {showSummarySection ? (
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 sm:grid-cols-3">
            <div>
              accuracy:{' '}
              <motion.span
                key={(metrics.accuracy * 100).toFixed(1)}
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.18 }}
              >
                {(metrics.accuracy * 100).toFixed(1)}%
              </motion.span>
            </div>
            <div>
              precision:{' '}
              <motion.span
                key={(metrics.precision * 100).toFixed(1)}
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.18 }}
              >
                {(metrics.precision * 100).toFixed(1)}%
              </motion.span>
            </div>
            <div>
              recall (TPR):{' '}
              <motion.span
                key={(metrics.recall * 100).toFixed(1)}
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.18 }}
              >
                {(metrics.recall * 100).toFixed(1)}%
              </motion.span>
            </div>
            <div>
              specificity (TNR):{' '}
              <motion.span
                key={(metrics.specificity * 100).toFixed(1)}
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.18 }}
              >
                {(metrics.specificity * 100).toFixed(1)}%
              </motion.span>
            </div>
            <div>
              F₁:{' '}
              <motion.span
                key={metrics.f1.toFixed(3)}
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.18 }}
              >
                {metrics.f1.toFixed(3)}
              </motion.span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
