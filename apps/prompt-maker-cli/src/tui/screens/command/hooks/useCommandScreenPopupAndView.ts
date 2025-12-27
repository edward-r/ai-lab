import { useCommandScreenBindings } from './useCommandScreenBindings'
import { useCommandScreenViewModel } from './useCommandScreenViewModel'

import type {
  UseCommandScreenPopupAndViewOptions,
  UseCommandScreenPopupAndViewResult,
} from './useCommandScreenPopupAndView.types'

export const useCommandScreenPopupAndView = (
  options: UseCommandScreenPopupAndViewOptions,
): UseCommandScreenPopupAndViewResult => {
  const { context, input, popup, history, generation } = options

  const { popupManager, shell, bindings, enhancedStatusChips } = useCommandScreenBindings(options)

  const viewModel = useCommandScreenViewModel({
    transport: { isAwaitingTransportInput: shell.isAwaitingTransportInput },
    panes: {
      history: {
        lines: shell.history,
        visibleRows: shell.historyRows,
        scrollOffset: shell.scrollOffset,
      },
      menu: {
        isActive: shell.isCommandMenuActive,
        height: shell.menuHeight,
        commands: shell.visibleCommands,
        selectedIndex: input.commandSelectionIndex,
      },
    },
    popup: {
      base: {
        popupState: popupManager.popupState,
        helpOpen: popup.helpOpen,
        overlayHeight: shell.overlayHeight,
      },
      model: {
        modelPopupOptions: bindings.modelPopupOptions,
        modelPopupSelection: bindings.modelPopupSelection,
        modelPopupRecentCount: bindings.modelPopupRecentCount,
        providerStatuses: generation.providerStatuses,
        onModelPopupQueryChange: bindings.onModelPopupQueryChange,
        onModelPopupSubmit: popupManager.actions.handleModelPopupSubmit,
      },
      context: {
        files: context.files,
        filePopupSuggestions: bindings.filePopupSuggestions,
        filePopupSuggestionSelectionIndex: bindings.filePopupSuggestionSelectionIndex,
        filePopupSuggestionsFocused: bindings.filePopupSuggestionsFocused,
        onFilePopupDraftChange: bindings.onFilePopupDraftChange,
        onAddFile: bindings.onAddFile,
        urls: context.urls,
        onUrlPopupDraftChange: bindings.onUrlPopupDraftChange,
        onAddUrl: bindings.onAddUrl,
        images: context.images,
        imagePopupSuggestions: bindings.imagePopupSuggestions,
        imagePopupSuggestionSelectionIndex: bindings.imagePopupSuggestionSelectionIndex,
        imagePopupSuggestionsFocused: bindings.imagePopupSuggestionsFocused,
        onImagePopupDraftChange: bindings.onImagePopupDraftChange,
        onAddImage: bindings.onAddImage,
        videos: context.videos,
        videoPopupSuggestions: bindings.videoPopupSuggestions,
        videoPopupSuggestionSelectionIndex: bindings.videoPopupSuggestionSelectionIndex,
        videoPopupSuggestionsFocused: bindings.videoPopupSuggestionsFocused,
        onVideoPopupDraftChange: bindings.onVideoPopupDraftChange,
        onAddVideo: bindings.onAddVideo,
        smartContextEnabled: context.smartContextEnabled,
        smartContextRoot: context.smartContextRoot,
        smartPopupSuggestions: bindings.smartPopupSuggestions,
        smartPopupSuggestionSelectionIndex: bindings.smartPopupSuggestionSelectionIndex,
        smartPopupSuggestionsFocused: bindings.smartPopupSuggestionsFocused,
        onSmartPopupDraftChange: bindings.onSmartPopupDraftChange,
        onSmartRootSubmit: bindings.onSmartRootSubmit,
      },
      history: {
        historyPopupItems: bindings.historyPopupItems,
        onHistoryPopupDraftChange: bindings.onHistoryPopupDraftChange,
        onHistoryPopupSubmit: bindings.onHistoryPopupSubmit,
      },
      intent: {
        intentPopupSuggestions: bindings.intentPopupSuggestions,
        intentPopupSuggestionSelectionIndex: bindings.intentPopupSuggestionSelectionIndex,
        intentPopupSuggestionsFocused: bindings.intentPopupSuggestionsFocused,
        onIntentPopupDraftChange: bindings.onIntentPopupDraftChange,
        onIntentFileSubmit: popupManager.actions.handleIntentFileSubmit,
      },
      instructions: {
        onInstructionsDraftChange: bindings.onInstructionsDraftChange,
        onInstructionsSubmit: popupManager.actions.handleInstructionsSubmit,
      },
      series: {
        isGenerating: generation.isGenerating,
        onSeriesDraftChange: bindings.onSeriesDraftChange,
        onSeriesSubmit: bindings.onSeriesSubmit,
      },
      test: {
        isTestCommandRunning: history.isTestCommandRunning,
        onTestDraftChange: bindings.onTestDraftChange,
        onTestSubmit: history.onTestPopupSubmit,
      },
      tokens: {
        tokenUsageRun: generation.tokenUsageRun,
        tokenUsageBreakdown: generation.tokenUsageBreakdown,
      },
      settings: { statusChips: enhancedStatusChips },
      reasoning: {
        reasoningPopupLines: bindings.reasoningPopupLines,
        reasoningPopupVisibleRows: bindings.reasoningPopupVisibleRows,
      },
    },
    input: {
      base: {
        value: input.inputValue,
        onChange: bindings.handleInputChange,
        onSubmit: bindings.handleSubmit,
        isPasteActive: input.isPasteActive,
        hint: shell.inputBarHint,
        debugLine: shell.inputBarDebugLine,
        tokenLabel: bindings.tokenLabel,
        debugKeysEnabled: input.debugKeysEnabled,
        onDebugKeyEvent: input.onDebugKeyEvent,
      },
      state: {
        isPopupOpen: popupManager.isPopupOpen,
        helpOpen: popup.helpOpen,
        isAwaitingRefinement: generation.isAwaitingRefinement,
        isBusy: generation.isGenerating || history.isTestCommandRunning,
      },
      statusChips: enhancedStatusChips,
    },
  })

  return {
    transportMessage: viewModel.transportMessage,
    historyPaneProps: viewModel.historyPaneProps,
    popupAreaProps: viewModel.popupAreaProps,
    commandMenuPaneProps: viewModel.commandMenuPaneProps,
    commandInputProps: viewModel.commandInputProps,
  }
}
