import path from 'node:path'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Key } from 'ink'
import TextInput from 'ink-text-input'
import Spinner from 'ink-spinner'

import {
  runGenerateCore,
  type GenerateCoreOptions,
  type StreamEventInput,
  type TokenTelemetry,
  type CoreMessage,
} from '../generate-command'
import { runTestCore, type TestCoreEvent } from '../test-command'
import type { TestCoreOptions } from '../test-command'
import type { FileContext } from '../file-context'
import { loadHistoryEntries, type HistoryEntry } from './history'
import {
  createRefinementController,
  type RefinementControllerHandle,
} from './refinement-controller'

export type AppProps = {
  initialIntent?: string
}

type ViewName = 'generate' | 'test' | 'history'

type FocusTarget = 'intent' | 'refinement' | 'none'

type ProgressEntry = {
  label: string
  scope: string | null
  state: 'start' | 'update' | 'stop'
  timestamp: number
}

type UploadEntry = {
  state: 'start' | 'finish'
  label: string
  timestamp: number
}

type PromptIteration = {
  iteration: number
  prompt: string | null
  tokens: number | null
  refinement: string | null
  timestamp: number
}

type GenerateRunState = {
  status: 'idle' | 'running' | 'success' | 'error'
  error: string | null
  telemetry: TokenTelemetry | null
  contextFiles: FileContext[]
  progress: ProgressEntry[]
  uploads: UploadEntry[]
  iterations: PromptIteration[]
  activity: CoreMessage[]
  finalPrompt: string | null
  lastRunAt: string | null
  awaitingRefinement: boolean
}

type TestRow = {
  index: number
  name: string
  status: 'pending' | 'running' | 'pass' | 'fail'
  reason: string | null
}

type TestRunState = {
  status: 'idle' | 'running' | 'success' | 'error'
  error: string | null
  suitePath: string
  rows: TestRow[]
  summary: { passed: number; failed: number } | null
}

const DEFAULT_TEST_FILE = 'prompt-tests.yaml'

const initialGenerateState: GenerateRunState = {
  status: 'idle',
  error: null,
  telemetry: null,
  contextFiles: [],
  progress: [],
  uploads: [],
  iterations: [],
  activity: [],
  finalPrompt: null,
  lastRunAt: null,
  awaitingRefinement: false,
}

const initialTestState: TestRunState = {
  status: 'idle',
  error: null,
  suitePath: DEFAULT_TEST_FILE,
  rows: [],
  summary: null,
}

