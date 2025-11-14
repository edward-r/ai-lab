import React from 'react'
import { PerceptronPlayground } from './app/PerceptronPlayground'

export default function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6">
          <h1 className="text-3xl font-semibold text-slate-900">Perceptron Lab</h1>
          <p className="text-sm text-slate-600">
            Explore live decision boundaries, curate datasets, and compare metrics — use the tabs to
            switch between the lab and the classic weight table.
          </p>
        </div>
      </header>
      <main className="space-y-16 pb-16">
        <section className="bg-gradient-to-b from-white to-transparent pb-4 pt-6">
          <PerceptronPlayground />
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
