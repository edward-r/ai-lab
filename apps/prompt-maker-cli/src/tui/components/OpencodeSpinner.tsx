import React, { useEffect, useMemo, useState } from 'react'
import { Text } from 'ink'

const DEFAULT_LENGTH = 12
const DEFAULT_INTERVAL_MS = 80
const DEFAULT_TRAIL_LENGTH = 3

export type OpencodeSpinnerProps = {
  length?: number
  intervalMs?: number
  trailLength?: number
}

export const OpencodeSpinner: React.FC<OpencodeSpinnerProps> = ({
  length = DEFAULT_LENGTH,
  intervalMs = DEFAULT_INTERVAL_MS,
  trailLength = DEFAULT_TRAIL_LENGTH,
}) => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => prev + 1)
    }, intervalMs)

    return () => {
      clearInterval(timer)
    }
  }, [intervalMs])

  const segments = useMemo(() => {
    const safeLength = Math.max(1, Math.floor(length))
    const safeTrail = Math.max(0, Math.floor(trailLength))

    const span = safeLength - 1
    const period = span <= 0 ? 1 : span * 2
    const phase = frame % period

    const headIndex = span <= 0 ? 0 : phase <= span ? phase : period - phase
    const direction = span <= 0 ? 1 : phase < span ? 1 : -1

    return Array.from({ length: safeLength }, (_, index) => {
      const distanceBehind = direction === 1 ? headIndex - index : index - headIndex

      if (distanceBehind === 0) {
        return (
          <Text key={index} color="#A78BFA">
            ▄
          </Text>
        )
      }

      if (distanceBehind === 1 && safeTrail >= 1) {
        return (
          <Text key={index} color="#7C3AED">
            ▄
          </Text>
        )
      }

      if (distanceBehind === 2 && safeTrail >= 2) {
        return (
          <Text key={index} color="#5B21B6">
            ▄
          </Text>
        )
      }

      if (distanceBehind === 3 && safeTrail >= 3) {
        return (
          <Text key={index} color="#3B0764">
            ▄
          </Text>
        )
      }

      return (
        <Text key={index} color="#333333">
          _
        </Text>
      )
    })
  }, [frame, length, trailLength])

  return <Text>{segments}</Text>
}
