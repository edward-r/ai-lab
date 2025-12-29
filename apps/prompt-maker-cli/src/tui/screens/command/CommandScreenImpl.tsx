import { forwardRef, memo, useImperativeHandle } from 'react'
import { Box, Text, useStdout } from 'ink'

import { BackgroundFill } from '../../components/core/BackgroundFill'

import { CommandInput } from './components/CommandInput'
import { CommandMenuPane } from './components/CommandMenuPane'
import { HistoryPane } from './components/HistoryPane'
import { PopupArea } from './components/PopupArea'
import { useCommandScreenController } from './hooks/useCommandScreenController'

import type { NotifyOptions } from '../../notifier'
import { useTheme } from '../../theme/theme-provider'
import { inkBackgroundColorProps, inkColorProps } from '../../theme/theme-types'

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

      const { theme } = useTheme()
      const { stdout } = useStdout()

      const terminalRows = stdout?.rows ?? 24
      const terminalColumns = stdout?.columns ?? 80

      // AppContainer applies `paddingX={2}` (left + right), which reduces the
      // actual renderable width available to CommandScreen. If we try to render
      // a full-width `BackgroundFill` at `stdout.columns`, Ink will truncate the
      // line and paint `...` in the last cells.
      const backdropColumns = Math.max(0, terminalColumns - 4)

      const showPopupOverlay = Boolean(popupAreaProps.popupState) && !popupAreaProps.helpOpen

      return (
        <Box flexGrow={1} width="100%" {...inkBackgroundColorProps(theme.background)}>
          <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1} width="100%">
            {transportMessage ? (
              <Box flexShrink={0}>
                <Text {...inkColorProps(theme.warning)}>{transportMessage}</Text>
              </Box>
            ) : null}

            <HistoryPane {...historyPaneProps} />
            <CommandMenuPane {...commandMenuPaneProps} />
            <CommandInput {...commandInputProps} />
          </Box>

          {showPopupOverlay ? (
            <Box position="absolute" width="100%" height="100%">
              <Box position="absolute" width="100%" height="100%" overflow="hidden">
                <BackgroundFill
                  rows={terminalRows}
                  columns={backdropColumns}
                  background={theme.panelBackground}
                />
              </Box>
              <Box
                position="absolute"
                width="100%"
                height="100%"
                justifyContent="center"
                alignItems="center"
              >
                <PopupArea {...popupAreaProps} />
              </Box>
            </Box>
          ) : null}
        </Box>
      )
    },
  ),
)

CommandScreen.displayName = 'CommandScreen'
