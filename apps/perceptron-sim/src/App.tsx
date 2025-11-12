import React from 'react'
import { PerceptronPlayground } from './app/PerceptronPlayground'
import { PerceptronSimulator } from './features/Perceptron/PerceptronSimulator'

export default function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6">
          <h1 className="text-3xl font-semibold text-slate-900">Perceptron Lab</h1>
          <p className="text-sm text-slate-600">
            Explore live decision boundaries, curate datasets, and compare metrics — the classic
            weight table remains just below for quick what-if tweaks.
          </p>
        </div>
      </header>
      <main className="space-y-16 pb-16">
        <section className="bg-gradient-to-b from-white to-transparent pb-4 pt-6">
          <PerceptronPlayground />
        </section>
        <section className="mx-auto max-w-5xl space-y-6 px-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">Classic Weight Table</h2>
            <p className="text-sm text-slate-600">
              Prefer the original dial-and-table flow? It is still available for focused
              explorations.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <PerceptronSimulator />
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 text-xs text-slate-500">
          Built with React, TypeScript, Tailwind, Vite, and Nx.
        </div>
      </footer>
    </div>
  )
}
