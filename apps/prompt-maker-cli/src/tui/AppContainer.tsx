import React, { useEffect, useRef, useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import type { Key } from 'ink'
import cliCursor from 'cli-cursor'

import { CommandScreen, type CommandScreenHandle } from './CommandScreen'
import { TestRunnerScreen } from './TestRunnerScreen'
import { ContextProvider } from './context'

const toControlCharacter = (letter: string): string | null => {
  if (!letter) {
    return null
  }
  const normalized = letter.toLowerCase()
  const code = normalized.charCodeAt(0)
  if (code < 97 || code > 122) {
    return null
  }
  return String.fromCharCode(code - 96)
}

const matchesControlKey = (input: string, key: Key, target: string): boolean => {
  if (!target || !input) {
    return false
  }
  if (key.ctrl && input.toLowerCase() === target.toLowerCase()) {
    return true
  }
  const controlChar = toControlCharacter(target)
  return controlChar ? input === controlChar : false
}

export type AppContainerProps = {
  interactiveTransport?: string | undefined
}

export const AppContainer: React.FC<AppContainerProps> = ({ interactiveTransport }) => {
  const { exit } = useApp()
  const [view, setView] = useState<'generate' | 'tests'>('generate')
  const [pendingCommandMenu, setPendingCommandMenu] = useState(false)
  const [commandMenuSignal, setCommandMenuSignal] = useState(0)
  const commandScreenRef = useRef<CommandScreenHandle | null>(null)

  useEffect(() => {
    if (!process.stdout.isTTY) {
      return
    }

    cliCursor.hide()
    return () => {
      cliCursor.show()
    }
  }, [])

  useEffect(() => {
    if (view === 'generate' && pendingCommandMenu) {
      commandScreenRef.current?.suppressNextInput()
      setCommandMenuSignal((prev) => prev + 1)
      setPendingCommandMenu(false)
      return
    }
    if (view !== 'generate' && pendingCommandMenu) {
      setPendingCommandMenu(false)
    }
  }, [pendingCommandMenu, view])

  useInput((input, key) => {
    const isControlKey = (target: string): boolean => matchesControlKey(input, key, target)

    if (isControlKey('g')) {
      if (view === 'generate') {
        commandScreenRef.current?.suppressNextInput()
        setCommandMenuSignal((prev) => prev + 1)
      } else {
        setPendingCommandMenu(true)
        setView('generate')
      }
      return
    }
    if (isControlKey('t')) {
      if (view === 'generate') {
        commandScreenRef.current?.suppressNextInput()
      }
      setView('tests')
    }
  })

  return (
    <ContextProvider>
      <Box flexDirection="column" paddingX={2} paddingY={1} height="100%">
        <Text color="cyanBright">Prompt Maker · Command Palette Preview</Text>
        <Text color="gray">
          Ctrl+G → Command Palette · Ctrl+T → Test Runner · Type /exit to quit.
        </Text>
        <Box flexDirection="column" flexGrow={1} height="100%" marginTop={1}>
          {view === 'generate' ? (
            <>
              <Text color="gray">
                Type intents freely or prefix with /command. Use arrow keys to browse history.
              </Text>
              {interactiveTransport ? (
                <Text color="gray">
                  Interactive transport listening on {interactiveTransport}. Remote refinements will
                  appear in history.
                </Text>
              ) : null}
              <Box flexDirection="column" flexGrow={1} height="100%" marginTop={1}>
                <CommandScreen
                  ref={commandScreenRef}
                  interactiveTransportPath={interactiveTransport}
                  commandMenuSignal={commandMenuSignal}
                  onExitRequest={exit}
                />
              </Box>
            </>
          ) : (
            <>
              <Text color="gray">Enter a test file and press Enter to run suites.</Text>
              <TestRunnerScreen />
            </>
          )}
        </Box>
      </Box>
    </ContextProvider>
  )
}