export const App = ({ initialIntent = '' }: AppProps): JSX.Element => {
  const [activeView, setActiveView] = useState<ViewName>('generate')
  const [focusTarget, setFocusTarget] = useState<FocusTarget>('intent')
  const [intentDraft, setIntentDraft] = useState(initialIntent)
  const [generateState, setGenerateState] = useState<GenerateRunState>(initialGenerateState)
  const [testState, setTestState] = useState<TestRunState>(initialTestState)
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([])
  const [historyStatus, setHistoryStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [refinementDraft, setRefinementDraft] = useState('')
  const [refinementHandle, setRefinementHandle] = useState<RefinementControllerHandle | null>(null)

  const refreshHistory = useCallback(async () => {
    try {
      setHistoryStatus('loading')
      setHistoryError(null)
      const entries = await loadHistoryEntries()
      setHistoryEntries(entries)
      setHistoryStatus('idle')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load history.'
      setHistoryError(message)
      setHistoryStatus('error')
    }
  }, [])

  useEffect(() => {
    if (activeView === 'history' && historyStatus === 'idle' && historyEntries.length === 0) {
      void refreshHistory()
    }
  }, [activeView, historyEntries.length, historyStatus, refreshHistory])

  const handleGenerateEvent = useCallback((event: StreamEventInput) => {
    setGenerateState((prev) => {
      if (event.event === 'progress.update') {
        const entry: ProgressEntry = {
          label: event.label,
          scope: event.scope ?? null,
          state: event.state,
          timestamp: Date.now(),
        }
        return { ...prev, progress: [...prev.progress, entry].slice(-8) }
      }

      if (event.event === 'upload.state') {
        const entry: UploadEntry = {
          state: event.state,
          label: path.basename(event.detail.filePath),
          timestamp: Date.now(),
        }
        return { ...prev, uploads: [...prev.uploads, entry].slice(-6) }
      }

      if (event.event === 'context.telemetry') {
        return { ...prev, telemetry: event.telemetry }
      }

      if (event.event === 'generation.iteration.start' && event.latestRefinement) {
        const iterations = prev.iterations.filter((item) => item.iteration !== event.iteration)
        iterations.push({
          iteration: event.iteration,
          prompt: null,
          tokens: null,
          refinement: event.latestRefinement ?? null,
          timestamp: Date.now(),
        })
        return { ...prev, iterations }
      }

      if (event.event === 'generation.iteration.complete') {
        const iterations = prev.iterations.filter((item) => item.iteration !== event.iteration)
        iterations.push({
          iteration: event.iteration,
          prompt: event.prompt,
          tokens: event.tokens,
          refinement: null,
          timestamp: Date.now(),
        })
        return { ...prev, iterations }
      }

      if (event.event === 'interactive.awaiting') {
        return { ...prev, awaitingRefinement: true }
      }

      if (event.event === 'interactive.state') {
        if (event.phase === 'complete') {
          return { ...prev, awaitingRefinement: false }
        }
        if (event.phase === 'prompt' || event.phase === 'refine') {
          return { ...prev, awaitingRefinement: false }
        }
      }

      return prev
    })
  }, [])

  const handleContextResolved = useCallback((files: FileContext[]) => {
    setGenerateState((prev) => ({ ...prev, contextFiles: files }))
  }, [])

  const submitRefinement = useCallback(() => {
    const trimmed = refinementDraft.trim()
    if (!trimmed || !refinementHandle) {
      return
    }
    refinementHandle.submit(trimmed)
    setRefinementDraft('')
    setGenerateState((prev) => ({ ...prev, awaitingRefinement: false }))
  }, [refinementDraft, refinementHandle])

  const finishRefinement = useCallback(() => {
    if (!refinementHandle) {
      return
    }
    refinementHandle.finish()
    setGenerateState((prev) => ({ ...prev, awaitingRefinement: false }))
  }, [refinementHandle])

  const runGenerate = useCallback(async () => {
    if (generateState.status === 'running') {
      return
    }

    const trimmedIntent = intentDraft.trim()
    if (!trimmedIntent) {
      setGenerateState((prev) => ({ ...prev, status: 'error', error: 'Intent text is required.' }))
      return
    }

    setGenerateState({
      ...initialGenerateState,
      status: 'running',
      contextFiles: generateState.contextFiles,
    })

    const controllerHandle = createRefinementController()
    setRefinementHandle(controllerHandle)
    setRefinementDraft('')

    const options: GenerateCoreOptions = {
      intent: trimmedIntent,
      interactive: true,
      copy: false,
      openChatGpt: false,
      polish: false,
      json: false,
      quiet: true,
      progress: true,
      stream: 'none',
      showContext: false,
      contextFormat: 'text',
      help: false,
      context: [],
      urls: [],
      images: [],
      video: [],
      smartContext: false,
      inputIsTTY: true,
      outputIsTTY: true,
    }

    try {
      const result = await runGenerateCore(
        {
          ...options,
          interactiveController: controllerHandle.controller,
          onContextResolved: handleContextResolved,
        },
        handleGenerateEvent,
      )
      setGenerateState((prev) => ({
        ...prev,
        status: 'success',
        error: null,
        telemetry: result.telemetry,
        finalPrompt: result.finalPrompt ?? result.generatedPrompt ?? null,
        lastRunAt: new Date().toISOString(),
        activity: result.messages,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed.'
      setGenerateState((prev) => ({ ...prev, status: 'error', error: message }))
    } finally {
      controllerHandle.finish()
      setRefinementHandle(null)
      setGenerateState((prev) => ({ ...prev, awaitingRefinement: false }))
    }
  }, [
    generateState.contextFiles,
    generateState.status,
    handleContextResolved,
    handleGenerateEvent,
    intentDraft,
  ])

  const runTests = useCallback(async () => {
    if (testState.status === 'running') {
      return
    }

    setTestState({ ...initialTestState, suitePath: testState.suitePath, status: 'running' })

    const options: TestCoreOptions = {
      suite: { kind: 'file', path: testState.suitePath },
      workingDirectory: process.cwd(),
    }

    const handleEvent = (event: TestCoreEvent): void => {
      setTestState((prev) => {
        if (event.type === 'test:start') {
          const hasRow = prev.rows.some((row) => row.name === event.name)
          let nextRows: TestRow[]
          if (hasRow) {
            nextRows = prev.rows.map((row) => {
              if (row.name !== event.name) {
                return row
              }
              const updated: TestRow = { ...row, status: 'running', reason: null }
              return updated
            })
          } else {
            const newRow: TestRow = {
              index: event.index,
              name: event.name,
              status: 'running',
              reason: null,
            }
            nextRows = [...prev.rows, newRow]
          }
          return { ...prev, rows: nextRows }
        }

        if (event.type === 'test:complete') {
          const nextRows = prev.rows.map((row) => {
            if (row.name !== event.name) {
              return row
            }
            const updated: TestRow = {
              ...row,
              status: event.pass ? 'pass' : 'fail',
              reason: event.reason ?? null,
            }
            return updated
          })
          return { ...prev, rows: nextRows }
        }

        if (event.type === 'test:summary') {
          return { ...prev, summary: { passed: event.passed, failed: event.failed } }
        }

        return prev
      })
    }

    try {
      const result = await runTestCore(options, handleEvent)
      setTestState((prev) => ({
        ...prev,
        status: result.failed > 0 ? 'error' : 'success',
        error: result.failed > 0 ? 'Some tests failed.' : null,
        summary: { passed: result.passed, failed: result.failed },
        rows:
          result.results.length > 0
            ? result.results.map((testResult, index) => ({
                index: index + 1,
                name: testResult.name,
                status: testResult.pass ? 'pass' : 'fail',
                reason: testResult.reason ?? null,
              }))
            : prev.rows,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Test run failed.'
      setTestState((prev) => ({ ...prev, status: 'error', error: message }))
    }
  }, [testState.status, testState.suitePath])

  useInput(
    (input: string, key: Key) => {
      if (key.ctrl && input === '1') {
        setActiveView('generate')
      } else if (key.ctrl && input === '2') {
        setActiveView('test')
      } else if (key.ctrl && input === '3') {
        setActiveView('history')
      } else if (key.tab && activeView === 'generate') {
        const order: FocusTarget[] = ['intent', 'refinement', 'none']
        setFocusTarget((prev) => {
          const index = order.indexOf(prev)
          const resolvedIndex = index === -1 ? 0 : (index + 1) % order.length
          return order[resolvedIndex] ?? 'intent'
        })
      } else if (key.ctrl && key.return) {
        if (activeView === 'generate') {
          void runGenerate()
        } else if (activeView === 'test') {
          void runTests()
        }
      } else if (key.ctrl && (input === 'f' || input === 'F') && activeView === 'generate') {
        finishRefinement()
      } else if (input === 'g' && activeView === 'test') {
        void runTests()
      } else if (input === 'r') {
        if (activeView === 'generate') {
          setFocusTarget('refinement')
        } else if (activeView === 'history') {
          void refreshHistory()
        }
      }
    },
    { isActive: true },
  )

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} flexGrow={1}>
      <NavigationBar activeView={activeView} />
      <Box marginTop={1} flexGrow={1}>
        {activeView === 'generate' && (
          <GenerateView
            intent={intentDraft}
            onIntentChange={setIntentDraft}
            focus={focusTarget === 'intent'}
            state={generateState}
            refinementDraft={refinementDraft}
            onRefinementChange={setRefinementDraft}
            onSubmitRefinement={submitRefinement}
            awaitingRefinement={generateState.awaitingRefinement}
            refinementFocus={focusTarget === 'refinement'}
            canRefine={Boolean(refinementHandle)}
          />
        )}
        {activeView === 'test' && (
          <TestView
            state={testState}
            onSuitePathChange={(value) => setTestState((prev) => ({ ...prev, suitePath: value }))}
          />
        )}
        {activeView === 'history' && (
          <HistoryView entries={historyEntries} status={historyStatus} error={historyError} />
        )}
      </Box>
      <StatusBar view={activeView} generateState={generateState} testState={testState} />
    </Box>
  )
}

type NavigationProps = {
  activeView: ViewName
}

const NavigationBar = ({ activeView }: NavigationProps): JSX.Element => (
  <Box gap={2}>
    {(
      [
        { view: 'generate', label: 'Generate (Ctrl+1)' },
        { view: 'test', label: 'Test (Ctrl+2)' },
        { view: 'history', label: 'History (Ctrl+3)' },
      ] satisfies { view: ViewName; label: string }[]
    ).map((entry) => (
      <Text key={entry.view} color={entry.view === activeView ? 'cyan' : 'gray'}>
        {entry.view === activeView ? '● ' : '○ '}
        {entry.label}
      </Text>
    ))}
  </Box>
)

type GenerateViewProps = {
  intent: string
  onIntentChange: (value: string) => void
  focus: boolean
  state: GenerateRunState
  refinementDraft: string
  onRefinementChange: (value: string) => void
  onSubmitRefinement: () => void
  awaitingRefinement: boolean
  refinementFocus: boolean
  canRefine: boolean
}

const GenerateView = ({
  intent,
  onIntentChange,
  focus,
  state,
  refinementDraft,
  onRefinementChange,
  onSubmitRefinement,
  awaitingRefinement,
  refinementFocus,
  canRefine,
}: GenerateViewProps): JSX.Element => {
  const contextPreview = useMemo(() => state.contextFiles.slice(0, 8), [state.contextFiles])
  const iterations = useMemo(
    () => [...state.iterations].sort((a, b) => a.iteration - b.iteration),
    [state.iterations],
  )
  const latestIteration = iterations.length > 0 ? iterations[iterations.length - 1] : null

  return (
    <Box flexDirection="row" flexGrow={1} gap={1}>
      <Box flexDirection="column" flexBasis={32} borderStyle="round" borderColor="gray" padding={1}>
        <Text color="cyan">Intent</Text>
        <TextInput
          value={intent}
          onChange={onIntentChange}
          focus={focus}
          placeholder="Describe your goal"
        />
        <Box marginTop={1}>
          <Text color="green">Ctrl+Enter to generate</Text>
        </Box>
        {state.error && (
          <Box marginTop={1}>
            <Text color="red">{state.error}</Text>
          </Box>
        )}
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Context ({state.contextFiles.length})</Text>
          {contextPreview.length === 0 ? (
            <Text color="gray">No context yet</Text>
          ) : (
            contextPreview.map((file) => (
              <Text key={file.path} color="gray">
                • {file.path}
              </Text>
            ))
          )}
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Refinement</Text>
          <TextInput
            value={canRefine ? refinementDraft : ''}
            onChange={(value) => {
              if (canRefine) {
                onRefinementChange(value)
              }
            }}
            onSubmit={() => {
              if (canRefine) {
                onSubmitRefinement()
              }
            }}
            focus={Boolean(canRefine && refinementFocus)}
            placeholder={
              canRefine ? 'Describe how to adjust the prompt' : 'Run generate to enable refinement'
            }
          />
          <Text color={canRefine ? (awaitingRefinement ? 'yellow' : 'gray') : 'gray'}>
            {canRefine
              ? awaitingRefinement
                ? 'Awaiting refinement input…'
                : 'Not awaiting refinement.'
              : 'Refinements available after generation.'}
          </Text>
          {canRefine && <Text color="green">Enter submits · Ctrl+F finishes session</Text>}
        </Box>
      </Box>
      <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor="gray" padding={1}>
        <Text color="cyan">Telemetry & Progress</Text>
        {state.status === 'running' && (
          <Box gap={1}>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
            <Text color="yellow">Generating…</Text>
          </Box>
        )}
        {state.telemetry && (
          <Box marginTop={1} gap={3}>
            <Metric label="Total" value={state.telemetry.totalTokens.toLocaleString()} />
            <Metric label="Intent" value={state.telemetry.intentTokens.toLocaleString()} />
            <Metric label="Files" value={state.telemetry.fileTokens.toLocaleString()} />
          </Box>
        )}
        <Box marginTop={1} flexDirection="column">
          {state.progress.map((entry, index) => (
            <Text key={`${entry.label}-${index}`} color={entry.state === 'stop' ? 'green' : 'gray'}>
              {entry.label} · {entry.state}
            </Text>
          ))}
        </Box>
        <Box marginTop={1} flexDirection="column" flexGrow={1}>
          <Text color="cyan">Prompt Output</Text>
          {!latestIteration ? (
            <Text color="gray">No prompt generated yet.</Text>
          ) : (
            <Box flexDirection="column" borderStyle="single" borderColor="gray" padding={1}>
              <Text color="magenta">Iteration {latestIteration.iteration}</Text>
              <Text>{latestIteration.prompt ?? '(empty prompt)'}</Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text color="cyan">Refinements</Text>
          </Box>
          {iterations.filter((item) => item.refinement).length === 0 ? (
            <Text color="gray">No refinements captured.</Text>
          ) : (
            iterations
              .filter((item) => item.refinement)
              .map((item) => (
                <Text key={`ref-${item.iteration}`} color="gray">
                  #{item.iteration}: {item.refinement}
                </Text>
              ))
          )}
        </Box>
      </Box>
      <Box flexDirection="column" flexBasis={32} borderStyle="round" borderColor="gray" padding={1}>
        <Text color="cyan">Activity</Text>
        {state.activity.length === 0 && state.uploads.length === 0 ? (
          <Text color="gray">No activity yet.</Text>
        ) : (
          <Box flexDirection="column">
            {state.activity.map((message, index) => (
              <Text key={`msg-${index}`} color={message.level === 'warn' ? 'yellow' : 'gray'}>
                {message.text}
              </Text>
            ))}
            {state.uploads.map((upload, index) => (
              <Text key={`upload-${index}`} color={upload.state === 'start' ? 'yellow' : 'green'}>
                {upload.label} · {upload.state}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}

type MetricProps = {
  label: string
  value: string
}

const Metric = ({ label, value }: MetricProps): JSX.Element => (
  <Box flexDirection="column">
    <Text color="gray">{label}</Text>
    <Text color="white">{value}</Text>
  </Box>
)

type TestViewProps = {
  state: TestRunState
  onSuitePathChange: (value: string) => void
}

const TestView = ({ state, onSuitePathChange }: TestViewProps): JSX.Element => (
  <Box flexDirection="row" gap={1} flexGrow={1}>
    <Box flexDirection="column" flexBasis={36} borderStyle="round" borderColor="gray" padding={1}>
      <Text color="cyan">Test File</Text>
      <TextInput
        value={state.suitePath}
        onChange={onSuitePathChange}
        placeholder={DEFAULT_TEST_FILE}
      />
      <Box marginTop={1}>
        <Text color="green">Ctrl+Enter or "g" to run</Text>
      </Box>
      {state.error && (
        <Box marginTop={1}>
          <Text color="red">{state.error}</Text>
        </Box>
      )}
    </Box>
    <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor="gray" padding={1}>
      <Text color="cyan">Progress</Text>
      {state.status === 'running' && (
        <Box gap={1}>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text color="yellow">Running tests…</Text>
        </Box>
      )}
      <Box marginTop={1} flexDirection="column">
        {state.rows.length === 0 ? (
          <Text color="gray">No tests executed yet.</Text>
        ) : (
          state.rows.slice(-12).map((row) => (
            <Text
              key={row.name}
              color={row.status === 'fail' ? 'red' : row.status === 'pass' ? 'green' : 'yellow'}
            >
              {row.name} · {row.status}
              {row.reason ? ` – ${row.reason}` : ''}
            </Text>
          ))
        )}
      </Box>
      {state.summary && (
        <Box marginTop={1}>
          <Text color={state.summary.failed > 0 ? 'red' : 'green'}>
            Passed {state.summary.passed} · Failed {state.summary.failed}
          </Text>
        </Box>
      )}
    </Box>
  </Box>
)

type HistoryViewProps = {
  entries: HistoryEntry[]
  status: 'idle' | 'loading' | 'error'
  error: string | null
}

const HistoryView = ({ entries, status, error }: HistoryViewProps): JSX.Element => (
  <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor="gray" padding={1}>
    <Box justifyContent="space-between">
      <Text color="cyan">Recent Runs</Text>
      <Text color="green">Press "r" to refresh</Text>
    </Box>
    {status === 'loading' && (
      <Box gap={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text color="yellow">Loading history…</Text>
      </Box>
    )}
    {status === 'error' && error && <Text color="red">{error}</Text>}
    <Box marginTop={1} flexDirection="column">
      {entries.length === 0 ? (
        <Text color="gray">No history entries yet.</Text>
      ) : (
        entries.slice(0, 12).map((entry, index) => (
          <Box
            key={`${entry.timestamp}-${index}`}
            flexDirection="column"
            borderStyle="single"
            borderColor="gray"
            padding={1}
            marginBottom={1}
          >
            <Text color="white">{entry.intent.slice(0, 100)}</Text>
            <Text color="gray">
              Model: {entry.model} · Iterations: {entry.iterations}
            </Text>
            <Text color="gray">Contexts: {entry.contextPaths.length}</Text>
            <Text color="green">{entry.timestamp}</Text>
          </Box>
        ))
      )}
    </Box>
  </Box>
)

type StatusBarProps = {
  view: ViewName
  generateState: GenerateRunState
  testState: TestRunState
}

const StatusBar = ({ view, generateState, testState }: StatusBarProps): JSX.Element => (
  <Box marginTop={1} borderStyle="classic" borderColor="gray" paddingX={1} paddingY={0}>
    <Text color="gray">
      View: {view.toUpperCase()} · Generate: {generateState.status.toUpperCase()} · Test:{' '}
      {testState.status.toUpperCase()}
    </Text>
  </Box>
)
