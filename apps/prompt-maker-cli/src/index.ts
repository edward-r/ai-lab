#!/usr/bin/env node

import { runGenerateCommand } from './generate-command'
import { runTestCommand } from './test-command'
import { prepareTuiLaunch, runPromptMakerTui } from './tui'

const { command, args } = resolveCommand(process.argv.slice(2))
const { sanitizedArgs, shouldLaunch } = prepareTuiLaunch(args)

if (command === 'generate' && shouldLaunch) {
  void runPromptMakerTui()
} else if (command === 'test') {
  void runTestCommand(sanitizedArgs)
} else {
  void runGenerateCommand(sanitizedArgs)
}

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
