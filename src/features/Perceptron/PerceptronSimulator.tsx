import React, { useMemo, useState } from 'react';
import { Dial } from '../../components/Dial';
import { Led } from '../../components/Led';
import { step, sigmoid } from '../../lib/activation';
import { binaryCombinations, weightedSum } from '../../lib/perceptron';

type ActivationKey = 'step' | 'sigmoid';

const activationFns: Record<ActivationKey, (z: number) => number> = { step, sigmoid };

export function PerceptronSimulator(): JSX.Element {
  const n = 3;
  const [inputs, setInputs] = useState<number[]>(Array.from({ length: n }, () => 0));
  const [weights, setWeights] = useState<number[]>(Array.from({ length: n }, () => 0.5));
  const [bias, setBias] = useState<number>(0);
  const [activation, setActivation] = useState<ActivationKey>('step');
  const [learningRate, setLearningRate] = useState<number>(0.1);
  const [epoch, setEpoch] = useState<number>(0);
  const [targets, setTargets] = useState<number[]>(() => Array(1 << n).fill(0));
  const [showTable, setShowTable] = useState<boolean>(true);

  const z = useMemo(() => weightedSum(inputs, weights, bias), [inputs, weights, bias]);
  const y = useMemo(() => activationFns[activation](z), [activation, z]);
  const combos = useMemo(() => binaryCombinations(n), [n]);

  function toggleInput(i: number): void {
    setInputs((prev) => prev.map((v, j) => (j === i ? 1 - v : v)));
  }
  function setWeight(i: number, v: number): void {
    setWeights((prev) => prev.map((w, j) => (j === i ? v : w)));
  }
  function trainEpoch(): void {
    let w = [...weights],
      b = bias;
    for (let r = 0; r < combos.length; r++) {
      const row = combos[r];
      const zRow = weightedSum(row, w, b);
      const yPred = step(zRow);
      const yT = targets[r];
      const err = yT - yPred;
      for (let i = 0; i < n; i++) w[i] += learningRate * err * row[i];
      b += learningRate * err;
    }
    setWeights(w);
    setBias(b);
    setEpoch((e) => e + 1);
  }

  return (
    <section className="mx-auto max-w-xl space-y-6 p-4">
      <h2 className="text-xl font-semibold">Perceptron</h2>

      <div className="flex items-center justify-center gap-6">
        {inputs.map((x, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggleInput(i)}
            className="flex flex-col items-center"
          >
            <Led on={x === 1} />
            <span className="mt-1 text-sm">x{i}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {weights.map((w, i) => (
          <Dial
            key={i}
            value={w}
            min={-2}
            max={2}
            step={0.01}
            label={`w${i}`}
            onChange={(v) => setWeight(i, v)}
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
            onChange={(e) => setActivation(e.target.value as ActivationKey)}
            className="rounded border p-1"
          >
            <option value="step">Step</option>
            <option value="sigmoid">Sigmoid</option>
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between rounded border bg-gray-50 p-3">
        <div>
          <p>
            z = ∑ᵢ wᵢxᵢ + b = <strong>{z.toFixed(2)}</strong>
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
          Train Epoch
        </button>
        <span>Epoch: {epoch}</span>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={() => setShowTable((s) => !s)}
        >
          {showTable ? 'Hide' : 'Show'} Truth Table
        </button>
      </div>

      {showTable && (
        <div className="overflow-x-auto">
          <table className="mt-4 w-full table-auto border-collapse">
            <thead>
              <tr>
                {Array.from({ length: n }).map((_, i) => (
                  <th key={i} className="border px-2">
                    x{i}
                  </th>
                ))}
                <th className="border px-2">Target</th>
                <th className="border px-2">z</th>
                <th className="border px-2">φ(z)</th>
              </tr>
            </thead>
            <tbody>
              {combos.map((row, r) => {
                const zRow = weightedSum(row, weights, bias);
                const yRow = activationFns[activation](zRow);
                return (
                  <tr key={r}>
                    {row.map((v, c) => (
                      <td key={c} className="border px-2 text-center">
                        {v}
                      </td>
                    ))}
                    <td className="border px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setTargets((t) => t.map((vv, j) => (j === r ? 1 - vv : vv)))}
                        className="mx-auto block"
                      >
                        <Led on={targets[r] === 1} />
                      </button>
                    </td>
                    <td className="border px-2 text-center">{zRow.toFixed(2)}</td>
                    <td className="border px-2 text-center">{yRow.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
