import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Text, useInput, useStdout } from 'ink'
import cliCursor from 'cli-cursor'

import { CommandScreen, type CommandScreenHandle } from './CommandScreen'
import { TestRunnerScreen, type TestRunnerScreenHandle } from './TestRunnerScreen'
import { ContextProvider } from './context'
import { HelpOverlay } from './components/core/HelpOverlay'
import { COMMAND_DESCRIPTORS } from './config'
import { createHelpSections, estimateHelpOverlayHeight } from './help-config'
import { resolveAppContainerKeyAction } from './app-container-keymap'

export type AppContainerProps = {
  interactiveTransport?: string | undefined
}

export const AppContainer: React.FC<AppContainerProps> = ({ interactiveTransport }) => {
  const { stdout } = useStdout()
  const [view, setView] = useState<'generate' | 'tests'>('generate')
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [pendingCommandMenu, setPendingCommandMenu] = useState(false)
  const [commandMenuSignal, setCommandMenuSignal] = useState(0)
  const commandScreenRef = useRef<CommandScreenHandle | null>(null)
  const testRunnerRef = useRef<TestRunnerScreenHandle | null>(null)

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
    const action = resolveAppContainerKeyAction({
      input,
      key,
      view,
      isPopupOpen,
      isHelpOpen,
    })

    if (action.type === 'none') {
      return
    }

    if (action.type === 'toggle-help') {
      if (!isHelpOpen && action.nextIsHelpOpen) {
        if (view === 'generate') {
          commandScreenRef.current?.suppressNextInput()
        } else {
          testRunnerRef.current?.suppressNextInput()
        }
      }
      setIsHelpOpen(action.nextIsHelpOpen)
      return
    }

    if (action.type === 'open-command-palette') {
      commandScreenRef.current?.suppressNextInput()
      setCommandMenuSignal((prev) => prev + 1)
      return
    }

    if (action.type === 'switch-to-generate-and-open-command-palette') {
      setPendingCommandMenu(true)
      setView('generate')
      return
    }

    if (action.type === 'switch-to-tests') {
      if (view === 'generate') {
        commandScreenRef.current?.suppressNextInput()
      }
      setView('tests')
    }
  })

  const terminalRows = stdout?.rows ?? 24
  const helpMaxHeight = Math.max(10, terminalRows - 6)

  const helpSections = useMemo(
    () => createHelpSections({ commandDescriptors: COMMAND_DESCRIPTORS }),
    [],
  )
  const helpIdealHeight = useMemo(() => estimateHelpOverlayHeight(helpSections), [helpSections])
  const helpOverlayHeight = Math.min(helpIdealHeight, helpMaxHeight)
  const helpReservedRows = isHelpOpen ? helpOverlayHeight + 1 : 0

  return (
    <ContextProvider>
      <Box flexDirection="column" paddingX={2} paddingY={1} height="100%">
        <Text color="cyanBright">Prompt Maker · Command Palette Preview</Text>
        <Text color="gray">
          Ctrl+G → Command Palette · Ctrl+T → Test Runner · ? → Help · /exit → Exit
        </Text>
        <Box flexDirection="column" flexGrow={1} marginTop={1}>
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
              <Box flexDirection="column" flexGrow={1} marginTop={1}>
                <CommandScreen
                  ref={commandScreenRef}
                  interactiveTransportPath={interactiveTransport}
                  onPopupVisibilityChange={setIsPopupOpen}
                  commandMenuSignal={commandMenuSignal}
                  helpOpen={isHelpOpen}
                  reservedRows={helpReservedRows}
                />
              </Box>
            </>
          ) : (
            <>
              <Text color="gray">Enter a test file and press Enter to run suites.</Text>
              <TestRunnerScreen ref={testRunnerRef} helpOpen={isHelpOpen} />
            </>
          )}
        </Box>
        {isHelpOpen ? (
          <Box marginTop={1}>
            <HelpOverlay activeView={view} maxHeight={helpMaxHeight} />
          </Box>
        ) : null}
      </Box>
    </ContextProvider>
  )
}
