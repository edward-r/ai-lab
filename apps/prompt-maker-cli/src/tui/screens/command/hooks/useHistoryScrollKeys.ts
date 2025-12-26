import { useInput, type Key } from 'ink'

import { useStableCallback } from '../../../hooks/useStableCallback'

export type UseHistoryScrollKeysOptions = {
  isCommandMenuActive: boolean
  isPopupOpen: boolean
  helpOpen: boolean
  historyRows: number
  scrollBy: (delta: number) => void
}

export const useHistoryScrollKeys = ({
  isCommandMenuActive,
  isPopupOpen,
  helpOpen,
  historyRows,
  scrollBy,
}: UseHistoryScrollKeysOptions): void => {
  const handleInput = useStableCallback((_input: string, key: Key) => {
    if (key.upArrow) {
      scrollBy(-1)
      return
    }
    if (key.downArrow) {
      scrollBy(1)
      return
    }
    if (key.pageUp) {
      scrollBy(-historyRows)
      return
    }
    if (key.pageDown) {
      scrollBy(historyRows)
    }
  })

  useInput(handleInput, { isActive: !isCommandMenuActive && !isPopupOpen && !helpOpen })
}
