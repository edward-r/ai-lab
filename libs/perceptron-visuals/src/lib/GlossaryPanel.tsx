import React from 'react'

type GlossaryPanelProps = {
  compact?: boolean
}

type SectionProps = {
  title: string
  defaultOpen: boolean
  children: React.ReactNode
}

type CodeBlockProps = {
  code: string
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code }) => {
  const handleCopy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }

    try {
      await navigator.clipboard.writeText(code)
    } catch {
      // no-op
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-2 top-2 rounded bg-gray-200 px-2 py-0.5 text-xs hover:bg-gray-300"
        aria-label="Copy code"
        title="Copy"
      >
        Copy
      </button>
      <pre className="border bg-gray-50 p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

const Section: React.FC<SectionProps> = ({ title, defaultOpen, children }) => (
  <details className="rounded border" open={defaultOpen}>
    <summary className="select-none bg-gray-100 px-3 py-2 font-medium">{title}</summary>
    <div className="space-y-2 p-3">{children}</div>
  </details>
)

export const GlossaryPanel: React.FC<GlossaryPanelProps> = ({ compact = false }) => {
  const open = !compact

  const codeTypes = `export type Point2 = [number, number];\nexport type LabeledPoint = { x: Point2; y: 0 | 1 };\nexport type Params = { w: [number, number]; b: number };`

  const codeWeightedSum = `export const weightedSum = (x: Point2, w: [number, number], b: number): number =>\n  x[0] * w[0] + x[1] * w[1] + b; // z = w·x + b`

  const codeActivations = `export const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));\nexport const step = (z: number): 0 | 1 => (z >= 0 ? 1 : 0);\n// p = sigmoid(z)  // probability for class 1\n// ŷ = step(z)     // hard prediction (perceptron)`

  const codeLogitTau = `const logit = (t: number): number => {\n  const eps = 1e-12;\n  const c = Math.min(1 - eps, Math.max(eps, t));\n  return Math.log(c / (1 - c)); // logit(t) = ln(t/(1−t))\n};\n// For τ-boundary in sigmoid mode: use b' = b − logit(τ) when drawing the line\n// Standard (τ=0.5) boundary is just w·x + b = 0`

  const codeUpdates = `// Logistic (cross-entropy) — gradient descent\nexport const stepOnceLogistic = (p: Params, d: LabeledPoint, η: number): Params => {\n  const z = weightedSum(d.x, p.w, p.b);\n  const prob = sigmoid(z);\n  const g = prob - d.y; // ∂ℓ/∂z\n  return { w: [p.w[0] - η * g * d.x[0], p.w[1] - η * g * d.x[1]], b: p.b - η * g };\n};\n\n// Perceptron — mistake-driven update\nexport const stepOncePerceptron = (p: Params, d: LabeledPoint, η: number): Params => {\n  const t = d.y === 1 ? 1 : -1;\n  const z = weightedSum(d.x, p.w, p.b);\n  if (t * z <= 0) {\n    return { w: [p.w[0] + η * t * d.x[0], p.w[1] + η * t * d.x[1]], b: p.b + η * t };\n  }\n  return p;\n};`

  const codeMetrics = `export type ConfusionMetrics = {\n  TP: number; TN: number; FP: number; FN: number;\n  accuracy: number; precision: number; recall: number; specificity: number; f1: number;\n};\n\nexport const computeConfusion = (p: Params, data: LabeledPoint[], τ: number): ConfusionMetrics => {\n  let TP = 0;\n  let TN = 0;\n  let FP = 0;\n  let FN = 0;\n  for (const d of data) {\n    const prob = sigmoid(weightedSum(d.x, p.w, p.b));\n    const yHat = prob >= τ ? 1 : 0;\n    if (yHat === 1 && d.y === 1) TP++; else\n    if (yHat === 0 && d.y === 0) TN++; else\n    if (yHat === 1 && d.y === 0) FP++; else FN++;\n  }\n  const accuracy = (TP + TN) / Math.max(1, TP + TN + FP + FN);\n  const precision = TP + FP === 0 ? 0 : TP / (TP + FP);\n  const recall = TP + FN === 0 ? 0 : TP / (TP + FN);\n  const specificity = TN + FP === 0 ? 0 : TN / (TN + FP);\n  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);\n  return { TP, TN, FP, FN, accuracy, precision, recall, specificity, f1 };\n};`

  const codeRoc = `export type RocPoint = { fpr: number; tpr: number; threshold: number };\n\nexport const computeRoc = (p: Params, data: LabeledPoint[], steps = 101) => {\n  const points: RocPoint[] = [];\n  for (let i = 0; i < steps; i++) {\n    const τ = i / (steps - 1);\n    let TP = 0;\n    let TN = 0;\n    let FP = 0;\n    let FN = 0;\n    for (const d of data) {\n      const prob = sigmoid(weightedSum(d.x, p.w, p.b));\n      const yHat = prob >= τ ? 1 : 0;\n      if (yHat === 1 && d.y === 1) TP++; else\n      if (yHat === 0 && d.y === 0) TN++; else\n      if (yHat === 1 && d.y === 0) FP++; else FN++;\n    }\n    const tpr = TP + FN === 0 ? 0 : TP / (TP + FN);\n    const fpr = FP + TN === 0 ? 0 : FP / (FP + TN);\n    points.push({ fpr, tpr, threshold: τ });\n  }\n  const sorted = [...points].sort((a, b) => (a.fpr === b.fpr ? a.tpr - b.tpr : a.fpr - b.fpr));\n  let auc = 0;\n  for (let i = 1; i < sorted.length; i++) {\n    const prev = sorted[i - 1];\n    const curr = sorted[i];\n    auc += ((prev.tpr + curr.tpr) / 2) * (curr.fpr - prev.fpr);\n  }\n  return { points: sorted, auc };\n};`

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Glossary (symbols → code)</h2>

      <Section title="Inputs & parameters" defaultOpen={open}>
        <ul className="ml-5 list-disc text-sm">
          <li>𝒙 = [x₁, x₂], 𝑦 ∈ {'{0, 1}'}</li>
          <li>𝒘 = [w₁, w₂], b</li>
          <li>𝑧 = 𝒘·𝒙 + b</li>
        </ul>
        <CodeBlock code={codeTypes} />
        <CodeBlock code={codeWeightedSum} />
      </Section>

      <Section title="Activations" defaultOpen={open}>
        <ul className="ml-5 list-disc text-sm">
          <li>σ(𝑧) = 1 ∕ (1 + e^(−𝑧)) — probability for class 1</li>
          <li>step(𝑧) = 1 if 𝑧 ≥ 0 else 0 — perceptron prediction</li>
        </ul>
        <CodeBlock code={codeActivations} />
      </Section>

      <Section title="Threshold & geometry" defaultOpen={open}>
        <ul className="ml-5 list-disc text-sm">
          <li>Classify 1 when 𝑝 ≥ τ</li>
          <li>logit(τ) = ln(τ ∕ (1 − τ))</li>
          <li>b′ = b − logit(τ) shifts the sigmoid boundary</li>
        </ul>
        <CodeBlock code={codeLogitTau} />
      </Section>

      <Section title="Losses & updates" defaultOpen={open}>
        <ul className="ml-5 list-disc text-sm">
          <li>Logistic: gradient descent on cross-entropy</li>
          <li>Perceptron: mistake-driven update with t ∈ {'{−1, +1}'}</li>
        </ul>
        <CodeBlock code={codeUpdates} />
      </Section>

      <Section title="Metrics, ROC & AUC" defaultOpen={open}>
        <ul className="ml-5 list-disc text-sm">
          <li>Confusion: TP/TN/FP/FN, accuracy, precision, recall, specificity, F₁</li>
          <li>ROC: (FPR, TPR) sweep over τ; AUC via trapezoids</li>
        </ul>
        <CodeBlock code={codeMetrics} />
        <CodeBlock code={codeRoc} />
      </Section>
    </div>
  )
}
