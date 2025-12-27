/**
 * TODO: the dedupe logic in showToast could be made more sophisticated.
 * It should not be deduping at all. Need to figure out a better way to handle
 * repeated messages that need to be updated (e.g. progress toasts).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { DEFAULT_MAX_TOASTS, TOAST_ANIMATION_TICK_MS, TOAST_HEIGHT } from './toast-constants'

export type ToastKind = 'info' | 'progress' | 'warning' | 'error'

export type ToastId = number

export type ToastItem = {
  id: ToastId
  message: string
  kind: ToastKind
  createdAt: number
  autoDismissMs: number | null
  isExiting: boolean
}

export type NotifyOptions = {
  kind?: ToastKind
  autoDismissMs?: number
}

export type UseNotifierOptions = {
  autoDismissMs?: number
}

type ToastContextValue = {
  toasts: ToastItem[]
  showToast: (message: string, options?: NotifyOptions) => ToastId | null
  dismissToast: (id: ToastId) => void
  removeToast: (id: ToastId) => void
  dismissLatest: () => void
  maxToasts: number
  defaultAutoDismissMs: number
  exitAnimationMs: number
}

const DEFAULT_AUTO_DISMISS_MS = 2200

const ToastContext = createContext<ToastContextValue | null>(null)

export type ToastProviderProps = {
  children: React.ReactNode
  maxToasts?: number
  defaultAutoDismissMs?: number
  exitAnimationMs?: number
}

const createToastTrimmedMessage = (message: string): string | null => {
  const trimmed = message.trim()
  return trimmed ? trimmed : null
}

const getOldestActiveToastId = (toasts: ToastItem[]): ToastId | null => {
  const oldest = toasts.find((toast) => !toast.isExiting)
  return oldest ? oldest.id : null
}

export const ToastProvider = ({
  children,
  maxToasts = DEFAULT_MAX_TOASTS,
  defaultAutoDismissMs = DEFAULT_AUTO_DISMISS_MS,
  exitAnimationMs = TOAST_HEIGHT * TOAST_ANIMATION_TICK_MS,
}: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const nextToastIdRef = useRef(1)
  const dismissTimersRef = useRef(new Map<ToastId, ReturnType<typeof setTimeout>>())
  const removalTimersRef = useRef(new Map<ToastId, ReturnType<typeof setTimeout>>())
  const toastsRef = useRef<ToastItem[]>([])

  useEffect(() => {
    toastsRef.current = toasts
  }, [toasts])

  const clearDismissTimer = useCallback((id: ToastId): void => {
    const timer = dismissTimersRef.current.get(id)
    if (!timer) {
      return
    }
    clearTimeout(timer)
    dismissTimersRef.current.delete(id)
  }, [])

  const clearRemovalTimer = useCallback((id: ToastId): void => {
    const timer = removalTimersRef.current.get(id)
    if (!timer) {
      return
    }
    clearTimeout(timer)
    removalTimersRef.current.delete(id)
  }, [])

  const removeToast = useCallback(
    (id: ToastId): void => {
      clearDismissTimer(id)
      clearRemovalTimer(id)

      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    },
    [clearDismissTimer, clearRemovalTimer],
  )

  const beginExit = useCallback(
    (id: ToastId): void => {
      clearDismissTimer(id)

      setToasts((prev) => {
        const toast = prev.find((candidate) => candidate.id === id)
        if (!toast || toast.isExiting) {
          return prev
        }
        return prev.map((candidate) =>
          candidate.id === id ? { ...candidate, isExiting: true } : candidate,
        )
      })

      if (removalTimersRef.current.has(id)) {
        return
      }

      const timer = setTimeout(() => {
        removeToast(id)
      }, exitAnimationMs)

      removalTimersRef.current.set(id, timer)
    },
    [clearDismissTimer, exitAnimationMs, removeToast],
  )

  const dismissToast = useCallback(
    (id: ToastId): void => {
      beginExit(id)
    },
    [beginExit],
  )

  const dismissLatest = useCallback((): void => {
    const latestActive = [...toastsRef.current].reverse().find((toast) => !toast.isExiting)
    if (!latestActive) {
      return
    }

    beginExit(latestActive.id)
  }, [beginExit])

  const showToast = useCallback(
    (message: string, options: NotifyOptions = {}): ToastId | null => {
      const trimmed = createToastTrimmedMessage(message)
      if (!trimmed) {
        return null
      }

      const kind = options.kind ?? 'info'
      const autoDismissMs = options.autoDismissMs ?? defaultAutoDismissMs

      const latestActive = [...toastsRef.current].reverse().find((toast) => !toast.isExiting)
      const shouldReuse =
        latestActive && latestActive.message === trimmed && latestActive.kind === kind

      const toastId = shouldReuse ? latestActive.id : nextToastIdRef.current++

      if (!shouldReuse) {
        const toast: ToastItem = {
          id: toastId,
          message: trimmed,
          kind,
          createdAt: Date.now(),
          autoDismissMs,
          isExiting: false,
        }

        const nextToasts = [...toastsRef.current, toast]
        toastsRef.current = nextToasts
        setToasts(nextToasts)
      }

      clearDismissTimer(toastId)

      if (autoDismissMs !== null) {
        const timer = setTimeout(() => {
          dismissToast(toastId)
        }, autoDismissMs)

        dismissTimersRef.current.set(toastId, timer)
      }

      return toastId
    },
    [clearDismissTimer, defaultAutoDismissMs, dismissToast],
  )

  useEffect(() => {
    const activeToasts = toasts.filter((toast) => !toast.isExiting)
    if (activeToasts.length <= maxToasts) {
      return
    }

    const oldestActiveId = getOldestActiveToastId(toasts)
    if (oldestActiveId === null) {
      return
    }

    beginExit(oldestActiveId)
  }, [beginExit, maxToasts, toasts])

  useEffect(() => {
    const dismissTimers = dismissTimersRef.current
    const removalTimers = removalTimersRef.current

    return () => {
      for (const timer of dismissTimers.values()) {
        clearTimeout(timer)
      }
      dismissTimers.clear()

      for (const timer of removalTimers.values()) {
        clearTimeout(timer)
      }
      removalTimers.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      showToast,
      dismissToast,
      removeToast,
      dismissLatest,
      maxToasts,
      defaultAutoDismissMs,
      exitAnimationMs,
    }),
    [
      defaultAutoDismissMs,
      dismissLatest,
      dismissToast,
      exitAnimationMs,
      maxToasts,
      removeToast,
      showToast,
      toasts,
    ],
  )

  return React.createElement(ToastContext.Provider, { value }, children)
}

export const useToastContext = (): ToastContextValue => {
  const value = useContext(ToastContext)
  if (!value) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return value
}

export const useNotifier = (options: UseNotifierOptions = {}) => {
  const { toasts, showToast, dismissToast, dismissLatest, defaultAutoDismissMs } = useToastContext()

  const defaultDismissMs = options.autoDismissMs ?? defaultAutoDismissMs

  const notify = useCallback(
    (message: string, notifyOptions: NotifyOptions = {}): void => {
      void showToast(message, {
        ...notifyOptions,
        autoDismissMs: notifyOptions.autoDismissMs ?? defaultDismissMs,
      })
    },
    [defaultDismissMs, showToast],
  )

  return {
    toasts,
    notify,
    showToast,
    dismiss: dismissLatest,
    dismissToast,
  }
}
