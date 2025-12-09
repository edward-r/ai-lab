import { render } from 'ink'

import { AppContainer } from './AppContainer'

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

export const runTuiCommand = async (argv: string[]): Promise<void> => {
  const options = parseTuiArgs(argv)
  const { waitUntilExit } = render(
    <AppContainer interactiveTransport={options.interactiveTransport} />,
  )
  await waitUntilExit()
}
