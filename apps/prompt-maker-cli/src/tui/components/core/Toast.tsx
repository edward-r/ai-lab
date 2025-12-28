import { Box, Text, useStdout } from 'ink'

import type { ToastKind } from '../../notifier'
import { TOAST_HEIGHT, TOAST_HORIZONTAL_INSET_COLUMNS } from '../../toast-constants'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'

const APP_CONTAINER_PADDING_X = 2

const padRight = (value: string, width: number): string => {
  if (width <= 0) {
    return ''
  }

  const trimmed = value.length > width ? value.slice(0, width) : value
  return trimmed.length === width ? trimmed : trimmed.padEnd(width, ' ')
}

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

export { TOAST_HEIGHT }

export const Toast = ({ message, kind }: ToastProps) => {
  const { theme } = useTheme()
  const { stdout } = useStdout()
  const chrome = toastChrome(kind)

  // Ink doesn't paint "empty" cells when rendering overlapping/absolute layers.
  // To keep the toast opaque, we explicitly pad each content line to the
  // available inner width so it prints background-colored spaces.
  const terminalColumns = stdout?.columns ?? 80
  const toastWidth = Math.max(
    20,
    terminalColumns - 2 * (APP_CONTAINER_PADDING_X + TOAST_HORIZONTAL_INSET_COLUMNS),
  )

  const borderColumns = 2
  const paddingColumns = 2
  const contentWidth = Math.max(0, toastWidth - borderColumns - paddingColumns)

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

  const backgroundProps = inkBackgroundColorProps(theme.popupBackground)

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      height={TOAST_HEIGHT}
      width={toastWidth}
      overflow="hidden"
      {...inkBorderColorProps(borderColor)}
      {...backgroundProps}
    >
      <Text {...backgroundProps} {...inkColorProps(titleColor)}>
        {padRight(chrome.title, contentWidth)}
      </Text>
      <Text {...backgroundProps} {...inkColorProps(theme.text)}>
        {padRight(message, contentWidth)}
      </Text>
    </Box>
  )
}
