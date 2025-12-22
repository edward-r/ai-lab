import { useCallback, useEffect, useRef, useState } from 'react'

import {
  DEFAULT_MODEL_ID,
  getBuiltInModelOptions,
  getPreferredModelId,
  loadModelOptions,
} from '../../../model-options'
import { getLastSessionModel, setLastSessionModel } from '../../../model-session'
import { checkProviderStatus } from '../../../provider-status'
import type { HistoryEntry, ModelOption, ProviderStatus, ProviderStatusMap } from '../../../types'
import type { ModelProvider } from '../../../../model-providers'
import { resolveDefaultGenerateModel } from '../../../../prompt-generator-service'

const DEFAULT_PROVIDER_STATUSES: ProviderStatusMap = {
  openai: { provider: 'openai', status: 'error', message: 'Status unavailable' },
  gemini: { provider: 'gemini', status: 'error', message: 'Status unavailable' },
  other: {
    provider: 'other',
    status: 'ok',
    message: 'Custom provider (not validated)',
  },
}

type PushHistory = (content: string, kind?: HistoryEntry['kind']) => void

export type UseModelProviderStateResult = {
  modelOptions: ModelOption[]
  currentModel: ModelOption['id']
  selectModel: (nextId: ModelOption['id']) => void
  providerStatuses: ProviderStatusMap
  updateProviderStatus: (status: ProviderStatus) => void
}

export type UseModelProviderStateOptions = {
  pushHistory: PushHistory
}

export const useModelProviderState = ({
  pushHistory,
}: UseModelProviderStateOptions): UseModelProviderStateResult => {
  const builtInModelOptionsRef = useRef<ModelOption[]>(getBuiltInModelOptions())
  const initialSessionModelRef = useRef<string | null>(getLastSessionModel())
  const userSelectedModelRef = useRef(Boolean(initialSessionModelRef.current))

  const [modelOptions, setModelOptions] = useState<ModelOption[]>(builtInModelOptionsRef.current)
  const [currentModel, setCurrentModelState] = useState<ModelOption['id']>(
    initialSessionModelRef.current ?? builtInModelOptionsRef.current[0]?.id ?? DEFAULT_MODEL_ID,
  )
  const [providerStatuses, setProviderStatuses] =
    useState<ProviderStatusMap>(DEFAULT_PROVIDER_STATUSES)

  const applyCurrentModel = useCallback((nextId: ModelOption['id'], markUserSelection: boolean) => {
    setCurrentModelState((prev: ModelOption['id']) => (prev === nextId ? prev : nextId))
    setLastSessionModel(nextId)
    if (markUserSelection) {
      userSelectedModelRef.current = true
    }
  }, [])

  const selectModel = useCallback(
    (nextId: ModelOption['id']) => {
      applyCurrentModel(nextId, true)
    },
    [applyCurrentModel],
  )

  const updateProviderStatus = useCallback((status: ProviderStatus) => {
    setProviderStatuses((prev: ProviderStatusMap) => {
      const current = prev[status.provider]
      if (current && current.status === status.status && current.message === status.message) {
        return prev
      }
      return { ...prev, [status.provider]: status }
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const providers: ModelProvider[] = ['openai', 'gemini']

    const refreshStatuses = async (): Promise<void> => {
      for (const provider of providers) {
        try {
          const status = await checkProviderStatus(provider)
          if (cancelled) {
            return
          }
          updateProviderStatus(status)
        } catch (error) {
          if (cancelled) {
            return
          }
          const message = error instanceof Error ? error.message : 'Unknown provider error.'
          updateProviderStatus({ provider, status: 'error', message })
        }
      }
    }

    void refreshStatuses()

    return () => {
      cancelled = true
    }
  }, [updateProviderStatus])

  useEffect(() => {
    let cancelled = false

    const loadOptions = async (): Promise<void> => {
      try {
        const result = await loadModelOptions()
        if (cancelled) {
          return
        }
        setModelOptions(result.options)
        if (result.warning) {
          pushHistory(result.warning, 'system')
        }
        if (userSelectedModelRef.current) {
          return
        }

        const resolvedDefault = await resolveDefaultGenerateModel().catch(() => null)
        if (cancelled || userSelectedModelRef.current) {
          return
        }

        const preferred = getPreferredModelId(result.options, resolvedDefault)
        applyCurrentModel(preferred, false)
      } catch (error) {
        if (cancelled) {
          return
        }
        const message = error instanceof Error ? error.message : 'Unknown model option error.'
        pushHistory(`[model] Failed to load CLI models: ${message}`, 'system')
      }
    }

    void loadOptions()

    return () => {
      cancelled = true
    }
  }, [applyCurrentModel, pushHistory])

  return {
    modelOptions,
    currentModel,
    selectModel,
    providerStatuses,
    updateProviderStatus,
  }
}
