#!/usr/bin/env node

import { runGenerateCommand } from './generate-command'
import { runTestCommand } from './test-command'
import { prepareTuiLaunch } from './tui/launch'

const main = async (): Promise<void> => {
  const { command, args } = resolveCommand(process.argv.slice(2))
  const { sanitizedArgs, shouldLaunch, initialIntent } = prepareTuiLaunch(args)

  if (command === 'generate' && shouldLaunch) {
    const { runPromptMakerTui } = await import('./tui/index.js')
    const tuiOptions = initialIntent ? { initialIntent } : undefined
    await runPromptMakerTui(tuiOptions)
    return
  }

  if (command === 'test') {
    await runTestCommand(sanitizedArgs)
    return
  }

  await runGenerateCommand(sanitizedArgs)
}

void main()

function resolveCommand(args: string[]): { command: 'generate' | 'test'; args: string[] } {
  if (args.length === 0) {
    return { command: 'generate', args }
  }

  const [first, ...rest] = args
  if (!first) {
    return { command: 'generate', args }
  }

  if (first === 'test') {
    return { command: 'test', args: rest }
  }

  if (!first.startsWith('-') && (first === 'generate' || first === 'expand')) {
    return { command: 'generate', args: rest }
  }

  return { command: 'generate', args }
}
