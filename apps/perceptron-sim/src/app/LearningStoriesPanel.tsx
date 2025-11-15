import React from 'react'
import { AnimatedTauControl } from '@perceptron-visuals/AnimatedTauControl'

type Props = {
  activation: 'step' | 'sigmoid'
  threshold: number
  setThreshold: (t: number) => void
  onStepOnce: () => void
}
export const LearningStoriesPanel: React.FC<Props> = ({
  activation,
  threshold,
  setThreshold,
  onStepOnce,
}) => (
  <section className="rounded-lg border p-3 space-y-2">
    <h3 className="font-semibold">Learning stories</h3>
    <div className="text-xs text-gray-600">Short animations that illustrate key ideas.</div>

    <div className="space-y-1">
      <div className="font-medium text-sm">Logit/τ shift</div>
      <AnimatedTauControl
        tau={threshold}
        setTau={setThreshold}
        disabled={activation !== 'sigmoid'}
      />
    </div>

    <div className="space-y-1">
      <div className="font-medium text-sm">One gradient update</div>
      <button type="button" className="px-2 py-1 rounded bg-gray-100" onClick={onStepOnce}>
        Animate step once
      </button>
    </div>
  </section>
)
