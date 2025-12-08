import React from 'react'
import { Box, Text, render, useApp, useInput } from 'ink'

import { GenerateScreen } from './GenerateScreen'
import { ContextProvider } from './context'

const AppContainer: React.FC = () => {
  const { exit } = useApp()

  useInput((input, key) => {
    if ((key.ctrl && input === 'c') || key.escape) {
      exit()
    }
  })

  return (
    <ContextProvider>
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text color="cyanBright">Prompt Maker · TUI Preview</Text>
        <Text color="gray">
          Tab cycles Intent → Model → Context → Actions. Use Ctrl+C or Esc to exit.
        </Text>
        <GenerateScreen />
      </Box>
    </ContextProvider>
  )
}

export const runTuiCommand = async (_argv: string[]): Promise<void> => {
  const { waitUntilExit } = render(<AppContainer />)
  await waitUntilExit()
}
