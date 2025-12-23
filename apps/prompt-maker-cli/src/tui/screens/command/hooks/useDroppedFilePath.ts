import fs from 'node:fs'

import { useMemo } from 'react'

import { parseAbsolutePathFromInput } from '../../../drag-drop-path'

export type UseDroppedFilePathResult = string | null

export const useDroppedFilePath = (inputValue: string): UseDroppedFilePathResult => {
  return useMemo(() => {
    const candidate = parseAbsolutePathFromInput(inputValue)
    if (!candidate) {
      return null
    }

    try {
      const stats = fs.statSync(candidate)
      return stats.isFile() ? candidate : null
    } catch {
      return null
    }
  }, [inputValue])
}
