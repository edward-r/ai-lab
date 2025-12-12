import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import path from 'node:path'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'

import { runPromptTestSuite, type PromptTestRunReporter } from '../test-command'
import { useLogBuffer } from './useLogBuffer'

const STATUS_LABEL: Record<TestStatus, string> = {
  pending: 'PENDING',
  running: 'RUNNING',
  pass: 'PASS',
  fail: 'FAIL',
}

const STATUS_COLOR: Record<TestStatus, 'gray' | 'cyan' | 'green' | 'red'> = {
  pending: 'gray',
  running: 'cyan',
  pass: 'green',
  fail: 'red',
}

type TestStatus = 'pending' | 'running' | 'pass' | 'fail'

type TestDisplayState = {
  name: string
  status: TestStatus
  reason?: string
}

type FocusField = 'file' | 'actions'

const focusOrder: FocusField[] = ['file', 'actions']

const nextFocus = (current: FocusField): FocusField => {
  const index = focusOrder.indexOf(current)
  return focusOrder[(index + 1) % focusOrder.length] as FocusField
}

const previousFocus = (current: FocusField): FocusField => {
  const index = focusOrder.indexOf(current)
  return focusOrder[(index - 1 + focusOrder.length) % focusOrder.length] as FocusField
}

export type TestRunnerScreenHandle = {
  suppressNextInput: () => void
}

export type TestRunnerScreenProps = {
  helpOpen?: boolean
}

