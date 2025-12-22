import path from 'node:path'

import { useMemo } from 'react'

import { formatProviderStatusChip } from '../../../provider-chip'
import type { ModelOption, ProviderStatusMap } from '../../../types'

export type UseCommandScreenChipsOptions = {
  currentModel: ModelOption['id']
  providerStatuses: ProviderStatusMap
  statusChips: string[]
  intentFilePath: string
  metaInstructions: string
}

export type UseCommandScreenChipsResult = {
  providerChip: string
  enhancedStatusChips: string[]
}

export const useCommandScreenChips = ({
  currentModel,
  providerStatuses,
  statusChips,
  intentFilePath,
  metaInstructions,
}: UseCommandScreenChipsOptions): UseCommandScreenChipsResult => {
  const providerChip = useMemo(
    () => formatProviderStatusChip(currentModel, providerStatuses),
    [currentModel, providerStatuses],
  )

  const trimmedIntentFilePath = intentFilePath.trim()
  const trimmedMetaInstructions = metaInstructions.trim()

  const enhancedStatusChips = useMemo(() => {
    const chips = [...statusChips, providerChip]

    if (trimmedIntentFilePath) {
      chips.push('[intent:file]')
      chips.push(`[file:${path.basename(trimmedIntentFilePath)}]`)
    } else {
      chips.push('[intent:text]')
    }

    if (trimmedMetaInstructions) {
      chips.push('[instr:on]')
    }

    return chips
  }, [providerChip, statusChips, trimmedIntentFilePath, trimmedMetaInstructions])

  return {
    providerChip,
    enhancedStatusChips,
  }
}
