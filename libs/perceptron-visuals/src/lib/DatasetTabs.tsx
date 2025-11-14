import React, { useMemo, useState } from 'react'
import type { LabeledPoint } from './usePerceptronTrainer'
import { presetOptions, type PresetKind } from './datasetPresets'
import { InfoTip } from './help/InfoTip'

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
  const [importError, setImportError] = useState<string | null>(null)
  const [importHasError, setImportHasError] = useState<boolean>(false)

  const presetButtons = useMemo(() => {
    return presetOptions.map((preset) => {
      const isActive = active === preset.kind
      const infoKey = preset.kind === 'xor' ? 'xor' : preset.kind === 'noisy' ? 'noisy' : null
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
          <span className="inline-flex items-center gap-1">
            {preset.label}
            {infoKey ? <InfoTip k={infoKey} /> : null}
          </span>
        </button>
      )
    })
  }, [active, onPreset])

  const handleImport = () => {
    if (!importText.trim()) return

    try {
      onImport(importText)
      setImportError(null)
      setImportHasError(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown import error'
      setImportError(message)
      setImportHasError(true)

      window.setTimeout(() => {
        setImportHasError(false)
        setImportError(null)
      }, 3000)
    }
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
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1">
              Presets
              <InfoTip k="presets" />
            </span>
          </div>
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
          <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
            <span>Import JSON</span>
            <InfoTip k="jsonImportExport" />
          </div>
          <textarea
            className={`h-32 w-full rounded-xl border px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 ${
              importHasError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder='[{"x":[0.1,0.2],"y":1}, …]'
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
          />
          {importError ? (
            <p className="text-xs text-red-600">Import failed: {importError}</p>
          ) : null}
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
