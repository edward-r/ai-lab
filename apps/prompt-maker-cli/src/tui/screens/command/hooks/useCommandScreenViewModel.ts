import { useMemo } from 'react'

import type { DebugKeyEvent } from '../../../components/core/MultilineTextInput'
import type { HistoryEntry, ModelOption, PopupState, ProviderStatusMap } from '../../../types'
import type { TokenUsageBreakdown, TokenUsageRun } from '../../../token-usage-store'

import type { CommandInputProps } from '../components/CommandInput'
import type { CommandMenuPaneProps } from '../components/CommandMenuPane'
import type { HistoryPaneProps } from '../components/HistoryPane'
import type { PopupAreaProps } from '../components/PopupArea'

export type UseCommandScreenViewModelOptions = {
  transport: {
    isAwaitingTransportInput: boolean
  }

  panes: {
    history: HistoryPaneProps
    menu: CommandMenuPaneProps
  }

  popup: {
    base: {
      popupState: PopupState
      helpOpen: boolean
      overlayHeight: number
    }

    model: {
      modelPopupOptions: ModelOption[]
      modelPopupSelection: number
      modelPopupRecentCount: number
      providerStatuses: ProviderStatusMap
      onModelPopupQueryChange: (next: string) => void
      onModelPopupSubmit: (option?: ModelOption) => void
    }

    context: {
      files: string[]
      filePopupSuggestions: string[]
      filePopupSuggestionSelectionIndex: number
      filePopupSuggestionsFocused: boolean
      onFilePopupDraftChange: (next: string) => void
      onAddFile: (value: string) => void

      urls: string[]
      onUrlPopupDraftChange: (next: string) => void
      onAddUrl: (value: string) => void

      images: string[]
      imagePopupSuggestions: string[]
      imagePopupSuggestionSelectionIndex: number
      imagePopupSuggestionsFocused: boolean
      onImagePopupDraftChange: (next: string) => void
      onAddImage: (value: string) => void

      videos: string[]
      videoPopupSuggestions: string[]
      videoPopupSuggestionSelectionIndex: number
      videoPopupSuggestionsFocused: boolean
      onVideoPopupDraftChange: (next: string) => void
      onAddVideo: (value: string) => void

      smartContextEnabled: boolean
      smartContextRoot: string | null
      smartPopupSuggestions: string[]
      smartPopupSuggestionSelectionIndex: number
      smartPopupSuggestionsFocused: boolean
      onSmartPopupDraftChange: (next: string) => void
      onSmartRootSubmit: (value: string) => void
    }

    history: {
      historyPopupItems: string[]
      onHistoryPopupDraftChange: (next: string) => void
      onHistoryPopupSubmit: (value: string) => void
    }

    intent: {
      intentPopupSuggestions: string[]
      intentPopupSuggestionSelectionIndex: number
      intentPopupSuggestionsFocused: boolean
      onIntentPopupDraftChange: (next: string) => void
      onIntentFileSubmit: (value: string) => void
    }

    instructions: {
      onInstructionsDraftChange: (next: string) => void
      onInstructionsSubmit: (value: string) => void
    }

    series: {
      isGenerating: boolean
      onSeriesDraftChange: (next: string) => void
      onSeriesSubmit: (value: string) => void
    }

    test: {
      isTestCommandRunning: boolean
      onTestDraftChange: (next: string) => void
      onTestSubmit: (value: string) => void
    }

    tokens: {
      tokenUsageRun: TokenUsageRun | null
      tokenUsageBreakdown: TokenUsageBreakdown | null
    }

    settings: {
      statusChips: string[]
    }

    reasoning: {
      reasoningPopupLines: HistoryEntry[]
      reasoningPopupVisibleRows: number
    }
  }

  input: {
    base: {
      value: string
      onChange: (next: string) => void
      onSubmit: (value: string) => void
      isPasteActive: boolean
      hint: string | undefined
      debugLine: string | undefined
      tokenLabel: (token: string) => string | null
      debugKeysEnabled: boolean
      onDebugKeyEvent: (event: DebugKeyEvent) => void
    }

    state: {
      isPopupOpen: boolean
      helpOpen: boolean
      isAwaitingRefinement: boolean
      isBusy: boolean
    }

    statusChips: string[]
  }
}

export type UseCommandScreenViewModelResult = {
  transportMessage: string | null
  historyPaneProps: HistoryPaneProps
  popupAreaProps: PopupAreaProps
  commandMenuPaneProps: CommandMenuPaneProps
  commandInputProps: CommandInputProps
}

export const useCommandScreenViewModel = ({
  transport,
  panes,
  popup,
  input,
}: UseCommandScreenViewModelOptions): UseCommandScreenViewModelResult => {
  const transportMessage = transport.isAwaitingTransportInput
    ? 'Waiting for interactive transport input (send refine/finish).'
    : null

  const historyPaneProps = panes.history
  const commandMenuPaneProps = panes.menu

  const popupAreaProps = useMemo<PopupAreaProps>(
    () => ({
      ...popup.base,
      ...popup.model,
      ...popup.context,
      ...popup.history,
      ...popup.intent,
      ...popup.instructions,
      ...popup.series,
      ...popup.test,
      ...popup.tokens,
      ...popup.settings,
      ...popup.reasoning,
    }),
    [
      popup.base,
      popup.context,
      popup.history,
      popup.instructions,
      popup.intent,
      popup.model,
      popup.reasoning,
      popup.series,
      popup.settings,
      popup.test,
      popup.tokens,
    ],
  )

  const commandInputProps = useMemo<CommandInputProps>(
    () => ({
      value: input.base.value,
      onChange: input.base.onChange,
      onSubmit: input.base.onSubmit,
      mode: input.state.isAwaitingRefinement ? 'refinement' : 'intent',
      isDisabled: input.state.isPopupOpen || input.state.helpOpen,
      isPasteActive: input.base.isPasteActive,
      isBusy: input.state.isBusy,
      statusChips: input.statusChips,
      hint: input.base.hint,
      debugLine: input.base.debugLine,
      tokenLabel: input.base.tokenLabel,
      onDebugKeyEvent: input.base.debugKeysEnabled ? input.base.onDebugKeyEvent : undefined,
      placeholder: input.state.isAwaitingRefinement
        ? 'Describe refinement (or empty to finish)...'
        : 'Describe your goal or type /command',
    }),
    [input],
  )

  return {
    transportMessage,
    historyPaneProps,
    popupAreaProps,
    commandMenuPaneProps,
    commandInputProps,
  }
}
