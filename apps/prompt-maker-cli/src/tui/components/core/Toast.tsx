import { Box, Text } from 'ink'

import type { ToastKind } from '../../notifier'
import { useTheme } from '../../theme/theme-provider'
import { inkBorderColorProps, inkColorProps } from '../../theme/theme-types'

export type ToastProps = {
  message: string
  kind: ToastKind
}

type ToastChromeTone = 'default' | 'warning' | 'error'

type ToastChrome = {
  borderTone: ToastChromeTone
  titleTone: ToastChromeTone
  title: string
}

const toastChrome = (kind: ToastKind): ToastChrome => {
  switch (kind) {
    case 'info':
      return { borderTone: 'default', titleTone: 'default', title: 'Notice' }
    case 'progress':
      return { borderTone: 'warning', titleTone: 'warning', title: 'Working' }
    case 'warning':
      return { borderTone: 'warning', titleTone: 'warning', title: 'Warning' }
    case 'error':
      return { borderTone: 'error', titleTone: 'error', title: 'Error' }
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

export const TOAST_HEIGHT = 4

export const Toast = ({ message, kind }: ToastProps) => {
  const { theme } = useTheme()
  const chrome = toastChrome(kind)

  const borderColor =
    chrome.borderTone === 'warning'
      ? theme.warning
      : chrome.borderTone === 'error'
        ? theme.error
        : theme.border

  const titleColor =
    chrome.titleTone === 'warning'
      ? theme.warning
      : chrome.titleTone === 'error'
        ? theme.error
        : theme.mutedText

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      height={TOAST_HEIGHT}
      overflow="hidden"
      {...inkBorderColorProps(borderColor)}
    >
      <Text {...inkColorProps(titleColor)}>{chrome.title}</Text>
      <Text>{message}</Text>
    </Box>
  )
}
