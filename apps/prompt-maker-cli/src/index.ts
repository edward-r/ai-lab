#!/usr/bin/env node

import { runGenerateCommand } from './generate-command'

const argv = process.argv.slice(2)
const normalizedArgs = normalizeArgs(argv)

void runGenerateCommand(normalizedArgs)

function normalizeArgs(args: string[]): string[] {
  if (args.length === 0) {
    return args
  }

  const [first, ...rest] = args
  if (!first) {
    return args
  }

  if (!first.startsWith('-') && (first === 'generate' || first === 'expand')) {
    return rest
  }

  return args
}
