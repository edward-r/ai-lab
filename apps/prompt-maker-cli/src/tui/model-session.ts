let lastSessionModelId: string | null = null

export const getLastSessionModel = (): string | null => lastSessionModelId

export const setLastSessionModel = (modelId: string): void => {
  const normalized = modelId.trim()
  lastSessionModelId = normalized || null
}

export const resetLastSessionModelForTests = (): void => {
  lastSessionModelId = null
}
