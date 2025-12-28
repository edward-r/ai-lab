import path from 'node:path'

import { useMemo } from 'react'

import { estimateInputBarRows } from '../../../components/core/InputBar'
import type { PopupKind, PopupState } from '../../../types'
import type { InteractiveAwaitingMode } from '../../../generation-pipeline-reducer'

export type UseCommandScreenLayoutOptions = {
  terminalRows: number
  reservedRows: number

  helpOpen: boolean
  isPopupOpen: boolean
  popupState: PopupState

  menuHeight: number
  popupHeights: Record<PopupKind, number>

  inputValue: string
  droppedFilePath: string | null
  debugKeysEnabled: boolean
  debugKeyLine: string | null

  interactiveTransportPath?: string | undefined
  isGenerating: boolean
  awaitingInteractiveMode: InteractiveAwaitingMode | null

  isCommandMenuActive: boolean

  appStaticRows: number
  commandScreenOverheadRows: number
}

export type UseCommandScreenLayoutResult = {
  overlayHeight: number
  inputBarHint: string | undefined
  inputBarDebugLine: string | undefined
  inputBarRows: number
  isAwaitingTransportInput: boolean
  historyRows: number
}

export const useCommandScreenLayout = ({
  terminalRows,
  reservedRows,
  helpOpen,
  isPopupOpen,
  popupState,
  menuHeight,
  popupHeights,
  inputValue,
  droppedFilePath,
  debugKeysEnabled,
  debugKeyLine,
  interactiveTransportPath,
  isGenerating,
  awaitingInteractiveMode,
  isCommandMenuActive,
  appStaticRows,
  commandScreenOverheadRows,
}: UseCommandScreenLayoutOptions): UseCommandScreenLayoutResult => {
  const overlayHeight = useMemo(() => {
    if (helpOpen) {
      return 0
    }
    if (popupState) {
      return popupHeights[popupState.type as PopupKind]
    }
    return menuHeight
  }, [helpOpen, menuHeight, popupHeights, popupState])

  const inputBarHint = useMemo(() => {
    if (isPopupOpen || helpOpen || !droppedFilePath) {
      return undefined
    }
    return `Press Tab to add ${path.basename(droppedFilePath)} to context`
  }, [droppedFilePath, helpOpen, isPopupOpen])

  const inputBarDebugLine = useMemo(() => {
    if (!debugKeysEnabled) {
      return undefined
    }
    return debugKeyLine ?? 'dbg: press Backspace'
  }, [debugKeyLine, debugKeysEnabled])

  const inputBarRows = useMemo(
    () =>
      estimateInputBarRows({
        value: inputValue,
        hint: inputBarHint,
        debugLine: inputBarDebugLine,
      }),
    [inputBarDebugLine, inputBarHint, inputValue],
  )

  const isAwaitingTransportInput =
    isGenerating && Boolean(interactiveTransportPath) && awaitingInteractiveMode === 'transport'

  const historyRows = useMemo(() => {
    // Popups are now rendered as an absolute overlay, so they should NOT consume
    // layout rows. Only the in-flow command menu affects available history space.
    const overlaySpacingRows = !helpOpen && isCommandMenuActive ? 1 : 0
    const baseChromeRows = appStaticRows + commandScreenOverheadRows + inputBarRows
    const transportHeaderRows = interactiveTransportPath ? 1 : 0
    const transportAwaitingRows = isAwaitingTransportInput ? 1 : 0
    const parentRows = baseChromeRows + transportHeaderRows + transportAwaitingRows

    const availableRows = terminalRows - menuHeight - parentRows - overlaySpacingRows - reservedRows
    return Math.max(1, availableRows)
  }, [
    appStaticRows,
    commandScreenOverheadRows,
    helpOpen,
    inputBarRows,
    interactiveTransportPath,
    isAwaitingTransportInput,
    isCommandMenuActive,
    menuHeight,
    reservedRows,
    terminalRows,
  ])

  return {
    overlayHeight,
    inputBarHint,
    inputBarDebugLine,
    inputBarRows,
    isAwaitingTransportInput,
    historyRows,
  }
}
