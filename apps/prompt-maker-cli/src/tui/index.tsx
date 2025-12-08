import React from 'react'
import { Box, Text, render, useApp, useInput } from 'ink'

import { GenerateScreen } from './GenerateScreen'
import { ContextProvider } from './context'

type TuiOptions = {
  interactiveTransport?: string
}

const parseTuiArgs = (argv: string[]): TuiOptions => {
  const options: TuiOptions = {}
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token) {
      continue
    }
    if (token === '--interactive-transport') {
      const next = argv[i + 1]
      if (next && !next.startsWith('-')) {
        options.interactiveTransport = next
        i += 1
      }
      continue
    }
    if (token.startsWith('--interactive-transport=')) {
      options.interactiveTransport = token.split('=').slice(1).join('=')
    }
  }
  return options
}

const AppContainer: React.FC<{ interactiveTransport?: string | undefined }> = ({
  interactiveTransport,
}) => {
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
        {interactiveTransport ? (
          <Text color="gray">
            Interactive transport listening on {interactiveTransport}. Send JSON commands to refine
            remotely.
          </Text>
        ) : null}
        <GenerateScreen interactiveTransportPath={interactiveTransport} />
      </Box>
    </ContextProvider>
  )
}

export const runTuiCommand = async (argv: string[]): Promise<void> => {
  const options = parseTuiArgs(argv)
  const { waitUntilExit } = render(
    <AppContainer interactiveTransport={options.interactiveTransport} />,
  )
  await waitUntilExit()
}
