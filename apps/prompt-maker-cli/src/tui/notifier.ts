import { useCallback, useEffect, useReducer, useRef } from 'react'

export type ToastKind = 'info' | 'progress' | 'error'

export type Toast = {
  id: number
  message: string
  kind: ToastKind
}

export type NotifierState = {
  toast: Toast | null
}

export type NotifierAction =
  | { type: 'toast.show'; toast: Toast }
  | { type: 'toast.dismiss'; id: number }

export const notifierReducer = (state: NotifierState, action: NotifierAction): NotifierState => {
  switch (action.type) {
    case 'toast.show':
      return { toast: action.toast }
    case 'toast.dismiss':
      return state.toast?.id === action.id ? { toast: null } : state
    default: {
      const exhaustive: never = action
      return exhaustive
    }
  }
}

export type NotifyOptions = {
  kind?: ToastKind
  autoDismissMs?: number
}

export type UseNotifierOptions = {
  autoDismissMs?: number
}

const DEFAULT_AUTO_DISMISS_MS = 2200

export const useNotifier = (options: UseNotifierOptions = {}) => {
  const autoDismissMs = options.autoDismissMs ?? DEFAULT_AUTO_DISMISS_MS
  const [state, dispatch] = useReducer(notifierReducer, { toast: null })

  const nextToastIdRef = useRef(1)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback((): void => {
    if (!timeoutRef.current) {
      return
    }
    clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
    }
  }, [clearTimer])

  const notify = useCallback(
    (message: string, notifyOptions: NotifyOptions = {}): void => {
      const trimmed = message.trim()
      if (!trimmed) {
        return
      }

      clearTimer()

      const nextToast: Toast = {
        id: nextToastIdRef.current++,
        message: trimmed,
        kind: notifyOptions.kind ?? 'info',
      }

      dispatch({ type: 'toast.show', toast: nextToast })

      const dismissalMs = notifyOptions.autoDismissMs ?? autoDismissMs
      timeoutRef.current = setTimeout(() => {
        dispatch({ type: 'toast.dismiss', id: nextToast.id })
      }, dismissalMs)
    },
    [autoDismissMs, clearTimer],
  )

  const dismiss = useCallback((): void => {
    const current = state.toast
    if (!current) {
      return
    }
    clearTimer()
    dispatch({ type: 'toast.dismiss', id: current.id })
  }, [clearTimer, state.toast])

  return {
    toast: state.toast,
    notify,
    dismiss,
  }
}
