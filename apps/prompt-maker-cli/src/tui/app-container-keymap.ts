import type { Key } from 'ink'

export type AppContainerView = 'generate' | 'tests'

export type AppContainerKeyAction =
  | { type: 'none' }
  | { type: 'exit' }
  | { type: 'toggle-help'; nextIsHelpOpen: boolean }
  | { type: 'open-command-palette' }
  | { type: 'switch-to-tests' }
  | { type: 'switch-to-generate-and-open-command-palette' }

const toControlCharacter = (letter: string): string | null => {
  if (!letter) {
    return null
  }
  const normalized = letter.toLowerCase()
  const code = normalized.charCodeAt(0)
  if (code < 97 || code > 122) {
    return null
  }
  return String.fromCharCode(code - 96)
}

const matchesControlKey = (input: string, key: Key, target: string): boolean => {
  if (!target || !input) {
    return false
  }
  if (key.ctrl && input.toLowerCase() === target.toLowerCase()) {
    return true
  }
  const controlChar = toControlCharacter(target)
  return controlChar ? input === controlChar : false
}

const isHelpToggle = (input: string, key: Key): boolean => {
  if (key.ctrl || key.meta) {
    return false
  }
  return input === '?'
}

export type ResolveAppContainerKeyActionOptions = {
  input: string
  key: Key
  view: AppContainerView
  isPopupOpen: boolean
  isHelpOpen: boolean
}

export const resolveAppContainerKeyAction = ({
  input,
  key,
  view,
  isPopupOpen,
  isHelpOpen,
}: ResolveAppContainerKeyActionOptions): AppContainerKeyAction => {
  if (isHelpOpen) {
    if (key.escape || isHelpToggle(input, key)) {
      return { type: 'toggle-help', nextIsHelpOpen: false }
    }
    return { type: 'none' }
  }

  if (isHelpToggle(input, key)) {
    return { type: 'toggle-help', nextIsHelpOpen: true }
  }

  if (matchesControlKey(input, key, 'c')) {
    return { type: 'exit' }
  }

  if (key.escape) {
    return { type: 'none' }
  }

  if (view === 'generate' && isPopupOpen) {
    if (matchesControlKey(input, key, 'g') || matchesControlKey(input, key, 't')) {
      return { type: 'none' }
    }
  }

  if (matchesControlKey(input, key, 'g')) {
    return view === 'generate'
      ? { type: 'open-command-palette' }
      : { type: 'switch-to-generate-and-open-command-palette' }
  }

  if (matchesControlKey(input, key, 't')) {
    return { type: 'switch-to-tests' }
  }

  return { type: 'none' }
}
