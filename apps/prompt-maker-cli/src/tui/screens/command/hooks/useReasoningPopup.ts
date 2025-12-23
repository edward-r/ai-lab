import { useMemo } from 'react'
import wrapAnsi from 'wrap-ansi'

import type { HistoryEntry } from '../../../types'

export type UseReasoningPopupOptions = {
  lastReasoning: string | null
  terminalColumns: number
  popupHeight: number
}

export type UseReasoningPopupResult = {
  reasoningPopupVisibleRows: number
  reasoningPopupLines: HistoryEntry[]
}

export const useReasoningPopup = ({
  lastReasoning,
  terminalColumns,
  popupHeight,
}: UseReasoningPopupOptions): UseReasoningPopupResult => {
  const reasoningPopupVisibleRows = Math.max(1, popupHeight - 5)

  const reasoningPopupLines = useMemo(() => {
    const reasoning = lastReasoning?.trim() ?? ''
    if (!reasoning) {
      return []
    }

    const entries: HistoryEntry[] = []
    const wrapWidth = Math.max(40, terminalColumns - 6)
    let entryIndex = 0

    reasoning.split('\n').forEach((line) => {
      const wrapped = wrapAnsi(line, wrapWidth, { trim: false, hard: true })
      wrapped.split('\n').forEach((wrappedLine) => {
        entries.push({
          id: `reasoning-${entryIndex}`,
          content: wrappedLine,
          kind: 'system',
        })
        entryIndex += 1
      })
    })

    return entries
  }, [lastReasoning, terminalColumns])

  return { reasoningPopupVisibleRows, reasoningPopupLines }
}
