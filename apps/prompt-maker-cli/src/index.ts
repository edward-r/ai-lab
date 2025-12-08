#!/usr/bin/env node

import { runGenerateCommand } from './generate-command'
import { runTestCommand } from './test-command'
import { runTuiCommand } from './tui'

type CliCommand = 'generate' | 'test' | 'ui'

const { command, args } = resolveCommand(process.argv.slice(2))

switch (command) {
  case 'test':
    void runTestCommand(args)
    break
  case 'ui':
    void runTuiCommand(args)
    break
  case 'generate':
  default:
    void runGenerateCommand(args)
}

function resolveCommand(args: string[]): { command: CliCommand; args: string[] } {
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

  if (first === 'ui') {
    return { command: 'ui', args: rest }
  }

  if (!first.startsWith('-') && (first === 'generate' || first === 'expand')) {
    return { command: 'generate', args: rest }
  }

  return { command: 'generate', args }
}
