import React from 'react'
import { Box, Text, render, useApp, useInput } from 'ink'
import type { Key } from 'ink'

const WelcomeScreen: React.FC = () => {
  const { exit } = useApp()

  useInput((input: string, key: Key) => {
    if (key.escape || key.return || input.toLowerCase() === 'q' || (key.ctrl && input === 'c')) {
      exit()
    }
  })

  return (
    <Box flexDirection="column" paddingX={3} paddingY={1} borderStyle="round" borderColor="cyan">
      <Text color="cyanBright">Prompt Maker · TUI Preview</Text>
      <Box marginTop={1} flexDirection="column" gap={1}>
        <Text>This is the new Opencode-inspired shell. Press 'q' or Enter to exit.</Text>
        <Text color="gray">
          Generate · Test · Explore Context — all from one place (coming soon).
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color="green">Navigation shortcuts (planned):</Text>
        <Text> • Ctrl+K → Command palette</Text>
        <Text> • g then r → Run prompt generation</Text>
        <Text> • t then r → Launch prompt test dashboard</Text>
      </Box>
    </Box>
  )
}

export const runTuiCommand = async (_argv: string[]): Promise<void> => {
  const { waitUntilExit } = render(<WelcomeScreen />)
  await waitUntilExit()
}
