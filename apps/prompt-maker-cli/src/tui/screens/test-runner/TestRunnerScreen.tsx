/*
 * TestRunnerScreen
 *
 * This screen runs `prompt-tests.yaml` (or another file) and shows progress.
 *
 * Architecture note:
 * - Ink screens tend to accumulate lots of tiny state updates.
 * - We keep state transitions explicit via a reducer (`test-runner-reducer.ts`).
 * - This screen component stays focused on orchestration:
 *   input handling + calling `runPromptTestSuite`.
 */

import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import path from 'node:path'
import { Box, Text, useInput } from 'ink'

import { runPromptTestSuite, type PromptTestRunReporter } from '../../../test-command'
import { useLogBuffer } from '../../useLogBuffer'
import { useTheme } from '../../theme/theme-provider'
import { inkColorProps } from '../../theme/theme-types'
import { useTestRunnerScreen } from './useTestRunnerScreen'

import { TestRunnerActions } from './components/TestRunnerActions'
import { TestRunnerError } from './components/TestRunnerError'
import { TestRunnerFileInput } from './components/TestRunnerFileInput'
import { TestRunnerLogs } from './components/TestRunnerLogs'
import { TestList } from './components/TestList'
import { TestRunnerSummary } from './components/TestRunnerSummary'

export type TestRunnerScreenHandle = {
  suppressNextInput: () => void
}

export type TestRunnerScreenProps = {
  helpOpen?: boolean
}

export const TestRunnerScreen = forwardRef<TestRunnerScreenHandle, TestRunnerScreenProps>(
  ({ helpOpen = false }, ref) => {
    const { theme } = useTheme()

    const {
      state,
      canRun,
      setFilePath,
      setFocus,
      focusNext,
      focusPrevious,
      startRun,
      suiteLoaded,
      testStarted,
      testCompleted,
      runCompleted,
      runErrored,
    } = useTestRunnerScreen()

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
      [consumeSuppressedTextInputChange, setFilePath],
    )

    const reporter = useMemo<PromptTestRunReporter>(
      () => ({
        onSuiteLoaded: (suite, loadedPath) => {
          suiteLoaded(
            loadedPath,
            suite.tests.map((test) => test.name),
          )
          clearLogs()
          log.info(`Loaded ${suite.tests.length} test(s) from ${loadedPath}`)
        },
        onTestStart: (ordinal, test) => {
          testStarted(ordinal, test.name)
        },
        onTestComplete: (ordinal, result) => {
          testCompleted(ordinal, result.name, result.pass, result.reason ?? null)

          if (!result.pass) {
            log.warn(`[${result.name}] ${result.reason}`)
          }
        },
        onComplete: (results) => {
          const passed = results.filter((result) => result.pass).length
          const failed = results.length - passed

          runCompleted(passed, failed)

          if (failed === 0) {
            log.info('All tests passed')
          } else {
            log.error(`${failed} test(s) failed`)
          }
        },
      }),
      [clearLogs, log, runCompleted, suiteLoaded, testCompleted, testStarted],
    )

    const handleRun = useCallback(async () => {
      if (!canRun) {
        return
      }

      startRun()

      const resolvedPath = path.resolve(process.cwd(), state.filePath.trim())

      try {
        await runPromptTestSuite(resolvedPath, { reporter })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown test execution error.'
        runErrored(message)
        log.error(message)
      }
    }, [canRun, log, reporter, runErrored, startRun, state.filePath])

    useInput(
      (_, key) => {
        if (state.status === 'running') {
          return
        }

        if (key.tab && key.shift) {
          focusPrevious()
          return
        }

        if (key.tab) {
          focusNext()
          return
        }

        if (state.focus === 'actions' && key.return && canRun) {
          void handleRun()
        }
      },
      { isActive: !helpOpen },
    )

    return (
      <Box flexDirection="column" marginTop={1}>
        <TestRunnerFileInput
          filePath={state.filePath}
          isFocused={state.focus === 'file'}
          helpOpen={helpOpen}
          onChange={handleFilePathChange}
          onSubmit={() => setFocus('actions')}
        />

        <TestRunnerActions
          isFocused={state.focus === 'actions'}
          status={state.status}
          lastRunFile={state.lastRunFile}
        />

        <Box marginTop={1} flexDirection="column">
          <Text {...inkColorProps(theme.accent)}>Tests</Text>
          <TestList tests={state.tests} />
        </Box>

        <TestRunnerSummary summary={state.summary} />
        <TestRunnerLogs logs={logs} />
        <TestRunnerError message={state.error} />
      </Box>
    )
  },
)

TestRunnerScreen.displayName = 'TestRunnerScreen'