export const TestRunnerScreen = forwardRef<TestRunnerScreenHandle, TestRunnerScreenProps>(
  ({ helpOpen = false }, ref) => {
    const [filePath, setFilePath] = useState('prompt-tests.yaml')
    const [tests, setTests] = useState<TestDisplayState[]>([])
    const [status, setStatus] = useState<'idle' | 'running'>('idle')
    const [error, setError] = useState<string | undefined>()
    const [summary, setSummary] = useState<{ passed: number; failed: number } | null>(null)
    const [lastRunFile, setLastRunFile] = useState<string | null>(null)
    const [focus, setFocus] = useState<FocusField>('file')
    const { logs, log, clearLogs } = useLogBuffer()

    const suppressNextInputRef = useRef(false)

    useImperativeHandle(
      ref,
      () => ({
        suppressNextInput: () => {
          suppressNextInputRef.current = true
        },
      }),
      [],
    )

    const consumeSuppressedTextInputChange = useCallback((): boolean => {
      if (!suppressNextInputRef.current) {
        return false
      }
      suppressNextInputRef.current = false
      return true
    }, [])

    const handleFilePathChange = useCallback(
      (next: string) => {
        if (consumeSuppressedTextInputChange()) {
          return
        }
        setFilePath(next)
      },
      [consumeSuppressedTextInputChange],
    )

    const canRun = useMemo(
      () => status !== 'running' && filePath.trim().length > 0,
      [status, filePath],
    )

    const reporter = useMemo<PromptTestRunReporter>(() => {
      return {
        onSuiteLoaded: (suite, loadedPath) => {
          setLastRunFile(loadedPath)
          setTests(
            suite.tests.map((test) => ({
              name: test.name,
              status: 'pending',
            })),
          )
          clearLogs()
          log.info(`Loaded ${suite.tests.length} test(s) from ${loadedPath}`)
        },
        onTestStart: (ordinal, test) => {
          setTests((prev) => {
            if (ordinal < 1 || ordinal > prev.length) {
              return prev
            }
            const next = [...prev]
            next[ordinal - 1] = { name: test.name, status: 'running' }
            return next
          })
        },
        onTestComplete: (ordinal, result) => {
          setTests((prev) => {
            if (ordinal < 1 || ordinal > prev.length) {
              return prev
            }
            const next = [...prev]
            next[ordinal - 1] = {
              name: result.name,
              status: result.pass ? 'pass' : 'fail',
              reason: result.reason,
            }
            return next
          })
          if (!result.pass) {
            log.warn(`[${result.name}] ${result.reason}`)
          }
        },
        onComplete: (results) => {
          const passed = results.filter((result) => result.pass).length
          const failed = results.length - passed
          setSummary({ passed, failed })
          setStatus('idle')
          if (failed === 0) {
            log.info('All tests passed')
          } else {
            log.error(`${failed} test(s) failed`)
          }
        },
      }
    }, [clearLogs, log])

    const handleRun = useCallback(async () => {
      if (!canRun) {
        return
      }
      setStatus('running')
      setError(undefined)
      setSummary(null)
      setTests([])

      const resolvedPath = path.resolve(process.cwd(), filePath.trim())
      try {
        await runPromptTestSuite(resolvedPath, { reporter })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown test execution error.'
        setError(message)
        log.error(message)
        setStatus('idle')
      }
    }, [canRun, filePath, log, reporter])

    useInput(
      (_, key) => {
        if (status === 'running') {
          return
        }

        if (key.tab && key.shift) {
          setFocus((current) => previousFocus(current))
          return
        }

        if (key.tab) {
          setFocus((current) => nextFocus(current))
          return
        }

        if (focus === 'actions' && key.return && canRun) {
          void handleRun()
        }
      },
      { isActive: !helpOpen },
    )

    const renderTests = (): React.ReactNode => {
      if (tests.length === 0) {
        return <Text color="gray">No test suite loaded yet.</Text>
      }

      const displayed = tests.slice(0, 15).map((testState, index) => {
        const color = STATUS_COLOR[testState.status]
        return (
          <Box key={`${testState.name}-${index}`} flexDirection="column">
            <Text color={color}>
              {STATUS_LABEL[testState.status].padEnd(7)} {testState.name}
            </Text>
            {testState.reason && testState.status === 'fail' ? (
              <Text color="gray">↳ {testState.reason}</Text>
            ) : null}
          </Box>
        )
      })

      return (
        <>
          {displayed}
          {tests.length > 15 ? (
            <Text color="gray">…and {tests.length - 15} more test(s)</Text>
          ) : null}
        </>
      )
    }

    return (
      <Box flexDirection="column" marginTop={1}>
        {focus === 'file' ? <Text color="green">Test File</Text> : <Text>Test File</Text>}
        <Box borderStyle="round" borderColor={focus === 'file' ? 'green' : 'gray'} paddingX={1}>
          <TextInput
            value={filePath}
            onChange={handleFilePathChange}
            placeholder="prompt-tests.yaml"
            focus={focus === 'file' && !helpOpen}
            onSubmit={() => setFocus('actions')}
          />
        </Box>

        <Box marginTop={1} flexDirection="column">
          {focus === 'actions' ? <Text color="green">Actions</Text> : <Text>Actions</Text>}
          <Text>Press Enter to run tests</Text>
          <Text color="gray">Status: {status === 'running' ? 'Running tests…' : 'Idle'}</Text>
          {lastRunFile ? (
            <Text color="gray">Last suite: {lastRunFile}</Text>
          ) : (
            <Text color="gray">No runs yet</Text>
          )}
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Tests</Text>
          {renderTests()}
        </Box>

        {summary ? (
          <Box marginTop={1} flexDirection="column">
            <Text color="yellow">Summary</Text>
            <Text color="green">Passed: {summary.passed}</Text>
            <Text color={summary.failed > 0 ? 'red' : 'green'}>Failed: {summary.failed}</Text>
          </Box>
        ) : null}

        {logs.length > 0 ? (
          <Box marginTop={1} flexDirection="column">
            <Text color="cyan">Recent Logs</Text>
            {logs.map((entry) => (
              <Text
                key={entry.id}
                color={entry.level === 'error' ? 'red' : entry.level === 'warn' ? 'yellow' : 'gray'}
              >
                {entry.level.toUpperCase()}: {entry.message}
              </Text>
            ))}
          </Box>
        ) : null}

        {error ? <Text color="red">{error}</Text> : null}
      </Box>
    )
  },
)
