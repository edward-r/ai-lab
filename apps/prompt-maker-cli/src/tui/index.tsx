import React from 'react'
import { render } from 'ink'

import { App, type AppProps } from './App'

export type PromptMakerTuiOptions = Partial<Pick<AppProps, 'initialIntent'>>

export type TuiLaunchPreparation = {
  sanitizedArgs: string[]
  shouldLaunch: boolean
  initialIntent?: string
}

const BLOCKING_FLAGS = new Set(['--json', '--quiet'])

export const prepareTuiLaunch = (args: string[]): TuiLaunchPreparation => {
  const sanitizedArgs: string[] = []
  let disableTui = false
  let forceTui = false

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index]
    if (!token) {
      continue
    }

    if (token === '--tui') {
      forceTui = true
      continue
    }

    if (token === '--no-tui') {
      disableTui = true
      continue
    }

    sanitizedArgs.push(token)
  }

  const hasBlockingFlag = sanitizedArgs.some((token, idx) => {
    if (BLOCKING_FLAGS.has(token)) {
      return true
    }
    if (token === '--stream') {
      const next = sanitizedArgs[idx + 1]
      return typeof next === 'string' && next.toLowerCase() === 'jsonl'
    }
    return false
  })

  const ttyReady = Boolean(process.stdout.isTTY && process.stdin.isTTY)
  const envDisabled = process.env.PROMPT_MAKER_TUI_DISABLED === '1'

  const shouldLaunch =
    !disableTui &&
    !envDisabled &&
    ttyReady &&
    !hasBlockingFlag &&
    (forceTui || sanitizedArgs.length === 0)

  return { sanitizedArgs, shouldLaunch }
}

export const runPromptMakerTui = async (options: PromptMakerTuiOptions = {}): Promise<void> => {
  const app = render(<App initialIntent={options.initialIntent ?? ''} />)
  await app.waitUntilExit()
}
