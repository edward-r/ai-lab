import React, { useMemo, useState } from 'react'
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

type TabKey = 'presets' | 'custom' | 'json'

type DatasetTabsProps = {
  active: PresetKind
  dataset: LabeledPoint[]
  customControls: React.ReactNode
  onPreset: (kind: PresetKind, data: LabeledPoint[]) => void
  onImport: (json: string) => void
  onExport: () => string
  onClear: () => void
}

const TAB_LABELS: Record<TabKey, string> = {
  presets: 'Presets',
  custom: 'Custom draw',
  json: 'JSON',
}

const presetOptions: Array<{ kind: PresetKind; label: string; make: () => LabeledPoint[] }> = [
  { kind: 'separable', label: 'Separable', make: makeSeparable },
  { kind: 'xor', label: 'XOR', make: makeXor },
  { kind: 'noisy', label: 'Noisy separable', make: makeNoisy },
]

export const DatasetTabs: React.FC<DatasetTabsProps> = ({
  active,
  dataset,
  customControls,
  onPreset,
  onImport,
  onExport,
  onClear,
}) => {
  const [tab, setTab] = useState<TabKey>('presets')
  const [importText, setImportText] = useState<string>('')

  const presetButtons = useMemo(() => {
    return presetOptions.map((preset) => {
      const isActive = active === preset.kind
      return (
        <button
          key={preset.kind}
          type="button"
          className={`rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            isActive
              ? 'border-blue-500 bg-blue-600 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
          }`}
          onClick={() => onPreset(preset.kind, preset.make())}
        >
          {preset.label}
        </button>
      )
    })
  }, [active, onPreset])

  const handleImport = () => {
    if (!importText.trim()) return
    onImport(importText)
  }

  const handleExport = async () => {
    try {
      const json = onExport()
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(json)
      }
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-sm font-medium text-slate-600">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => {
          const isActive = tab === key
          return (
            <button
              key={key}
              type="button"
              className={`rounded-lg px-3 py-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isActive ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-white/70'
              }`}
              onClick={() => setTab(key)}
            >
              {TAB_LABELS[key]}
            </button>
          )
        })}
      </div>

      {tab === 'presets' ? (
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex flex-wrap gap-2">{presetButtons}</div>
          <p className="text-xs text-slate-500">
            Tip: XOR is not linearly separable. Watch the perceptron struggle and try sigmoid mode.
          </p>
        </div>
      ) : null}

      {tab === 'custom' ? (
        <div className="space-y-4 text-sm text-slate-600">
          <p className="text-xs text-slate-500">
            Click the canvas to add points (⇧ adds label 1). Use the label toggle to choose the
            active class.
          </p>
          {customControls}
        </div>
      ) : null}

      {tab === 'json' ? (
        <div className="space-y-3 text-sm text-slate-600">
          <textarea
            className="h-32 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder='[{"x":[0.1,0.2],"y":1}, …]'
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
              onClick={handleImport}
            >
              Import dataset
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
              onClick={handleExport}
            >
              Copy current JSON
            </button>
            <button
              type="button"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100"
              onClick={onClear}
            >
              Clear dataset
            </button>
          </div>
        </div>
      ) : null}

      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Count: {dataset.length} points
      </div>
    </div>
  )
}
