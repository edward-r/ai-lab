#!/usr/bin/env node

import { runGenerateCommand } from './generate-command'
import { runTestCommand } from './test-command'

const { command, args } = resolveCommand(process.argv.slice(2))

if (command === 'test') {
  void runTestCommand(args)
} else {
  void runGenerateCommand(args)
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
