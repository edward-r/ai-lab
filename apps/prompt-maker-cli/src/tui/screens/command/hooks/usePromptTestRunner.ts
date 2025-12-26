import path from 'node:path'
import { useState } from 'react'

import { useStableCallback } from '../../../hooks/useStableCallback'

import { runPromptTestSuite, type PromptTestRunReporter } from '../../../../test-command'
import type { HistoryEntry } from '../../../types'

type PushHistory = (content: string, kind?: HistoryEntry['kind']) => void

type ClearHistory = () => void

type CloseTestPopup = () => void

type AddCommandHistoryEntry = (value: string) => void

export type UsePromptTestRunnerOptions = {
  defaultTestFile: string
  pushHistory: PushHistory
  clearHistory: ClearHistory
  closeTestPopup: CloseTestPopup
  addCommandHistoryEntry: AddCommandHistoryEntry
}

export type UsePromptTestRunnerResult = {
  isTestCommandRunning: boolean
  lastTestFile: string | null
  runTestsFromCommand: (value: string) => void
  onTestPopupSubmit: (value: string) => void
}

export const usePromptTestRunner = ({
  defaultTestFile,
  pushHistory,
  clearHistory,
  closeTestPopup,
  addCommandHistoryEntry,
}: UsePromptTestRunnerOptions): UsePromptTestRunnerResult => {
  const [isTestCommandRunning, setIsTestCommandRunning] = useState(false)
  const [lastTestFile, setLastTestFile] = useState<string | null>(null)

  const runTestsFromCommand = useStableCallback((value: string) => {
    void (async () => {
      const normalized = value.trim()
      const targetFile = normalized || lastTestFile || defaultTestFile

      if (!targetFile) {
        pushHistory('No test file specified. Use /test <file>.', 'system')
        return
      }

      if (isTestCommandRunning) {
        pushHistory('Test run already in progress. Please wait.', 'system')
        return
      }

      const resolvedPath = path.resolve(process.cwd(), targetFile)
      clearHistory()
      setIsTestCommandRunning(true)
      setLastTestFile(targetFile)
      closeTestPopup()

      pushHistory(`[tests] Running ${resolvedPath}`, 'progress')

      try {
        const reporter: PromptTestRunReporter = {
          onSuiteLoaded: (suite, loadedPath) => {
            pushHistory(
              `[tests] Loaded ${suite.tests.length} test(s) from ${loadedPath}`,
              'progress',
            )
          },
          onTestStart: (ordinal, test) => {
            pushHistory(`[tests] (${ordinal}) ${test.name}`, 'progress')
          },
          onTestComplete: (_ordinal, result) => {
            const status = result.pass ? 'PASS' : 'FAIL'
            const reason = result.reason ? ` · ${result.reason}` : ''
            pushHistory(
              `[tests] ${status} ${result.name}${reason}`,
              result.pass ? 'system' : 'progress',
            )
          },
          onComplete: (results) => {
            const passed = results.filter((result) => result.pass).length
            const failed = results.length - passed
            const kind: HistoryEntry['kind'] = failed > 0 ? 'progress' : 'system'
            pushHistory(`[tests] Summary · passed ${passed} · failed ${failed}`, kind)
          },
        }

        await runPromptTestSuite(resolvedPath, { reporter })
        pushHistory('[tests] Complete.', 'progress')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown test execution error.'
        pushHistory(`[tests] Failed: ${message}`, 'progress')
      } finally {
        setIsTestCommandRunning(false)
      }
    })()
  })

  const onTestPopupSubmit = useStableCallback((value: string) => {
    const trimmed = value.trim()
    addCommandHistoryEntry(`/test${trimmed ? ` ${trimmed}` : ''}`)
    runTestsFromCommand(value)
  })

  return {
    isTestCommandRunning,
    lastTestFile,
    runTestsFromCommand,
    onTestPopupSubmit,
  }
}
