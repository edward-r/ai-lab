import React, { useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
  DecisionBoundaryCanvas,
  DatasetTabs,
  usePerceptronTrainer,
  type Activation,
  type LabeledPoint,
  type Params,
  SparklineLoss,
  makeCoreAdapter,
  ConfusionMatrix,
  RocCurve,
  Tooltip,
  GlossaryDrawer,
  TopTabs,
  Card,
  computeConfusion,
  computeRoc,
  usePersistentState,
  makeSeparable,
  makeXor,
  makeNoisy,
  type PresetKind,
} from '@perceptron-visuals'
import { PerceptronSimulator } from '../features/Perceptron/PerceptronSimulator'

type DatasetKind = PresetKind
type LossMode = 'steps' | 'epochs'

type EpochSummary = {
  acc: number
  loss: number
}

const DEFAULT_PARAMS: Params = { w: [0.2, -0.4], b: 0 }

const datasetFromKind = (kind: DatasetKind): LabeledPoint[] => {
  if (kind === 'separable') return makeSeparable()
  if (kind === 'xor') return makeXor()
  if (kind === 'noisy') return makeNoisy()
  return []
}

const isLabeledPointArray = (value: unknown): value is LabeledPoint[] => {
  if (!Array.isArray(value)) return false
  return value.every((entry) => {
    if (typeof entry !== 'object' || entry === null) return false
    const candidate = entry as { x?: unknown; y?: unknown }
    if (!Array.isArray(candidate.x) || candidate.x.length !== 2) return false
    const [x1, x2] = candidate.x
    if (typeof x1 !== 'number' || typeof x2 !== 'number') return false
    return candidate.y === 0 || candidate.y === 1
  })
}

const defaultLearningRate = (mode: Activation): number => (mode === 'sigmoid' ? 0.5 : 0.1)
const SNAPSHOT_LABELS = ['init', 'mid', 'final'] as const
const SNAPSHOT_LIMIT = SNAPSHOT_LABELS.length
const createSnapshotId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

type SnapshotLabel = (typeof SNAPSHOT_LABELS)[number]

type SnapshotEntry = {
  id: string
  label: SnapshotLabel
  params: { w: [number, number]; b: number }
}

const createOverlayVisibility = (): Record<SnapshotLabel, boolean> => ({
  init: false,
  mid: false,
  final: false,
})

const overlayStyleLookup: Record<SnapshotLabel, { color: string; dash: [number, number] }> = {
  init: { color: '#7c3aed', dash: [4, 4] },
  mid: { color: '#0ea5e9', dash: [2, 6] },
  final: { color: '#22c55e', dash: [8, 4] },
}

const overlaySwatchStyle = (label: SnapshotLabel): React.CSSProperties => {
  const { color, dash } = overlayStyleLookup[label]
  const [dashLength, gapLength] = dash
  const patternWidth = dashLength + gapLength
  return {
    backgroundImage: `repeating-linear-gradient(to right, ${color}, ${color} ${dashLength}px, transparent ${dashLength}px, transparent ${patternWidth}px)`,
    backgroundSize: `${patternWidth}px 2px`,
  }
}

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
  </div>
)

