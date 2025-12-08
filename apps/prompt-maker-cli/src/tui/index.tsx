import React from 'react'
import { Box, Text, render, useApp, useInput } from 'ink'

import { GenerateScreen } from './GenerateScreen'

const AppContainer: React.FC = () => {
  const { exit } = useApp()

  useInput((input, key) => {
    if ((key.ctrl && input === 'c') || key.escape) {
      exit()
    }
  })

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text color="cyanBright">Prompt Maker · TUI Preview</Text>
      <Text color="gray">Tab cycles Intent → Model → Actions. Use Ctrl+C to exit.</Text>
      <GenerateScreen />
    </Box>
  )
}

export const runTuiCommand = async (_argv: string[]): Promise<void> => {
  const { waitUntilExit } = render(<AppContainer />)
  await waitUntilExit()
}
