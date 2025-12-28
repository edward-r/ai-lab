import { Box } from 'ink'
import React, { memo, useEffect } from 'react'

import {
  TOAST_ANIMATION_TICK_MS,
  TOAST_HEIGHT,
  TOAST_HORIZONTAL_INSET_COLUMNS,
  TOAST_TOP_OFFSET_ROWS,
} from '../../toast-constants'
import type { ToastId, ToastItem } from '../../notifier'
import { useToastContext } from '../../notifier'

import { Toast } from './Toast'

const useAnimatedInt = (targetValue: number, initialValue: number) => {
  const [value, setValue] = React.useState(initialValue)

  useEffect(() => {
    if (value === targetValue) {
      return
    }

    const timer = setTimeout(() => {
      setValue((prev) => {
        if (prev === targetValue) {
          return prev
        }

        const direction = prev < targetValue ? 1 : -1
        return prev + direction
      })
    }, TOAST_ANIMATION_TICK_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [targetValue, value])

  return {
    value,
    isComplete: value === targetValue,
  }
}

type ToastOverlayItemProps = {
  toast: ToastItem
  onExitComplete: (id: ToastId) => void
}

const ToastOverlayItem = ({ toast, onExitComplete }: ToastOverlayItemProps) => {
  const targetHeight = toast.isExiting ? 0 : TOAST_HEIGHT
  const { value: height, isComplete } = useAnimatedInt(targetHeight, 0)

  useEffect(() => {
    if (!toast.isExiting) {
      return
    }

    if (!isComplete) {
      return
    }

    onExitComplete(toast.id)
  }, [isComplete, onExitComplete, toast.id, toast.isExiting])

  if (height === 0 && toast.isExiting) {
    return null
  }

  return (
    <Box height={height} overflow="hidden">
      <Toast message={toast.message} kind={toast.kind} />
    </Box>
  )
}

export const ToastOverlay = memo(() => {
  const { toasts, removeToast } = useToastContext()

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      flexDirection="column"
      justifyContent="flex-start"
      alignItems="flex-end"
      paddingX={TOAST_HORIZONTAL_INSET_COLUMNS}
      paddingTop={TOAST_TOP_OFFSET_ROWS}
    >
      {toasts.map((toast) => (
        <ToastOverlayItem key={toast.id} toast={toast} onExitComplete={removeToast} />
      ))}
    </Box>
  )
})

ToastOverlay.displayName = 'ToastOverlay'
