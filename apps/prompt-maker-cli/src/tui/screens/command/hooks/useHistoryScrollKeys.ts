import { useInput } from 'ink'

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
  useInput(
    (_, key) => {
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
    },
    { isActive: !isCommandMenuActive && !isPopupOpen && !helpOpen },
  )
}
