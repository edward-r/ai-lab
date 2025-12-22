import type { PopupState } from '../tui/types'
import { popupReducer, type PopupAction, type PopupManagerState } from '../tui/popup-reducer'

describe('popupReducer', () => {
  const reduce = (state: PopupManagerState, action: PopupAction): PopupManagerState =>
    popupReducer(state, action)

  const initialState = (): PopupManagerState => ({ popupState: null, activeScan: null })

  it('opens and closes popups explicitly', () => {
    const opened = reduce(initialState(), { type: 'open-tokens' })
    expect(opened.popupState).toEqual({ type: 'tokens' })

    const closed = reduce(opened, { type: 'close' })
    expect(closed).toEqual({ popupState: null, activeScan: null })
  })

  it('switching popups clears scan state', () => {
    const afterFile = reduce(initialState(), { type: 'open-file', scanId: 1 })
    expect(afterFile.popupState?.type).toBe('file')
    expect(afterFile.activeScan).toEqual({ kind: 'file', id: 1 })

    const afterSmart = reduce(afterFile, { type: 'open-smart', scanId: 2, draft: 'src' })
    expect(afterSmart.popupState).toEqual({
      type: 'smart',
      draft: 'src',
      suggestedItems: [],
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    })
    expect(afterSmart.activeScan).toEqual({ kind: 'smart', id: 2 })
  })

  it('ignores stale async scan results', () => {
    const afterFile = reduce(initialState(), { type: 'open-file', scanId: 1 })
    const afterSmart = reduce(afterFile, { type: 'open-smart', scanId: 2, draft: '' })

    // A file scan resolving after the user switched popups must be ignored.
    const staleApplied = reduce(afterSmart, {
      type: 'scan-suggestions-success',
      kind: 'file',
      scanId: 1,
      suggestions: ['README.md'],
    })

    expect(staleApplied.popupState).toEqual(afterSmart.popupState)
    expect(staleApplied.activeScan).toEqual(afterSmart.activeScan)
  })

  it('applies scan results when popup and scanId match', () => {
    const afterFile = reduce(initialState(), { type: 'open-file', scanId: 1 })

    const applied = reduce(afterFile, {
      type: 'scan-suggestions-success',
      kind: 'file',
      scanId: 1,
      suggestions: ['src/index.ts', 'README.md'],
    })

    expect(applied.popupState).toEqual({
      type: 'file',
      draft: '',
      selectionIndex: 0,
      suggestedItems: ['src/index.ts', 'README.md'],
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    })
    expect(applied.activeScan).toBeNull()
  })

  it('preserves active scan across same-type set updates', () => {
    const afterFile = reduce(initialState(), { type: 'open-file', scanId: 1 })

    const updated = reduce(afterFile, {
      type: 'set',
      next: (prev: PopupState) => (prev?.type === 'file' ? { ...prev, draft: 'x' } : prev),
    })

    expect(updated.popupState).toEqual({
      type: 'file',
      draft: 'x',
      selectionIndex: 0,
      suggestedItems: [],
      suggestedSelectionIndex: 0,
      suggestedFocused: false,
    })
    expect(updated.activeScan).toEqual({ kind: 'file', id: 1 })
  })
})
