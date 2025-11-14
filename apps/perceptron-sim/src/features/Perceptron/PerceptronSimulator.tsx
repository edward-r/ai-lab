import React, { useMemo, useState } from 'react'
import { Dial } from '../../components/Dial'
import { Led } from '../../components/Led'
import { binaryCombinations, sigmoid, step, weightedSum } from '@perceptron/core'
import { InfoTip } from '@perceptron-visuals/help/InfoTip'

type ActivationKey = 'step' | 'sigmoid'

const activationFns: Record<ActivationKey, (z: number) => number> = { step, sigmoid }

export function PerceptronSimulator(): JSX.Element {
  const n = 3
  const [inputs, setInputs] = useState<number[]>(Array.from({ length: n }, () => 0))
  const [weights, setWeights] = useState<number[]>(Array.from({ length: n }, () => 0.5))
  const [bias, setBias] = useState<number>(0)
  const [activation, setActivation] = useState<ActivationKey>('step')
  const [learningRate, setLearningRate] = useState<number>(0.1)
  const [epoch, setEpoch] = useState<number>(0)
  const [targets, setTargets] = useState<number[]>(() => Array(1 << n).fill(0))
  const [showTable, setShowTable] = useState<boolean>(true)

  const z = useMemo(() => weightedSum(inputs, weights, bias), [inputs, weights, bias])
  const y = useMemo(() => activationFns[activation](z), [activation, z])
  const combos = useMemo<number[][]>(() => binaryCombinations(n), [n])

  function toggleInput(index: number): void {
    setInputs((prev) => prev.map((value, i) => (i === index ? 1 - value : value)))
  }

  function setWeight(index: number, value: number): void {
    setWeights((prev) => prev.map((weight, i) => (i === index ? value : weight)))
  }

  function trainEpoch(): void {
    const nextWeights = [...weights]
    let nextBias = bias

    combos.forEach((row, rowIndex) => {
      const target = targets[rowIndex] ?? 0
      const zRow = weightedSum(row, nextWeights, nextBias)
      const prediction = step(zRow)
      const error = target - prediction

      row.forEach((bit, bitIndex) => {
        const currentWeight = nextWeights[bitIndex] ?? 0
        nextWeights[bitIndex] = currentWeight + learningRate * error * bit
      })

      nextBias += learningRate * error
    })

    setWeights(nextWeights)
    setBias(nextBias)
    setEpoch((value) => value + 1)
  }

  return (
    <section className="mx-auto max-w-xl space-y-6 p-4">
      <h2 className="text-xl font-semibold">Perceptron</h2>

      <div className="flex items-center justify-center gap-6">
        {inputs.map((value, index) => (
          <button
            key={index}
            type="button"
            onClick={() => toggleInput(index)}
            className="flex flex-col items-center"
          >
            <Led on={value === 1} />
            <span className="mt-1 text-sm">x{index}</span>
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1 text-sm text-gray-700">
          w₁, w₂, b
          <InfoTip k="classicDials" />
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {weights.map((weight, index) => (
          <Dial
            key={index}
            value={weight}
            min={-2}
            max={2}
            step={0.01}
            label={`w${index}`}
            onChange={(value) => setWeight(index, value)}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Dial value={bias} min={-2} max={2} step={0.01} label="b" onChange={setBias} />
      </div>

      <div className="flex justify-center">
        <label className="flex items-center gap-2">
          <span>Activation:</span>
          <select
            value={activation}
            onChange={(event) => setActivation(event.target.value as ActivationKey)}
            className="rounded border p-1"
          >
            <option value="step">Step</option>
            <option value="sigmoid">Sigmoid</option>
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between rounded border bg-gray-50 p-3">
        <div>
          <p className="flex items-center gap-1">
            <span>
              z = ∑ᵢ wᵢxᵢ + b = <strong>{z.toFixed(2)}</strong>
            </span>
            <InfoTip k="classicDials" />
          </p>
          <p>
            φ(z) = <strong>{y.toFixed(2)}</strong>
          </p>
        </div>
        <div className="flex flex-col items-center">
          <Led on={y >= 0.5} size="md" />
          <span className="mt-1 text-sm">Output</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6">
        <Dial
          value={learningRate}
          min={0.01}
          max={1}
          step={0.01}
          label="η"
          onChange={setLearningRate}
        />
        <button className="rounded border px-3 py-1" type="button" onClick={trainEpoch}>
          <span className="inline-flex items-center gap-1">
            Train Epoch
            <InfoTip k="trainEpoch" />
          </span>
        </button>
        <span>Epoch: {epoch}</span>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={() => setShowTable((visible) => !visible)}
        >
          {showTable ? 'Hide' : 'Show'} Truth Table
        </button>
      </div>

      {showTable && (
        <div className="overflow-x-auto">
          <div className="mb-2 flex items-center gap-1 text-xs font-medium text-gray-700">
            <span>Truth table</span>
            <InfoTip k="truthTable" />
          </div>
          <table className="mt-4 w-full table-auto border-collapse">
            <thead>
              <tr>
                {Array.from({ length: n }).map((_, index) => (
                  <th key={index} className="border px-2">
                    x{index}
                  </th>
                ))}
                <th className="border px-2">Target</th>
                <th className="border px-2">z</th>
                <th className="border px-2">φ(z)</th>
              </tr>
            </thead>
            <tbody>
              {combos.map((row, rowIndex) => {
                const target = targets[rowIndex] ?? 0
                const zRow = weightedSum(row, weights, bias)
                const output = activationFns[activation](zRow)
                return (
                  <tr key={rowIndex}>
                    {row.map((bit, colIndex) => (
                      <td key={colIndex} className="border px-2 text-center">
                        {bit}
                      </td>
                    ))}
                    <td className="border px-2 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setTargets((list) =>
                            list.map((value, index) => (index === rowIndex ? 1 - target : value)),
                          )
                        }
                        className="mx-auto block"
                      >
                        <Led on={target === 1} />
                      </button>
                    </td>
                    <td className="border px-2 text-center">{zRow.toFixed(2)}</td>
                    <td className="border px-2 text-center">{output.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
