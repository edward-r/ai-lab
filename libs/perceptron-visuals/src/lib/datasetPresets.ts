import type { LabeledPoint } from './usePerceptronTrainer'

export type PresetKind = 'separable' | 'xor' | 'noisy' | 'custom'

export const makeSeparable = (): LabeledPoint[] => {
  const points: LabeledPoint[] = []
  for (let i = 0; i < 40; i += 1) {
    points.push({ x: [-1 + Math.random() * 0.9, -1 + Math.random() * 0.9], y: 0 })
  }
  for (let i = 0; i < 40; i += 1) {
    points.push({ x: [0.2 + Math.random() * 0.9, 0.2 + Math.random() * 0.9], y: 1 })
  }
  return points
}

export const makeXor = (): LabeledPoint[] => {
  const base: Array<[number, number, 0 | 1]> = [
    [-0.8, -0.8, 0],
    [-0.8, 0.8, 1],
    [0.8, -0.8, 1],
    [0.8, 0.8, 0],
  ]
  const points: LabeledPoint[] = []
  for (const [x1, x2, y] of base) {
    for (let i = 0; i < 30; i += 1) {
      points.push({
        x: [x1 + (Math.random() - 0.5) * 0.3, x2 + (Math.random() - 0.5) * 0.3],
        y,
      })
    }
  }
  return points
}

export const makeNoisy = (): LabeledPoint[] => {
  const base = makeSeparable()
  const points = base.map((point) => ({
    x: [point.x[0], point.x[1]] as [number, number],
    y: point.y,
  }))

  const flipCount = Math.max(1, Math.round(points.length * 0.1))
  const indices = new Set<number>()
  while (indices.size < flipCount) {
    indices.add(Math.floor(Math.random() * points.length))
  }

  for (const index of indices) {
    const entry = points[index]
    if (!entry) continue
    points[index] = {
      x: [entry.x[0], entry.x[1]],
      y: entry.y === 1 ? 0 : 1,
    }
  }

  return points
}

export const presetOptions: Array<{
  kind: PresetKind
  label: string
  make: () => LabeledPoint[]
}> = [
  { kind: 'separable', label: 'Separable', make: makeSeparable },
  { kind: 'xor', label: 'XOR', make: makeXor },
  { kind: 'noisy', label: 'Noisy separable', make: makeNoisy },
]
