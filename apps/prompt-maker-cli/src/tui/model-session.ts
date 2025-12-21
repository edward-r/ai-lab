let lastSessionModelId: string | null = null
let recentSessionModelIds: string[] = []

const RECENT_MODEL_LIMIT = 5

export const getLastSessionModel = (): string | null => lastSessionModelId

export const getRecentSessionModels = (): string[] => [...recentSessionModelIds]

export const recordRecentSessionModel = (modelId: string): void => {
  const normalized = modelId.trim()
  if (!normalized) {
    return
  }

  recentSessionModelIds = [
    normalized,
    ...recentSessionModelIds.filter((existing) => existing !== normalized),
  ].slice(0, RECENT_MODEL_LIMIT)
}

export const setLastSessionModel = (modelId: string): void => {
  const normalized = modelId.trim()
  lastSessionModelId = normalized || null
}

export const resetLastSessionModelForTests = (): void => {
  lastSessionModelId = null
  recentSessionModelIds = []
}

export const resetRecentSessionModelsForTests = (): void => {
  recentSessionModelIds = []
}
