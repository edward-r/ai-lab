'use client'

import { useMemo, useState } from 'react'
import type { ClarifyingQ, CriterionKey, Diagnosis, ImproveResult } from '@/lib/types'

type AnswerState = Partial<Record<CriterionKey, string>>

type DiagnoseResponse = {
  diagnosis: Diagnosis
  questions: ClarifyingQ[]
}

const criterionLabels: Record<CriterionKey, string> = {
  outcome: 'Outcome',
  outputFormat: 'Output Format',
  constraints: 'Constraints',
  context: 'Context',
  processRubric: 'Process & Rubric',
  uncertainty: 'Uncertainty',
}

const deriveAnswerState = (qs: ClarifyingQ[], previous?: AnswerState): AnswerState =>
  qs.reduce<AnswerState>((acc, question) => {
    acc[question.key] = previous?.[question.key] ?? ''
    return acc
  }, {})

const formatPercent = (value: number) => `${Math.round(value * 100)}%`

const HomePage = () => {
  const [prompt, setPrompt] = useState('')
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null)
  const [questions, setQuestions] = useState<ClarifyingQ[]>([])
  const [answers, setAnswers] = useState<AnswerState>({})
  const [result, setResult] = useState<ImproveResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [polishWithLLM, setPolishWithLLM] = useState(false)

  const baselineDiagnosis = result?.diagnosisBefore ?? diagnosis
  const improvedDiagnosis = result?.diagnosisAfter

  const overallDelta = useMemo(() => {
    if (!result) {
      return null
    }
    return result.diagnosisAfter.overall - result.diagnosisBefore.overall
  }, [result])

  const finalPrompt = result?.polishedPrompt ?? result?.improvedPrompt ?? ''

  const handleDiagnose = async () => {
    setError(null)
    setResult(null)
    setIsLoading(true)
    try {
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original: prompt }),
      })

      if (!response.ok) {
        const message = (await response.json()) as { error?: string }
        throw new Error(message.error ?? 'Unable to diagnose prompt.')
      }

      const data = (await response.json()) as DiagnoseResponse
      setDiagnosis(data.diagnosis)
      setQuestions(data.questions)
      setAnswers(deriveAnswerState(data.questions, answers))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImprove = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const response = await fetch('/api/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original: prompt,
          answers,
          polish: polishWithLLM,
        }),
      })

      if (!response.ok) {
        const message = (await response.json()) as { error?: string }
        throw new Error(message.error ?? 'Unable to improve prompt.')
      }

      const data = (await response.json()) as ImproveResult
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (key: CriterionKey, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <main className="container">
      <section className="hero">
        <h1>Prompt Maker</h1>
        <p>
          Paste a draft prompt, surface the biggest gaps, answer targeted questions, and receive an
          improved, contract-driven version.
        </p>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>1. Diagnose</h2>
          <p>Start with the rough prompt you would normally send.</p>
        </header>
        <textarea
          className="text-input"
          rows={8}
          placeholder="Paste your prompt or task description here..."
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <div className="actions">
          <button
            type="button"
            className="primary"
            onClick={handleDiagnose}
            disabled={isLoading || prompt.trim().length === 0}
          >
            {isLoading ? 'Working…' : 'Diagnose prompt'}
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </section>

      {baselineDiagnosis ? (
        <section className="panel">
          <header className="panel-header">
            <h2>2. Review score & gaps</h2>
            <p>Higher scores mean tighter specs. Tackle the lowest sections first.</p>
          </header>
          <div className="scores">
            {(Object.keys(criterionLabels) as CriterionKey[]).map((key) => {
              const beforeScore = baselineDiagnosis.scores[key]
              const afterScore = improvedDiagnosis?.scores[key]
              const activeDiagnosis = result ? improvedDiagnosis : baselineDiagnosis
              const notes: string[] = activeDiagnosis?.notes?.[key] ?? []
              return (
                <article key={key} className="score-card">
                  <h3>{criterionLabels[key]}</h3>
                  <div className="score-pair">
                    <span className="score-value">
                      {formatPercent(activeDiagnosis?.scores[key] ?? beforeScore)}
                    </span>
                    {result ? (
                      <span className="score-ghost">was {formatPercent(beforeScore)}</span>
                    ) : null}
                    {afterScore !== undefined && afterScore !== beforeScore ? (
                      <span
                        className={`delta ${afterScore >= beforeScore ? 'positive' : 'negative'}`}
                      >
                        {afterScore >= beforeScore ? '+' : ''}
                        {Math.round((afterScore - beforeScore) * 100)}%
                      </span>
                    ) : null}
                  </div>
                  {notes.length > 0 ? (
                    <ul>
                      {notes.map((note: string) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="note">Looking solid.</p>
                  )}
                </article>
              )
            })}
          </div>
          <div className="overall">
            <span>Overall:</span>
            <strong>
              {formatPercent(
                (result ? improvedDiagnosis : baselineDiagnosis)?.overall ??
                  baselineDiagnosis.overall,
              )}
            </strong>
            {overallDelta !== null ? (
              <span className={overallDelta >= 0 ? 'positive' : 'negative'}>
                {overallDelta >= 0 ? '▲' : '▼'}
                {`${overallDelta >= 0 ? '+' : ''}${Math.round(overallDelta * 100)}%`}
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      {questions.length > 0 ? (
        <section className="panel">
          <header className="panel-header">
            <h2>3. Clarify</h2>
            <p>Answer the highest-leverage questions to fill in missing details.</p>
          </header>
          <div className="question-list">
            {questions.map((question) => (
              <article key={question.key} className="question-card">
                <h3>{criterionLabels[question.key]}</h3>
                <p className="question-text">{question.question}</p>
                {question.options ? (
                  <div className="option-chips">
                    {question.options.map((option: string) => (
                      <button
                        key={option}
                        type="button"
                        className="chip"
                        onClick={() => handleAnswerChange(question.key, option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
                <textarea
                  className="text-input"
                  rows={3}
                  placeholder="Type your answer or paste specifics..."
                  value={answers[question.key] ?? ''}
                  onChange={(event) => handleAnswerChange(question.key, event.target.value)}
                />
                {question.hint ? <p className="hint">{question.hint}</p> : null}
              </article>
            ))}
          </div>
          <div className="toggle-row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={polishWithLLM}
                onChange={(event) => setPolishWithLLM(event.target.checked)}
              />
              <span>Polish final prompt with OpenAI</span>
            </label>
            <p className="hint">
              Runs a final wording pass via your server-side OpenAI key while preserving the
              contract structure.
            </p>
          </div>
          <div className="actions">
            <button
              type="button"
              className="primary"
              onClick={handleImprove}
              disabled={isLoading || prompt.trim().length === 0}
            >
              {isLoading ? 'Working…' : 'Generate improved prompt'}
            </button>
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="panel">
          <header className="panel-header">
            <h2>4. Improved prompt</h2>
            <p>
              Ready to copy directly into your chat or API call. Sections follow the prompt contract
              template.
            </p>
          </header>
          <textarea className="text-input prompt-output" rows={18} value={finalPrompt} readOnly />
          {result.polishedPrompt ? (
            <details className="secondary-output">
              <summary>View deterministic contract output</summary>
              <textarea
                className="text-input prompt-output"
                rows={12}
                value={result.improvedPrompt}
                readOnly
              />
            </details>
          ) : null}
          {result.polishError ? <p className="error">{result.polishError}</p> : null}
          {result.polishedPrompt && result.model ? (
            <p className="note model-note">
              Polished using {result.model}. Feel free to adjust in `OPENAI_MODEL`.
            </p>
          ) : null}
          <div className="after-analysis">
            <article>
              <h3>Before</h3>
              <p>{formatPercent(result.diagnosisBefore.overall)} overall</p>
            </article>
            <article>
              <h3>After</h3>
              <p>{formatPercent(result.diagnosisAfter.overall)} overall</p>
            </article>
          </div>
        </section>
      ) : null}
    </main>
  )
}

export default HomePage