export const PerceptronLabPanel: React.FC = () => {
  const [activation, setActivation] = usePersistentState<Activation>('pl.activation', 'step')
  const [datasetKind, setDatasetKind] = usePersistentState<DatasetKind>(
    'pl.datasetKind',
    'separable',
  )
  const [dataset, setDataset] = useState<LabeledPoint[]>(() => datasetFromKind(datasetKind))

  const [initial] = useState<Params>(DEFAULT_PARAMS)
  const [epochs, setEpochs] = usePersistentState<number>('pl.epochs', 50)
  const [learningRate, setLearningRate] = usePersistentState<number>(
    'pl.lr',
    defaultLearningRate('step'),
  )
  const [rngSeed, setRngSeed] = usePersistentState<number>('pl.seed', 12345)

  const [lossByStep, setLossByStep] = useState<number[]>([])
  const [lossByEpoch, setLossByEpoch] = useState<number[]>([])
  const [lossMode, setLossMode] = usePersistentState<LossMode>('pl.lossGranularity', 'steps')

  const [threshold, setThreshold] = usePersistentState<number>('pl.tau', 0.5)
  const handleThresholdChange = useCallback((value: number) => {
    setThreshold((current) => {
      const next = Number.isFinite(value) ? value : current
      if (Number.isNaN(next)) return current
      return Math.min(1, Math.max(0, next))
    })
  }, [])
  const [useThresholdBoundary, setUseThresholdBoundary] = useState<boolean>(false)
  const [showBaselineBoundary, setShowBaselineBoundary] = useState<boolean>(true)
  const [showMarginBand, setShowMarginBand] = usePersistentState<boolean>(
    'pl.showMarginBand',
    false,
  )
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([])
  const [visibleOverlayIds, setVisibleOverlayIds] = usePersistentState<string[]>(
    'pl.snapshotOverlayIds',
    [],
  )
  const [resetSnapshotId, setResetSnapshotId] = useState<string | null>(null)

  const resetSelectId = useId()

  const [addLabel, setAddLabel] = useState<0 | 1>(1)

  const adapter = useMemo(() => makeCoreAdapter(initial), [initial])

  const [state, controls] = usePerceptronTrainer({
    data: dataset,
    initial,
    activation,
    lr: learningRate,
    epochs,
    shuffle: true,
    stepsPerFrame: 4,
    adapter,
    rngSeed,
    onEpochEnd: ({ metrics }: { epoch: number; params: Params; metrics: EpochSummary }) => {
      setLossByEpoch((prev) => {
        const next = [...prev, metrics.loss]
        const cap = 400
        return next.length > cap ? next.slice(next.length - cap) : next
      })
    },
  })

  const overlayVisibility = useMemo<Record<SnapshotLabel, boolean>>(() => {
    const base = createOverlayVisibility()
    snapshots.forEach((entry) => {
      base[entry.label] = visibleOverlayIds.includes(entry.id)
    })
    return base
  }, [snapshots, visibleOverlayIds])

  const { start, pause, reset, stepOnce, setLr: setTrainerLearningRate } = controls

  const resetHistories = useCallback(() => {
    setLossByStep([])
    setLossByEpoch([])
    setSnapshots([])
    setVisibleOverlayIds([])
  }, [setVisibleOverlayIds])

  const resetAll = useCallback(() => {
    resetHistories()
    reset()
  }, [reset, resetHistories])

  useEffect(() => {
    if (snapshots.length === 0) {
      setResetSnapshotId(null)
      return
    }
    setResetSnapshotId((current) => {
      if (current && snapshots.some((entry) => entry.id === current)) {
        return current
      }
      return snapshots[snapshots.length - 1]?.id ?? null
    })
  }, [snapshots])

  const selectedSnapshot = useMemo(() => {
    if (!resetSnapshotId) return null
    return snapshots.find((entry) => entry.id === resetSnapshotId) ?? null
  }, [resetSnapshotId, snapshots])

  const handleResetToSnapshot = () => {
    if (!selectedSnapshot) return
    reset(selectedSnapshot.params)
    setLossByStep([])
    setLossByEpoch([])
  }

  useEffect(() => {
    setLossByStep((prev) => {
      const next = [...prev, state.loss]
      const cap = 1000
      return next.length > cap ? next.slice(next.length - cap) : next
    })
  }, [state.loss, state.epoch, state.step])

  useEffect(() => {
    resetAll()
  }, [dataset, resetAll])

  const handleActivationChange = (value: Activation) => {
    setActivation(value)
    const nextLr = defaultLearningRate(value)
    setLearningRate(nextLr)
    setTrainerLearningRate(nextLr)
    resetAll()
  }

  const handleLearningRateInput = (raw: string) => {
    const parsed = Number.parseFloat(raw)
    if (Number.isNaN(parsed)) return
    setLearningRate(parsed)
    setTrainerLearningRate(parsed)
  }

  const handleEpochsInput = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isNaN(parsed)) return
    setEpochs(parsed)
  }

  const handleThresholdSlider = (raw: string) => {
    const parsed = Number.parseFloat(raw)
    if (Number.isNaN(parsed)) return
    handleThresholdChange(parsed)
  }

  const handleThresholdGuide = useCallback(
    (value: number) => {
      handleThresholdChange(value)
    },
    [handleThresholdChange],
  )

  const handleDatasetClick = (value: DatasetKind) => {
    setDatasetKind(value)
    if (value === 'custom') {
      setDataset([])
    } else {
      setDataset(datasetFromKind(value))
    }
  }

  const handleAddPoint = (point: LabeledPoint) => {
    const nextLabel = datasetKind === 'custom' ? addLabel : point.y
    setDatasetKind('custom')
    setDataset((prev) => [...prev, { x: point.x, y: nextLabel }])
  }

  const clearDataset = () => {
    setDataset([])
    setDatasetKind('custom')
  }

  const addBlob = (center: [number, number], label: 0 | 1, count = 30) => {
    setDatasetKind('custom')
    const [cx, cy] = center
    const points: LabeledPoint[] = []
    for (let i = 0; i < count; i += 1) {
      points.push({
        x: [cx + (Math.random() - 0.5) * 0.4, cy + (Math.random() - 0.5) * 0.4],
        y: label,
      })
    }
    setDataset((prev) => [...prev, ...points])
  }

  const exportDatasetJson = useCallback(() => JSON.stringify(dataset, null, 2), [dataset])

  const importDatasetJson = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json) as unknown
        if (!isLabeledPointArray(parsed)) {
          throw new Error('Expected an array of { x: [number, number], y } objects')
        }
        setDataset(parsed.map((point) => ({ x: [point.x[0], point.x[1]], y: point.y })))
        setDatasetKind('custom')
      } catch (error) {
        if (typeof window !== 'undefined') {
          window.alert(`Import failed: ${(error as Error).message}`)
        }
      }
    },
    [setDataset, setDatasetKind],
  )

  const handlePresetSelection = (kind: PresetKind, points: LabeledPoint[]) => {
    setDatasetKind(kind)
    setDataset(points)
  }

  const saveSnapshot = useCallback(() => {
    const entry: SnapshotEntry = {
      id: createSnapshotId(),
      label: 'final',
      params: {
        w: [state.params.w[0], state.params.w[1]] as [number, number],
        b: state.params.b,
      },
    }
    setSnapshots((prev) => {
      const activeLabels = new Set<SnapshotLabel>()
      for (const item of prev) {
        if (visibleOverlayIds.includes(item.id)) {
          activeLabels.add(item.label)
        }
      }
      const appended = [...prev, entry]
      const capped =
        appended.length > SNAPSHOT_LIMIT
          ? appended.slice(appended.length - SNAPSHOT_LIMIT)
          : appended
      const normalized = capped.map<SnapshotEntry>((item, index) => ({
        ...item,
        label: SNAPSHOT_LABELS[Math.min(index, SNAPSHOT_LABELS.length - 1)] as SnapshotLabel,
      }))
      const nextVisibleIds = normalized
        .filter((item) => activeLabels.has(item.label))
        .map((item) => item.id)
      setVisibleOverlayIds(nextVisibleIds)
      return normalized
    })
  }, [setSnapshots, setVisibleOverlayIds, state.params, visibleOverlayIds])

  const clearSnapshot = () => {
    setSnapshots([])
    setVisibleOverlayIds([])
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const tagName = target?.tagName.toLowerCase()
      const isEditable =
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        tagName === 'button' ||
        target?.getAttribute('contenteditable') === 'true' ||
        target?.isContentEditable === true

      if (isEditable) {
        return
      }

      if (event.key === ' ') {
        event.preventDefault()
        if (state.running) {
          pause()
        } else {
          start()
        }
        return
      }

      const normalized = event.key.toLowerCase()
      if (normalized === 'n') {
        if (!state.running) {
          event.preventDefault()
          stepOnce()
        }
        return
      }

      if (normalized === 'r') {
        event.preventDefault()
        resetAll()
        return
      }

      if (normalized === 's') {
        event.preventDefault()
        saveSnapshot()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [pause, resetAll, saveSnapshot, start, state.running, stepOnce])

  const customControls = (
    <div className="space-y-6 text-sm text-slate-700">
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Add label
        </span>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="addLabel"
              checked={addLabel === 0}
              onChange={() => setAddLabel(0)}
            />
            0
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="addLabel"
              checked={addLabel === 1}
              onChange={() => setAddLabel(1)}
            />
            1
          </label>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-3 py-2 font-medium shadow-sm transition hover:bg-slate-100"
          onClick={() => addBlob([-0.6, -0.6], 0)}
        >
          + Blob 0 (−0.6, −0.6)
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-3 py-2 font-medium shadow-sm transition hover:bg-slate-100"
          onClick={() => addBlob([0.6, 0.6], 1)}
        >
          + Blob 1 (0.6, 0.6)
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-3 py-2 font-medium shadow-sm transition hover:bg-slate-100"
          onClick={() => addBlob([0.6, -0.6], 1)}
        >
          + Blob 1 (0.6, −0.6)
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-3 py-2 font-medium shadow-sm transition hover:bg-slate-100"
          onClick={() => addBlob([-0.6, 0.6], 0)}
        >
          + Blob 0 (−0.6, 0.6)
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100"
          onClick={clearDataset}
        >
          Clear dataset
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
          onClick={saveSnapshot}
        >
          Save snapshot
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60"
          onClick={clearSnapshot}
          disabled={snapshots.length === 0}
        >
          Clear snapshots
        </button>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Saved snapshots
        </span>
        {snapshots.length === 0 ? (
          <p className="text-xs text-slate-500">No snapshots yet.</p>
        ) : (
          <ul className="space-y-1 text-xs text-slate-600">
            {snapshots.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-medium text-slate-700 capitalize">
                  <span
                    className="inline-block h-0.5 w-6 rounded-full"
                    style={overlaySwatchStyle(entry.label)}
                  />
                  {entry.label}
                </span>
                <code className="rounded bg-slate-100 px-2 py-0.5 text-[10px]">
                  {`w=[${entry.params.w[0].toFixed(2)}, ${entry.params.w[1].toFixed(2)}] b=${entry.params.b.toFixed(2)}`}
                </code>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Overlay visibility
        </span>
        <div className="space-y-1">
          {SNAPSHOT_LABELS.map((label) => {
            const available = snapshots.some((entry) => entry.label === label)
            return (
              <label
                key={label}
                className="flex items-center gap-2 text-sm text-slate-600 capitalize"
              >
                <input
                  type="checkbox"
                  checked={overlayVisibility[label]}
                  onChange={(event) => {
                    const enabled = event.target.checked
                    const targetSnapshot = snapshots.find((entry) => entry.label === label)
                    if (!targetSnapshot) return
                    setVisibleOverlayIds((prevIds) => {
                      const sanitized = prevIds.filter((id) =>
                        snapshots.some((entry) => entry.id === id),
                      )
                      if (enabled) {
                        if (sanitized.includes(targetSnapshot.id)) {
                          return sanitized
                        }
                        return [...sanitized, targetSnapshot.id]
                      }
                      return sanitized.filter((id) => id !== targetSnapshot.id)
                    })
                  }}
                  disabled={!available}
                />
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-0.5 w-6 rounded-full"
                    style={overlaySwatchStyle(label)}
                  />
                  {label}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label
          className="text-xs font-semibold uppercase tracking-wide text-slate-500"
          htmlFor={resetSelectId}
        >
          Reset to snapshot
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            id={resetSelectId}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:max-w-[10rem]"
            value={resetSnapshotId ?? ''}
            onChange={(event) => setResetSnapshotId(event.target.value || null)}
            disabled={snapshots.length === 0}
          >
            {snapshots.length === 0 ? (
              <option value="">No snapshots saved</option>
            ) : (
              snapshots.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {`${entry.label} — w=[${entry.params.w[0].toFixed(2)}, ${entry.params.w[1].toFixed(2)}], b=${entry.params.b.toFixed(2)}`}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60"
            onClick={handleResetToSnapshot}
            disabled={!selectedSnapshot}
          >
            Reset to snapshot
          </button>
        </div>
      </div>
    </div>
  )

  useEffect(() => {
    setTrainerLearningRate(learningRate)
  }, [learningRate, setTrainerLearningRate])

  useEffect(() => {
    reset()
  }, [adapter, reset])

  const confusion = useMemo(() => {
    if (activation !== 'sigmoid' || dataset.length === 0) return null
    return computeConfusion(state.params, dataset, threshold)
  }, [activation, dataset, state.params, threshold])

  const roc = useMemo(() => {
    if (activation !== 'sigmoid' || dataset.length === 0) return { points: [], auc: null }
    return computeRoc(state.params, dataset, 121)
  }, [activation, dataset, state.params])

  const activeSnapshotParams = useMemo(
    () =>
      snapshots
        .filter((entry) => visibleOverlayIds.includes(entry.id))
        .map((entry) => entry.params),
    [snapshots, visibleOverlayIds],
  )

  const sparklineValues = lossMode === 'steps' ? lossByStep : lossByEpoch

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:gap-12">
        <div className="space-y-10">
          <Card className="rounded-3xl border-slate-200 bg-white shadow-sm p-0">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">Simulation controls</h2>
              <p className="mt-1 text-sm text-slate-500">
                Configure the activation rule, choose a dataset, and tune the training cadence.
              </p>
            </div>
            <div className="space-y-6 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Activation
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={activation}
                    onChange={(event) => handleActivationChange(event.target.value as Activation)}
                  >
                    <option value="step">step (perceptron)</option>
                    <option value="sigmoid">sigmoid (logistic)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Dataset
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={datasetKind}
                    onChange={(event) => handleDatasetClick(event.target.value as DatasetKind)}
                  >
                    <option value="separable">linearly separable</option>
                    <option value="xor">XOR</option>
                    <option value="noisy">noisy separable</option>
                    <option value="custom">custom (editable)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  η (learning-rate)
                  <input
                    type="number"
                    step="0.01"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={learningRate}
                    onChange={(event) => handleLearningRateInput(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Epochs
                  <input
                    type="number"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={epochs}
                    onChange={(event) => handleEpochsInput(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  <span className="inline-flex items-center">
                    RNG seed
                    <Tooltip label="Makes runs reproducible." />
                  </span>
                  <input
                    type="number"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={rngSeed}
                    onChange={(event) => {
                      const next = Number.parseInt(event.target.value, 10)
                      if (Number.isNaN(next)) return
                      setRngSeed(next)
                      resetAll()
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Loss granularity
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={lossMode}
                    onChange={(event) => setLossMode(event.target.value as LossMode)}
                  >
                    <option value="steps">per-step</option>
                    <option value="epochs">per-epoch</option>
                  </select>
                </label>
              </div>

              {activation === 'sigmoid' ? (
                <Card className="rounded-2xl border-slate-200 bg-slate-50">
                  <div className="min-w-0 grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      Threshold τ
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={threshold}
                        onChange={(event) => handleThresholdSlider(event.target.value)}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        τ = {threshold.toFixed(2)}
                      </span>
                    </label>
                    <div className="min-w-0 flex flex-col gap-3 text-sm text-slate-600">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={useThresholdBoundary}
                          onChange={(event) => setUseThresholdBoundary(event.target.checked)}
                        />
                        Use τ for decision boundary (logit shift)
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={showBaselineBoundary}
                          onChange={(event) => setShowBaselineBoundary(event.target.checked)}
                        />
                        Show baseline τ = 0.5
                      </label>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="rounded-2xl border-slate-200 bg-slate-50 text-sm text-slate-500">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="font-medium text-slate-500">τ controls disabled</span>
                    <Tooltip label="Why disabled?">
                      τ and ROC require probabilities from σ(𝑧). The perceptron’s step activation is
                      not probabilistic.
                    </Tooltip>
                  </div>
                </Card>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
                  onClick={start}
                  disabled={state.running}
                >
                  Start training
                </button>
                <button
                  className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-60"
                  onClick={pause}
                  disabled={!state.running}
                >
                  Pause
                </button>
                <button
                  className="rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-300 disabled:opacity-60"
                  onClick={() => stepOnce()}
                  disabled={state.running}
                >
                  Step once
                </button>
                <button
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-200"
                  onClick={resetAll}
                >
                  Reset
                </button>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 bg-white shadow-sm p-0">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">Training snapshot</h2>
              <p className="mt-1 text-sm text-slate-500">
                Track epoch progress, accuracy, loss, and current parameters in real time.
              </p>
            </div>
            <div className="space-y-6 px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Stat label="Epoch" value={state.epoch.toString()} />
                <Stat label="Step" value={state.step.toString()} />
                <Stat label="Accuracy" value={`${(state.acc * 100).toFixed(1)}%`} />
                <Stat label="Loss" value={state.loss.toFixed(4)} />
                <Stat
                  label="Parameters"
                  value={`w=[${state.params.w[0].toFixed(2)}, ${state.params.w[1].toFixed(2)}], b=${state.params.b.toFixed(2)}`}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">Loss trend</h3>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {lossMode === 'steps' ? 'Per update' : 'Per epoch'}
                  </span>
                </div>
                <Card className="border-slate-200 bg-slate-50 rounded-2xl">
                  <div className="min-w-0">
                    <SparklineLoss values={sparklineValues} width={720} height={72} />
                  </div>
                </Card>
                <p className="text-xs text-slate-500">
                  Switch granularity to compare micro-updates with per-epoch trends.
                </p>
              </div>
            </div>
          </Card>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Decision boundary</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Observe how the separating line evolves as the perceptron trains.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-0.5 w-6 rounded-full bg-slate-900" /> Active
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-0.5 w-6 rounded-full border-b border-slate-400" />{' '}
                  Baseline τ=0.5
                </span>
                {SNAPSHOT_LABELS.map((label) => (
                  <span key={label} className="inline-flex items-center gap-2 capitalize">
                    <span
                      className="inline-block h-0.5 w-6 rounded-full"
                      style={overlaySwatchStyle(label)}
                    />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6">
              <label className="mb-3 inline-flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={showMarginBand}
                  onChange={(event) => setShowMarginBand(event.target.checked)}
                />
                Show margin band
              </label>
              <Card className="overflow-x-auto rounded-2xl border-slate-200 bg-slate-50">
                <div className="min-w-0">
                  <DecisionBoundaryCanvas
                    data={dataset}
                    params={state.params}
                    activation={activation}
                    width={720}
                    height={520}
                    threshold={threshold}
                    showMarginBand={showMarginBand}
                    adjustBoundaryByThreshold={activation === 'sigmoid' && useThresholdBoundary}
                    showBaselineBoundary={activation === 'sigmoid' && showBaselineBoundary}
                    baselineThreshold={0.5}
                    snapshotParams={activeSnapshotParams}
                    {...(datasetKind === 'custom' ? { onAddPoint: handleAddPoint } : {})}
                  />
                </div>
              </Card>
              <p className="mt-3 text-sm text-slate-500">
                In <span className="font-semibold text-slate-700">custom</span> mode, click the
                plane to add class <span className="font-semibold">{addLabel}</span> examples. Use
                the controls on the right to swap labels or generate clusters.
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-10 lg:sticky lg:top-24">
          <Card className="space-y-6 rounded-3xl border-slate-200 bg-white shadow-sm p-0">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">Dataset studio</h2>
              <p className="mt-1 text-sm text-slate-500">
                Curate points, toggle labels, and manage presets.
              </p>
            </div>
            <div className="px-6 pb-6">
              <DatasetTabs
                active={datasetKind}
                dataset={dataset}
                customControls={customControls}
                onPreset={handlePresetSelection}
                onImport={importDatasetJson}
                onExport={exportDatasetJson}
                onClear={clearDataset}
              />

              {activation === 'sigmoid' ? (
                <Card className="mt-6" title={`Thresholded metrics (τ = ${threshold.toFixed(2)})`}>
                  <div className="min-w-0 grid grid-cols-1 gap-3 items-start md:grid-cols-2">
                    <div className="min-w-0 overflow-hidden">
                      {confusion ? (
                        <div className="rounded-lg border p-2 text-xs leading-tight overflow-x-auto">
                          <ConfusionMatrix metrics={confusion} showSummary={false} />
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Add data to view confusion metrics.
                        </p>
                      )}
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      {roc.points.length > 0 ? (
                        <div className="rounded-lg border p-2">
                          <RocCurve
                            points={roc.points}
                            auc={roc.auc}
                            width={280}
                            height={220}
                            threshold={threshold}
                            onThresholdChange={handleThresholdGuide}
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Add data to generate the ROC curve.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm leading-snug sm:grid-cols-2">
                    <div>
                      Accuracy: {confusion ? `${(confusion.accuracy * 100).toFixed(1)}%` : '—'}
                    </div>
                    <div>
                      Precision: {confusion ? `${(confusion.precision * 100).toFixed(1)}%` : '—'}
                    </div>
                    <div>
                      Recall (TPR): {confusion ? `${(confusion.recall * 100).toFixed(1)}%` : '—'}
                    </div>
                    <div>F₁: {confusion ? confusion.f1.toFixed(3) : '—'}</div>
                    <div>
                      Specificity (TNR):{' '}
                      {confusion ? `${(confusion.specificity * 100).toFixed(1)}%` : '—'}
                    </div>
                  </div>
                </Card>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>
      <GlossaryDrawer />
    </div>
  )
}

export const ClassicWeightTablePanel: React.FC = () => (
  <div className="mx-auto max-w-5xl px-6 py-10">
    <div className="mb-6 space-y-2">
      <h2 className="text-2xl font-semibold text-slate-900">Classic Weight Table</h2>
      <p className="text-sm text-slate-600">
        Prefer the original dial-and-table flow? It is still available for focused explorations.
      </p>
    </div>
    <Card className="rounded-3xl border-slate-200 bg-white p-6 shadow-sm">
      <div className="min-w-0">
        <PerceptronSimulator />
      </div>
    </Card>
  </div>
)

export const PerceptronPlayground: React.FC = () => (
  <TopTabs
    tabs={[
      { key: 'lab', label: 'Perceptron Lab', render: () => <PerceptronLabPanel /> },
      {
        key: 'classic',
        label: 'Classic Weight Table',
        render: () => <ClassicWeightTablePanel />,
      },
    ]}
  />
)

export default PerceptronPlayground
