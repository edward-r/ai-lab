/*
 * PopupArea
 *
 * Presentational component: renders whichever popup is currently active.
 *
 * This keeps the large popup JSX switch out of `CommandScreen` so the main
 * screen file is mostly orchestration.
 */

import { Box } from 'ink'

import { ListPopup } from '../../../components/popups/ListPopup'
import { ModelPopup } from '../../../components/popups/ModelPopup'
import { SmartPopup } from '../../../components/popups/SmartPopup'
import { TokenUsagePopup } from '../../../components/popups/TokenUsagePopup'
import { SettingsPopup } from '../../../components/popups/SettingsPopup'
import { ReasoningPopup } from '../../../components/popups/ReasoningPopup'
import { TestPopup } from '../../../components/popups/TestPopup'
import { TogglePopup } from '../../../components/popups/TogglePopup'
import { IntentFilePopup } from '../../../components/popups/IntentFilePopup'
import { InstructionsPopup } from '../../../components/popups/InstructionsPopup'
import { SeriesIntentPopup } from '../../../components/popups/SeriesIntentPopup'
import { ThemePickerPopup } from '../../../components/popups/ThemePickerPopup'
import { ThemeModePopup } from '../../../components/popups/ThemeModePopup'
import type { HistoryEntry, ModelOption, PopupState, ProviderStatusMap } from '../../../types'
import type { TokenUsageBreakdown, TokenUsageRun } from '../../../token-usage-store'

export type PopupAreaProps = {
  popupState: PopupState
  helpOpen: boolean
  overlayHeight: number

  // Model popup
  modelPopupOptions: ModelOption[]
  modelPopupSelection: number
  modelPopupRecentCount: number
  providerStatuses: ProviderStatusMap
  onModelPopupQueryChange: (next: string) => void
  onModelPopupSubmit: (option?: ModelOption) => void

  // Toggle popup
  // (toggle popup is self-contained; selection is stored in `popupState`)

  // File popup
  files: string[]
  filePopupSuggestions: string[]
  filePopupSuggestionSelectionIndex: number
  filePopupSuggestionsFocused: boolean
  onFilePopupDraftChange: (next: string) => void
  onAddFile: (value: string) => void

  // URL popup
  urls: string[]
  onUrlPopupDraftChange: (next: string) => void
  onAddUrl: (value: string) => void

  // Image popup
  images: string[]
  imagePopupSuggestions: string[]
  imagePopupSuggestionSelectionIndex: number
  imagePopupSuggestionsFocused: boolean
  onImagePopupDraftChange: (next: string) => void
  onAddImage: (value: string) => void

  // Video popup
  videos: string[]
  videoPopupSuggestions: string[]
  videoPopupSuggestionSelectionIndex: number
  videoPopupSuggestionsFocused: boolean
  onVideoPopupDraftChange: (next: string) => void
  onAddVideo: (value: string) => void

  // History popup
  historyPopupItems: string[]
  onHistoryPopupDraftChange: (next: string) => void
  onHistoryPopupSubmit: (value: string) => void

  // Intent popup
  intentPopupSuggestions: string[]
  intentPopupSuggestionSelectionIndex: number
  intentPopupSuggestionsFocused: boolean
  onIntentPopupDraftChange: (next: string) => void
  onIntentFileSubmit: (value: string) => void

  // Instructions
  onInstructionsDraftChange: (next: string) => void
  onInstructionsSubmit: (value: string) => void

  // Series
  isGenerating: boolean
  onSeriesDraftChange: (next: string) => void
  onSeriesSubmit: (value: string) => void

  // Test
  isTestCommandRunning: boolean
  onTestDraftChange: (next: string) => void
  onTestSubmit: (value: string) => void

  // Tokens
  tokenUsageRun: TokenUsageRun | null
  tokenUsageBreakdown: TokenUsageBreakdown | null

  // Settings
  statusChips: string[]

  // Reasoning
  reasoningPopupLines: HistoryEntry[]
  reasoningPopupVisibleRows: number

  // Smart context
  smartContextEnabled: boolean
  smartContextRoot: string | null
  smartPopupSuggestions: string[]
  smartPopupSuggestionSelectionIndex: number
  smartPopupSuggestionsFocused: boolean
  onSmartPopupDraftChange: (next: string) => void
  onSmartRootSubmit: (value: string) => void
}

