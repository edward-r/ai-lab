/*
 * CommandInput
 *
 * Presentational wrapper around the core `InputBar`.
 *
 * Why wrap it?
 * - `CommandScreen` has a lot of orchestration logic; extracting this makes the
 *   render tree more readable.
 * - The wrapper also makes it clearer which props are part of the "screen model".
 */

import { InputBar } from '../../../components/core/InputBar'
import type { DebugKeyEvent } from '../../../components/core/MultilineTextInput'

export type CommandInputProps = {
  value: string
  onChange: (next: string) => void
  onSubmit: (value: string) => void
  mode: 'intent' | 'refinement'
  isDisabled: boolean
  isPasteActive: boolean
  isBusy: boolean
  statusChips: string[]
  hint?: string | undefined
  debugLine?: string | undefined
  tokenLabel: (token: string) => string | null
  onDebugKeyEvent?: ((event: DebugKeyEvent) => void) | undefined
  placeholder: string
}

export const CommandInput = ({
  value,
  onChange,
  onSubmit,
  mode,
  isDisabled,
  isPasteActive,
  isBusy,
  statusChips,
  hint,
  debugLine,
  tokenLabel,
  onDebugKeyEvent,
  placeholder,
}: CommandInputProps) => {
  return (
    <InputBar
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      mode={mode}
      isDisabled={isDisabled}
      isPasteActive={isPasteActive}
      isBusy={isBusy}
      statusChips={statusChips}
      hint={hint}
      debugLine={debugLine}
      tokenLabel={tokenLabel}
      onDebugKeyEvent={onDebugKeyEvent}
      placeholder={placeholder}
    />
  )
}
