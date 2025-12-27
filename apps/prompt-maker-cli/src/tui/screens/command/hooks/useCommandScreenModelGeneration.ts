import type { NotifyOptions } from '../../../notifier'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { HistoryEntry, ModelOption } from '../../../types'

import { DEFAULT_MODEL_ID, getPreferredModelId } from '../../../model-options'
import { resolveDefaultGenerateModel } from '../../../../prompt-generator-service'

import { useModelProviderState } from './useModelProviderState'
import { useCommandGenerationPipeline } from './useCommandGenerationPipeline'

export type UseCommandScreenModelGenerationOptions = {
  pushHistoryProxy: (content: string, kind?: HistoryEntry['kind']) => void
  notify: (message: string, options?: NotifyOptions) => void

  files: string[]
  urls: string[]
  images: string[]
  videos: string[]

  smartContextEnabled: boolean
  smartContextRoot: string | null

  metaInstructions: string
  interactiveTransportPath?: string | undefined
  terminalColumns: number

  polishEnabled: boolean
  copyEnabled: boolean
  chatGptEnabled: boolean
  jsonOutputEnabled: boolean

  isTestCommandRunning: boolean

  setLastReasoning: (value: string | null) => void
  setLastGeneratedPrompt: (value: string | null) => void
}

export type UseCommandScreenModelGenerationResult = {
  modelOptions: ReturnType<typeof useModelProviderState>['modelOptions']
  currentModel: ReturnType<typeof useModelProviderState>['currentModel']
  selectModel: ReturnType<typeof useModelProviderState>['selectModel']
  currentTargetModel: ModelOption['id']
  selectTargetModel: (nextId: ModelOption['id']) => void
  providerStatuses: ReturnType<typeof useModelProviderState>['providerStatuses']
  updateProviderStatus: ReturnType<typeof useModelProviderState>['updateProviderStatus']
  pipeline: ReturnType<typeof useCommandGenerationPipeline>
}

export const useCommandScreenModelGeneration = ({
  pushHistoryProxy,
  notify,
  files,
  urls,
  images,
  videos,
  smartContextEnabled,
  smartContextRoot,
  metaInstructions,
  interactiveTransportPath,
  terminalColumns,
  polishEnabled,
  copyEnabled,
  chatGptEnabled,
  jsonOutputEnabled,
  isTestCommandRunning,
  setLastReasoning,
  setLastGeneratedPrompt,
}: UseCommandScreenModelGenerationOptions): UseCommandScreenModelGenerationResult => {
  const { modelOptions, currentModel, selectModel, providerStatuses, updateProviderStatus } =
    useModelProviderState({ pushHistory: pushHistoryProxy })

  const [currentTargetModel, setCurrentTargetModelState] =
    useState<ModelOption['id']>(DEFAULT_MODEL_ID)
  const userSelectedTargetModelRef = useRef(false)

  const selectTargetModel = useCallback((nextId: ModelOption['id']) => {
    userSelectedTargetModelRef.current = true
    setCurrentTargetModelState((prev) => (prev === nextId ? prev : nextId))
  }, [])

  useEffect(() => {
    let cancelled = false

    const syncDefaultTargetModel = async (): Promise<void> => {
      if (userSelectedTargetModelRef.current) {
        return
      }

      const resolvedDefault = await resolveDefaultGenerateModel().catch(() => null)
      if (cancelled || userSelectedTargetModelRef.current) {
        return
      }

      const preferred = getPreferredModelId(modelOptions, resolvedDefault)
      setCurrentTargetModelState((prev) => (prev === preferred ? prev : preferred))
    }

    void syncDefaultTargetModel()

    return () => {
      cancelled = true
    }
  }, [modelOptions])

  const pipeline = useCommandGenerationPipeline({
    pushHistory: pushHistoryProxy,
    notify,
    files,
    urls,
    images,
    videos,
    smartContextEnabled,
    smartContextRoot,
    metaInstructions,
    currentModel,
    targetModel: currentTargetModel,
    interactiveTransportPath,
    terminalColumns,
    polishEnabled,
    jsonOutputEnabled,
    copyEnabled,
    chatGptEnabled,
    isTestCommandRunning,
    onProviderStatusUpdate: updateProviderStatus,
    onReasoningUpdate: setLastReasoning,
    onLastGeneratedPromptUpdate: setLastGeneratedPrompt,
  })

  return {
    modelOptions,
    currentModel,
    selectModel,
    currentTargetModel,
    selectTargetModel,
    providerStatuses,
    updateProviderStatus,
    pipeline,
  }
}
