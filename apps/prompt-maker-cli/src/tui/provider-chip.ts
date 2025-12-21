import { inferProviderFromModelId } from '../model-providers'

import type { ProviderStatusMap } from './types'

const resolveProviderStatusSuffix = (
  providerStatus: ProviderStatusMap[keyof ProviderStatusMap] | undefined,
): string => {
  if (!providerStatus) {
    return 'unknown'
  }

  return providerStatus.status === 'ok'
    ? 'ok'
    : providerStatus.status === 'missing'
      ? 'missing-key'
      : 'error'
}

export const formatProviderStatusChip = (
  modelId: string,
  providerStatuses: ProviderStatusMap,
): string => {
  const provider = inferProviderFromModelId(modelId)
  const suffix = resolveProviderStatusSuffix(providerStatuses[provider])
  return `[${provider}:${suffix}]`
}
