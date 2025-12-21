import type { Key } from 'ink'

export type CommandMenuKeyAction =
  | { type: 'none' }
  | { type: 'close' }
  | { type: 'change-selection'; nextIndex: number }

export type ResolveCommandMenuKeyActionOptions = {
  key: Key
  selectedIndex: number
  itemCount: number
}

export const resolveCommandMenuKeyAction = ({
  key,
  selectedIndex,
  itemCount,
}: ResolveCommandMenuKeyActionOptions): CommandMenuKeyAction => {
  if (itemCount <= 0) {
    return { type: 'none' }
  }

  if (key.escape) {
    return { type: 'close' }
  }

  if (key.upArrow) {
    return { type: 'change-selection', nextIndex: Math.max(0, selectedIndex - 1) }
  }

  if (key.downArrow) {
    return { type: 'change-selection', nextIndex: Math.min(itemCount - 1, selectedIndex + 1) }
  }

  return { type: 'none' }
}
