import React from 'react'
import { PerceptronSimulator } from './features/Perceptron/PerceptronSimulator'

export default function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b">
        <div className="mx-auto max-w-5xl p-4">
          <h1 className="text-2xl font-semibold">React Perceptron Simulator</h1>
          <p className="mt-1 text-sm text-gray-600">
            Interactive single-layer perceptron: adjust weights wᵢ, bias b, set targets, and train.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <PerceptronSimulator />
      </main>
      <footer className="mx-auto max-w-5xl p-4 text-xs text-gray-500">
        Built with React, TypeScript, Vite, Tailwind, and Vitest.
      </footer>
    </div>
  )
}
