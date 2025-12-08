import type { InteractivePromptController } from '../generate-command'

type PendingResolver<T> = ((value: T) => void) | null

export type RefinementControllerHandle = {
  controller: InteractivePromptController
  submit: (instruction: string) => void
  finish: () => void
}

export const createRefinementController = (): RefinementControllerHandle => {
  let instructionQueue: string[] = []
  let finishRequested = false
  let pendingShouldResolve: PendingResolver<boolean> = null
  let pendingRefinementResolve: PendingResolver<string | null> = null

  const flushShould = (): void => {
    if (instructionQueue.length > 0 && pendingShouldResolve) {
      pendingShouldResolve(true)
      pendingShouldResolve = null
    } else if (finishRequested && instructionQueue.length === 0 && pendingShouldResolve) {
      pendingShouldResolve(false)
      pendingShouldResolve = null
    }
  }

  const flushRefinement = (): void => {
    if (instructionQueue.length > 0 && pendingRefinementResolve) {
      const next = instructionQueue.shift() ?? null
      pendingRefinementResolve(next)
      pendingRefinementResolve = null
    } else if (finishRequested && instructionQueue.length === 0 && pendingRefinementResolve) {
      pendingRefinementResolve(null)
      pendingRefinementResolve = null
    }
  }

  const controller: InteractivePromptController = {
    async shouldRefine() {
      if (instructionQueue.length > 0) {
        return true
      }

      if (finishRequested) {
        return false
      }

      return await new Promise<boolean>((resolve) => {
        pendingShouldResolve = resolve
      })
    },
    async collectRefinement() {
      if (instructionQueue.length > 0) {
        return instructionQueue.shift() ?? null
      }

      if (finishRequested) {
        return null
      }

      return await new Promise<string | null>((resolve) => {
        pendingRefinementResolve = resolve
      })
    },
  }

  const submit = (instruction: string): void => {
    if (!instruction.trim()) {
      return
    }
    instructionQueue = [...instructionQueue, instruction.trim()]
    flushShould()
    flushRefinement()
  }

  const finish = (): void => {
    finishRequested = true
    flushShould()
    flushRefinement()
  }

  return { controller, submit, finish }
}