export const PopupArea = ({
  popupState,
  helpOpen,
  overlayHeight,
  modelPopupOptions,
  modelPopupSelection,
  modelPopupRecentCount,
  providerStatuses,
  onModelPopupQueryChange,
  onModelPopupSubmit,
  files,
  filePopupSuggestions,
  filePopupSuggestionSelectionIndex,
  filePopupSuggestionsFocused,
  onFilePopupDraftChange,
  onAddFile,
  urls,
  onUrlPopupDraftChange,
  onAddUrl,
  images,
  imagePopupSuggestions,
  imagePopupSuggestionSelectionIndex,
  imagePopupSuggestionsFocused,
  onImagePopupDraftChange,
  onAddImage,
  videos,
  videoPopupSuggestions,
  videoPopupSuggestionSelectionIndex,
  videoPopupSuggestionsFocused,
  onVideoPopupDraftChange,
  onAddVideo,
  historyPopupItems,
  onHistoryPopupDraftChange,
  onHistoryPopupSubmit,
  intentPopupSuggestions,
  intentPopupSuggestionSelectionIndex,
  intentPopupSuggestionsFocused,
  onIntentPopupDraftChange,
  onIntentFileSubmit,
  onInstructionsDraftChange,
  onInstructionsSubmit,
  isGenerating,
  onSeriesDraftChange,
  onSeriesSubmit,
  isTestCommandRunning,
  onTestDraftChange,
  onTestSubmit,
  tokenUsageRun,
  tokenUsageBreakdown,
  statusChips,
  reasoningPopupLines,
  reasoningPopupVisibleRows,
  smartContextEnabled,
  smartContextRoot,
  smartPopupSuggestions,
  smartPopupSuggestionSelectionIndex,
  smartPopupSuggestionsFocused,
  onSmartPopupDraftChange,
  onSmartRootSubmit,
}: PopupAreaProps) => {
  if (!popupState || helpOpen) {
    return null
  }

  return popupState.type === 'model' ? (
    <ModelPopup
      title={popupState.kind === 'target' ? 'Select target model' : 'Select model'}
      query={popupState.query}
      options={modelPopupOptions}
      selectedIndex={modelPopupSelection}
      recentCount={modelPopupRecentCount}
      maxHeight={overlayHeight}
      providerStatuses={providerStatuses}
      onQueryChange={onModelPopupQueryChange}
      onSubmit={onModelPopupSubmit}
    />
  ) : popupState.type === 'toggle' ? (
    <TogglePopup field={popupState.field} selectionIndex={popupState.selectionIndex} />
  ) : popupState.type === 'file' ? (
    <ListPopup
      title="File Context"
      placeholder="src/**/*.ts"
      draft={popupState.draft}
      items={files}
      selectedIndex={popupState.selectionIndex}
      emptyLabel="No file globs added"
      instructions="Enter to add · Tab/↓ suggestions · ↑/↓ select · Del remove (Backspace when empty) · Esc close"
      suggestedItems={filePopupSuggestions}
      suggestedSelectionIndex={filePopupSuggestionSelectionIndex}
      suggestedFocused={filePopupSuggestionsFocused}
      maxHeight={overlayHeight}
      onDraftChange={onFilePopupDraftChange}
      onSubmitDraft={onAddFile}
    />
  ) : popupState.type === 'url' ? (
    <ListPopup
      title="URL Context"
      placeholder="https://github.com/..."
      draft={popupState.draft}
      items={urls}
      selectedIndex={popupState.selectionIndex}
      emptyLabel="No URLs added"
      instructions="Enter to add · ↑/↓ to select · Del to remove · Esc to close"
      onDraftChange={onUrlPopupDraftChange}
      onSubmitDraft={onAddUrl}
    />
  ) : popupState.type === 'image' ? (
    <ListPopup
      title="Images"
      placeholder="path/to/image.png"
      draft={popupState.draft}
      items={images}
      selectedIndex={popupState.selectionIndex}
      emptyLabel="No images attached"
      instructions="Enter to add · Tab/↓ suggestions · ↑/↓ select · Del remove (Backspace when empty) · Esc close"
      suggestedItems={imagePopupSuggestions}
      suggestedSelectionIndex={imagePopupSuggestionSelectionIndex}
      suggestedFocused={imagePopupSuggestionsFocused}
      maxHeight={overlayHeight}
      onDraftChange={onImagePopupDraftChange}
      onSubmitDraft={onAddImage}
    />
  ) : popupState.type === 'video' ? (
    <ListPopup
      title="Videos"
      placeholder="path/to/video.mp4"
      draft={popupState.draft}
      items={videos}
      selectedIndex={popupState.selectionIndex}
      emptyLabel="No videos attached"
      instructions="Enter to add · Tab/↓ suggestions · ↑/↓ select · Del remove (Backspace when empty) · Esc close"
      suggestedItems={videoPopupSuggestions}
      suggestedSelectionIndex={videoPopupSuggestionSelectionIndex}
      suggestedFocused={videoPopupSuggestionsFocused}
      maxHeight={overlayHeight}
      onDraftChange={onVideoPopupDraftChange}
      onSubmitDraft={onAddVideo}
    />
  ) : popupState.type === 'history' ? (
    <ListPopup
      title="History"
      placeholder="Search commands & intents"
      draft={popupState.draft}
      items={historyPopupItems}
      selectedIndex={popupState.selectionIndex}
      emptyLabel="No history saved"
      instructions="Enter to reuse · ↑/↓ navigate · Esc to close"
      onDraftChange={onHistoryPopupDraftChange}
      onSubmitDraft={onHistoryPopupSubmit}
    />
  ) : popupState.type === 'intent' ? (
    <IntentFilePopup
      draft={popupState.draft}
      suggestions={intentPopupSuggestions}
      suggestedSelectionIndex={intentPopupSuggestionSelectionIndex}
      suggestedFocused={intentPopupSuggestionsFocused}
      maxHeight={overlayHeight}
      onDraftChange={onIntentPopupDraftChange}
      onSubmitDraft={onIntentFileSubmit}
    />
  ) : popupState.type === 'instructions' ? (
    <InstructionsPopup
      draft={popupState.draft}
      onDraftChange={onInstructionsDraftChange}
      onSubmitDraft={onInstructionsSubmit}
    />
  ) : popupState.type === 'series' ? (
    <SeriesIntentPopup
      draft={popupState.draft}
      hint={popupState.hint}
      isRunning={isGenerating}
      onDraftChange={onSeriesDraftChange}
      onSubmitDraft={onSeriesSubmit}
    />
  ) : popupState.type === 'test' ? (
    <TestPopup
      draft={popupState.draft}
      isRunning={isTestCommandRunning}
      onDraftChange={onTestDraftChange}
      onSubmitDraft={onTestSubmit}
    />
  ) : popupState.type === 'tokens' ? (
    <TokenUsagePopup run={tokenUsageRun} breakdown={tokenUsageBreakdown} />
  ) : popupState.type === 'settings' ? (
    <SettingsPopup chips={statusChips} />
  ) : popupState.type === 'theme' ? (
    <ThemePickerPopup
      selectionIndex={popupState.selectionIndex}
      initialThemeName={popupState.initialThemeName}
      maxHeight={overlayHeight}
    />
  ) : popupState.type === 'themeMode' ? (
    <ThemeModePopup
      selectionIndex={popupState.selectionIndex}
      initialMode={popupState.initialMode}
    />
  ) : popupState.type === 'reasoning' ? (
    <ReasoningPopup
      lines={reasoningPopupLines}
      visibleRows={reasoningPopupVisibleRows}
      scrollOffset={popupState.scrollOffset}
    />
  ) : popupState.type === 'smart' ? (
    <SmartPopup
      savedRoot={smartContextRoot}
      draft={popupState.draft}
      suggestedItems={smartPopupSuggestions}
      suggestedSelectionIndex={smartPopupSuggestionSelectionIndex}
      suggestedFocused={smartPopupSuggestionsFocused}
      maxHeight={overlayHeight}
      onDraftChange={onSmartPopupDraftChange}
      onSubmitRoot={onSmartRootSubmit}
    />
  ) : null
}
