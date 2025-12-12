import { resolveGeminiCredentials, resolveOpenAiCredentials } from '../config'
import { inferProviderFromModelId } from '../model-providers'
import type { ModelProvider } from '../model-providers'
import type { ProviderStatus } from './types'

const statusCache = new Map<ModelProvider, ProviderStatus>()
const inflightChecks = new Map<ModelProvider, Promise<ProviderStatus>>()

const buildStatus = (
  provider: ModelProvider,
  status: ProviderStatus['status'],
  message: string,
): ProviderStatus => ({ provider, status, message })

const resolveStatusInternal = async (provider: ModelProvider): Promise<ProviderStatus> => {
  try {
    if (provider === 'openai') {
      await resolveOpenAiCredentials()
      return buildStatus('openai', 'ok', 'Credentials available')
    }
    if (provider === 'gemini') {
      await resolveGeminiCredentials()
      return buildStatus('gemini', 'ok', 'Credentials available')
    }
    return buildStatus(provider, 'ok', 'Custom provider (not validated)')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provider error.'
    const status: ProviderStatus['status'] = /missing/i.test(message) ? 'missing' : 'error'
    return buildStatus(provider, status, message)
  }
}

export const checkProviderStatus = async (provider: ModelProvider): Promise<ProviderStatus> => {
  if (statusCache.has(provider)) {
    return statusCache.get(provider) as ProviderStatus
  }
  if (inflightChecks.has(provider)) {
    return inflightChecks.get(provider) as Promise<ProviderStatus>
  }
  const promise = resolveStatusInternal(provider).then((status) => {
    statusCache.set(provider, status)
    return status
  })
  inflightChecks.set(provider, promise)
  try {
    return await promise
  } finally {
    inflightChecks.delete(provider)
  }
}

export const checkModelProviderStatus = async (modelId: string): Promise<ProviderStatus> => {
  const provider = inferProviderFromModelId(modelId)
  return await checkProviderStatus(provider)
}

export const getCachedProviderStatus = (provider: ModelProvider): ProviderStatus | undefined =>
  statusCache.get(provider)

export const invalidateProviderStatus = (provider?: ModelProvider): void => {
  if (provider) {
    statusCache.delete(provider)
    inflightChecks.delete(provider)
    return
  }
  statusCache.clear()
  inflightChecks.clear()
}
