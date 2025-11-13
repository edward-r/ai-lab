import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
  GlossaryPanel,
  computeConfusion,
  computeRoc,
  usePersistentState,
  makeSeparable,
  makeXor,
  makeNoisy,
  type PresetKind,
} from '@perceptron-visuals'

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

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
  </div>
)

export const PerceptronPlayground: React.FC = () => {
  const [activation, setActivation] = usePersistentState<Activation>('pl.activation', 'step')
  const [datasetKind, setDatasetKind] = useState<DatasetKind>('separable')
  const [dataset, setDataset] = useState<LabeledPoint[]>(() => datasetFromKind('separable'))

  const [initial] = useState<Params>(DEFAULT_PARAMS)
  const [epochs, setEpochs] = usePersistentState<number>('pl.epochs', 50)
  const [learningRate, setLearningRate] = usePersistentState<number>(
    'pl.lr',
    defaultLearningRate('step'),
  )
  const [rngSeed, setRngSeed] = usePersistentState<number>('pl.seed', 12345)

  const [lossByStep, setLossByStep] = useState<number[]>([])
  const [lossByEpoch, setLossByEpoch] = useState<number[]>([])
  const [lossMode, setLossMode] = useState<LossMode>('steps')

  const [threshold, setThreshold] = useState<number>(0.5)
  const handleThresholdChange = useCallback((value: number) => {
    setThreshold((current) => {
      const next = Number.isFinite(value) ? value : current
      if (Number.isNaN(next)) return current
      return Math.min(1, Math.max(0, next))
    })
  }, [])
  const [useThresholdBoundary, setUseThresholdBoundary] = useState<boolean>(false)
  const [showBaselineBoundary, setShowBaselineBoundary] = useState<boolean>(true)
  const [showMarginBand, setShowMarginBand] = useState<boolean>(false)
  const [snapshots, setSnapshots] = useState<
    Array<{ id: string; label: string; params: { w: [number, number]; b: number } }>
  >([])
  const [showSnapshotBoundary, setShowSnapshotBoundary] = useState<boolean>(false)

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

  const { start, pause, reset, stepOnce, setLr: setTrainerLearningRate } = controls

  const resetHistories = useCallback(() => {
    setLossByStep([])
    setLossByEpoch([])
    setSnapshots([])
    setShowSnapshotBoundary(false)
  }, [])

  const resetAll = useCallback(() => {
    resetHistories()
    reset()
  }, [reset, resetHistories])

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

  const saveSnapshot = () => {
    const entry = {
      id: createSnapshotId(),
      label: 'final',
      params: {
        w: [state.params.w[0], state.params.w[1]] as [number, number],
        b: state.params.b,
      },
    }
    setSnapshots((prev) => {
      const appended = [...prev, entry]
      const capped =
        appended.length > SNAPSHOT_LIMIT
          ? appended.slice(appended.length - SNAPSHOT_LIMIT)
          : appended
      return capped.map((item, index) => {
        const label = SNAPSHOT_LABELS[index] ?? SNAPSHOT_LABELS[SNAPSHOT_LABELS.length - 1]!
        return {
          ...item,
          label,
        }
      })
    })
    setShowSnapshotBoundary(true)
  }

  const clearSnapshot = () => {
    setSnapshots([])
    setShowSnapshotBoundary(false)
  }

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
              <li key={entry.id} className="flex items-center justify-between">
                <span className="font-medium text-slate-700">{entry.label}</span>
                <code className="rounded bg-slate-100 px-2 py-0.5 text-[10px]">
                  {`w=[${entry.params.w[0].toFixed(2)}, ${entry.params.w[1].toFixed(2)}] b=${entry.params.b.toFixed(2)}`}
                </code>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={showSnapshotBoundary}
          onChange={(event) => setShowSnapshotBoundary(event.target.checked)}
          disabled={snapshots.length === 0}
        />
        Show snapshot boundary
      </label>
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

  const latestSnapshot = useMemo(() => {
    if (snapshots.length === 0) return null
    return snapshots[snapshots.length - 1]
  }, [snapshots])

  const sparklineValues = lossMode === 'steps' ? lossByStep : lossByEpoch

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:gap-12">
        <div className="space-y-10">
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
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
                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-2">
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
                  <div className="flex flex-col gap-3 text-sm text-slate-600">
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
              ) : (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  <span className="font-medium text-slate-500">τ controls disabled</span>
                  <Tooltip label="Why disabled?">
                    τ and ROC require probabilities from σ(𝑧). The perceptron’s step activation is
                    not probabilistic.
                  </Tooltip>
                </div>
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
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <SparklineLoss values={sparklineValues} width={720} height={72} />
                </div>
                <p className="text-xs text-slate-500">
                  Switch granularity to compare micro-updates with per-epoch trends.
                </p>
              </div>
            </div>
          </section>

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
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-0.5 w-6 rounded-full border-b border-dotted border-violet-500" />{' '}
                  Snapshot
                </span>
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
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
                  snapshotParams={latestSnapshot ? latestSnapshot.params : null}
                  showSnapshotBoundary={showSnapshotBoundary && Boolean(latestSnapshot)}
                  {...(datasetKind === 'custom' ? { onAddPoint: handleAddPoint } : {})}
                />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                In <span className="font-semibold text-slate-700">custom</span> mode, click the
                plane to add class <span className="font-semibold">{addLabel}</span> examples. Use
                the controls on the right to swap labels or generate clusters.
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-10 lg:sticky lg:top-24">
          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
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
                <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Thresholded metrics (τ = {threshold.toFixed(2)})
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-hidden">
                      {confusion ? (
                        <div className="flex flex-col items-center gap-3">
                          <ConfusionMatrix metrics={confusion} />
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Add data to view confusion metrics.
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-hidden">
                      {roc.points.length > 0 ? (
                        <div className="flex justify-center">
                          <RocCurve
                            points={roc.points}
                            auc={roc.auc}
                            width={240}
                            height={240}
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

                  <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <span>
                      Precision: {confusion ? `${(confusion.precision * 100).toFixed(1)}%` : '—'}
                    </span>
                    <span>
                      Recall (TPR): {confusion ? `${(confusion.recall * 100).toFixed(1)}%` : '—'}
                    </span>
                    <span>F₁: {confusion ? confusion.f1.toFixed(3) : '—'}</span>
                    <span>
                      Specificity (TNR):{' '}
                      {confusion ? `${(confusion.specificity * 100).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Cheat sheet</h2>
            <p className="mt-1 text-sm text-slate-500">
              Snapshot of the math that powers the trainer, complete with copy-ready code blocks.
            </p>
            <div className="mt-4 max-h-[32rem] overflow-y-auto pr-2">
              <GlossaryPanel compact={false} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
