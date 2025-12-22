import { forwardRef, memo, useImperativeHandle } from 'react'
import { Box, Text } from 'ink'

import { CommandInput } from './components/CommandInput'
import { CommandMenuPane } from './components/CommandMenuPane'
import { HistoryPane } from './components/HistoryPane'
import { PopupArea } from './components/PopupArea'
import { useCommandScreenController } from './hooks/useCommandScreenController'

import type { NotifyOptions } from '../../notifier'

type CommandScreenProps = {
  interactiveTransportPath?: string | undefined
  onPopupVisibilityChange?: (isOpen: boolean) => void
  commandMenuSignal?: number
  helpOpen?: boolean
  reservedRows?: number
  notify: (message: string, options?: NotifyOptions) => void
}

export type CommandScreenHandle = {
  suppressNextInput: () => void
}

export const CommandScreen = memo(
  forwardRef<CommandScreenHandle, CommandScreenProps>(
    (
      {
        interactiveTransportPath,
        onPopupVisibilityChange,
        commandMenuSignal,
        helpOpen = false,
        reservedRows = 0,
        notify,
      },
      ref,
    ) => {
      const {
        transportMessage,
        historyPaneProps,
        popupAreaProps,
        commandMenuPaneProps,
        commandInputProps,
        suppressNextInput,
      } = useCommandScreenController({
        ...(interactiveTransportPath ? { interactiveTransportPath } : {}),
        ...(onPopupVisibilityChange ? { onPopupVisibilityChange } : {}),
        ...(commandMenuSignal !== undefined ? { commandMenuSignal } : {}),
        helpOpen,
        reservedRows,
        notify,
      })

      useImperativeHandle(ref, () => ({ suppressNextInput }), [suppressNextInput])

      return (
        <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
          {transportMessage ? (
            <Box flexShrink={0}>
              <Text color="yellow">{transportMessage}</Text>
            </Box>
          ) : null}

          <HistoryPane {...historyPaneProps} />
          <PopupArea {...popupAreaProps} />
          <CommandMenuPane {...commandMenuPaneProps} />
          <CommandInput {...commandInputProps} />
        </Box>
      )
    },
  ),
)

CommandScreen.displayName = 'CommandScreen'
