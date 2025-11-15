import React from 'react'
import { AnimatedTauControl } from '@perceptron-visuals/AnimatedTauControl'
import { tweenNumber, type Cancel } from '@perceptron-visuals/lib/anim/tween'

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
}) => {
  const [rocPlaying, setRocPlaying] = React.useState(false)
  const rocTweenRef = React.useRef<Cancel | null>(null)

  const handleRocTourClick = () => {
    if (activation !== 'sigmoid') return
    if (rocPlaying) {
      rocTweenRef.current?.()
      rocTweenRef.current = null
      setRocPlaying(false)
      return
    }

    setRocPlaying(true)
    rocTweenRef.current = tweenNumber(0, 1, {
      duration: 4000,
      onUpdate: (value) => {
        setThreshold(value)
      },
    })
  }

  React.useEffect(
    () => () => {
      rocTweenRef.current?.()
    },
    [],
  )

  return (
    <section className="rounded-lg border p-3 space-y-3">
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

      <div className="space-y-1">
        <div className="font-medium text-sm">ROC tour</div>
        <button
          type="button"
          className="px-2 py-1 rounded bg-gray-100 disabled:opacity-60"
          onClick={handleRocTourClick}
          disabled={activation !== 'sigmoid'}
        >
          {rocPlaying ? 'Pause ROC tour' : 'Play ROC tour'}
        </button>
      </div>
    </section>
  )
}
