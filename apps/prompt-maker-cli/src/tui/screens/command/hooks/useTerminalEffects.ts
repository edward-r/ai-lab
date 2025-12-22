import type { WriteStream } from 'node:tty'
import { useEffect } from 'react'

import type { HistoryEntry } from '../../../types'

type PushHistory = (content: string, kind?: HistoryEntry['kind']) => void

type SetTerminalSize = (rows: number, columns: number) => void

export type UseTerminalEffectsOptions = {
  stdout: WriteStream | undefined
  setTerminalSize: SetTerminalSize
  interactiveTransportPath?: string | undefined
  history: HistoryEntry[]
  pushHistory: PushHistory
}

export const useTerminalEffects = ({
  stdout,
  setTerminalSize,
  interactiveTransportPath,
  history,
  pushHistory,
}: UseTerminalEffectsOptions): void => {
  useEffect(() => {
    if (!stdout) {
      return undefined
    }
    stdout.write('\x1bc')
    stdout.write('\x1b[?2004h')
    return () => {
      stdout.write('\x1b[?2004l')
    }
  }, [stdout])

  useEffect(() => {
    if (!interactiveTransportPath) {
      return
    }
    const transportLine = `Interactive transport listening on ${interactiveTransportPath}`
    if (history.some((entry) => entry.content === transportLine)) {
      return
    }
    pushHistory(transportLine, 'system')
  }, [history, interactiveTransportPath, pushHistory])

  useEffect(() => {
    if (!stdout) {
      return undefined
    }
    const handleResize = (): void => {
      setTerminalSize(stdout.rows, stdout.columns)
    }
    stdout.on('resize', handleResize)
    return () => {
      stdout.off('resize', handleResize)
    }
  }, [setTerminalSize, stdout])
}
