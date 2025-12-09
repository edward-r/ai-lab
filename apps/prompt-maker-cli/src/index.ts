#!/usr/bin/env node

import { runGenerateCommand } from './generate-command'
import { runTestCommand } from './test-command'

type CliCommand = 'generate' | 'test' | 'ui'

const { command, args } = resolveCommand(process.argv.slice(2))

switch (command) {
  case 'test':
    void runTestCommand(args)
    break
  case 'ui':
    void loadAndRunTui(args)
    break
  case 'generate':
  default:
    void runGenerateCommand(args)
}

async function loadAndRunTui(args: string[]): Promise<void> {
  const { runTuiCommand } = await import('./tui')
  await runTuiCommand(args)
}

function resolveCommand(args: string[]): { command: CliCommand; args: string[] } {
  if (args.length === 0) {
    return { command: 'ui', args }
  }

  const [first, ...rest] = args
  if (!first) {
    return { command: 'ui', args }
  }

  if (first === 'test') {
    return { command: 'test', args: rest }
  }

  if (first === 'ui') {
    return { command: 'ui', args: rest }
  }

  if (!first.startsWith('-') && (first === 'generate' || first === 'expand')) {
    return { command: 'generate', args: rest }
  }

  if (first.startsWith('-')) {
    return { command: 'generate', args }
  }

  return { command: 'generate', args }
}
