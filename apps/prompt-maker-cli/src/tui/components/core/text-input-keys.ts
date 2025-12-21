import type { Key } from 'ink'

const parseKittyCsiUCode = (input: string): number | null => {
  const match = /^\u001b\[([0-9]+)(?:;[0-9]+)*u$/.exec(input)
  if (!match) {
    return null
  }
  const raw = match[1]
  if (!raw) {
    return null
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export const isBackspaceKey = (input: string, key: Key): boolean => {
  const kittyCsiUCode = parseKittyCsiUCode(input)

  const isKittyBackspaceSequence =
    (kittyCsiUCode !== null && [8, 51, 127].includes(kittyCsiUCode)) ||
    input === '\u001b[127~' ||
    input === '\u001b[8~' ||
    input === '\u001b[51~'

  const hasDel = input.includes('\u007f')
  const hasBackspace = input.includes('\b')
  const isCtrl = key.ctrl === true

  return (
    key.backspace === true ||
    hasDel ||
    hasBackspace ||
    (isCtrl && input.toLowerCase() === 'h') ||
    (isCtrl && input === '?') ||
    isKittyBackspaceSequence ||
    (key.delete === true && input === '')
  )
}
