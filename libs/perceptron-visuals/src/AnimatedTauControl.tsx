import React from 'react'
import { animate } from 'framer-motion'

type Props = {
  tau: number
  setTau: (t: number) => void
  disabled?: boolean
}

export const AnimatedTauControl: React.FC<Props> = ({ tau, setTau, disabled }) => {
  const [playing, setPlaying] = React.useState(false)
  const ctrl = React.useRef<ReturnType<typeof animate> | null>(null)

  const onPlay = () => {
    if (disabled) return
    if (playing) {
      ctrl.current?.stop()
      setPlaying(false)
      return
    }
    setPlaying(true)
    // ping-pong 0→1→0 with easing
    ctrl.current = animate(0, 1, {
      duration: 3.0,
      repeat: Infinity,
      repeatType: 'reverse',
      onUpdate: (v) => setTau(Math.max(0, Math.min(1, v))),
      ease: 'easeInOut',
    })
  }

  React.useEffect(() => () => ctrl.current?.stop(), [])

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPlay}
        className={`px-2 py-1 rounded ${playing ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
        disabled={disabled}
        aria-pressed={playing}
      >
        {playing ? 'Pause τ sweep' : 'Play τ sweep'}
      </button>
      <span className="text-xs text-gray-600">
        Animates threshold τ to show logit shift (b′ = b − logit(τ)).
      </span>
    </div>
  )
}
