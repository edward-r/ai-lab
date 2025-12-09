import React, { useEffect, useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import cliCursor from 'cli-cursor'

import { CommandScreen } from './CommandScreen'
import { TestRunnerScreen } from './TestRunnerScreen'
import { ContextProvider } from './context'

export type AppContainerProps = {
  interactiveTransport?: string | undefined
}

export const AppContainer: React.FC<AppContainerProps> = ({ interactiveTransport }) => {
  const { exit } = useApp()
  const [view, setView] = useState<'generate' | 'tests'>('generate')
  const [isPopupOpen, setIsPopupOpen] = useState(false)

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
    if (view !== 'generate') {
      setIsPopupOpen(false)
    }
  }, [view])

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit()
      return
    }
    if (key.escape) {
      if (view === 'generate' && isPopupOpen) {
        return
      }
      exit()
      return
    }
    if (key.ctrl && input.toLowerCase() === 'g') {
      setView('generate')
      return
    }
    if (key.ctrl && input.toLowerCase() === 't') {
      setView('tests')
    }
  })

  return (
    <ContextProvider>
      <Box flexDirection="column" paddingX={2} paddingY={1} height="100%">
        <Text color="cyanBright">Prompt Maker · Command Palette Preview</Text>
        <Text color="gray">
          Ctrl+G → Command Palette · Ctrl+T → Test Runner · Ctrl+C/Esc to exit.
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
                  interactiveTransportPath={interactiveTransport}
                  onPopupVisibilityChange={setIsPopupOpen}
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
