import { Box, Text } from 'ink'

import type { ToastKind } from '../../notifier'

export type ToastProps = {
  message: string
  kind: ToastKind
}

const toastChrome = (
  kind: ToastKind,
): {
  borderColor: 'gray' | 'yellow' | 'red'
  textColor: 'gray' | 'yellow' | 'red'
  title: string
} => {
  switch (kind) {
    case 'info':
      return { borderColor: 'gray', textColor: 'gray', title: 'Notice' }
    case 'progress':
      return { borderColor: 'yellow', textColor: 'yellow', title: 'Working' }
    case 'error':
      return { borderColor: 'red', textColor: 'red', title: 'Error' }
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

export const TOAST_HEIGHT = 4

export const Toast: React.FC<ToastProps> = ({ message, kind }) => {
  const { borderColor, textColor, title } = toastChrome(kind)

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      paddingY={0}
      height={TOAST_HEIGHT}
      overflow="hidden"
    >
      <Text color={textColor}>{title}</Text>
      <Text>{message}</Text>
    </Box>
  )
}
