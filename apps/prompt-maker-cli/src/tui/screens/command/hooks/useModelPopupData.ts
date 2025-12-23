import { useMemo } from 'react'

import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { resolveModelPopupQuery } from '../../../model-filter'
import { buildModelPopupOptions } from '../../../model-popup-options'
import { getRecentSessionModels } from '../../../model-session'
import type { ModelOption, PopupState } from '../../../types'

export type UseModelPopupDataOptions = {
  popupState: PopupState
  modelOptions: readonly ModelOption[]
}

export type UseModelPopupDataResult = {
  modelPopupOptions: ModelOption[]
  modelPopupRecentCount: number
  modelPopupSelection: number
}

export const useModelPopupData = ({
  popupState,
  modelOptions,
}: UseModelPopupDataOptions): UseModelPopupDataResult => {
  const modelPopupQuery = popupState?.type === 'model' ? popupState.query : ''
  const debouncedModelPopupQuery = useDebouncedValue(modelPopupQuery, 75)
  const effectiveModelPopupQuery = resolveModelPopupQuery(modelPopupQuery, debouncedModelPopupQuery)

  const modelPopupData = useMemo(() => {
    if (popupState?.type !== 'model') {
      return { options: [], recentCount: 0 }
    }

    const recentModelIds = getRecentSessionModels()
    return buildModelPopupOptions({
      query: effectiveModelPopupQuery,
      modelOptions,
      recentModelIds,
    })
  }, [effectiveModelPopupQuery, modelOptions, popupState?.type])

  const modelPopupOptions = modelPopupData.options
  const modelPopupRecentCount = modelPopupData.recentCount

  const modelPopupSelection =
    popupState?.type === 'model'
      ? Math.min(popupState.selectionIndex, Math.max(modelPopupOptions.length - 1, 0))
      : 0

  return {
    modelPopupOptions,
    modelPopupRecentCount,
    modelPopupSelection,
  }
}
