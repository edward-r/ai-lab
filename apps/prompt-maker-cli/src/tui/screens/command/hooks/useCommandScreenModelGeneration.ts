import type { NotifyOptions } from '../../../notifier'
import type { HistoryEntry } from '../../../types'

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
    providerStatuses,
    updateProviderStatus,
    pipeline,
  }
}
