export const DEFAULT_MAX_VISIBLE_LIST_ITEMS = 6
export const DEFAULT_MAX_VISIBLE_SUGGESTIONS = 4

export type ListPopupHeights = {
  selectedRows: number
  suggestionRows: number
}

type ResolveListPopupHeightsOptions = {
  maxHeight: number | undefined
  hasSuggestions: boolean
}

export const resolveListPopupHeights = ({
  maxHeight,
  hasSuggestions,
}: ResolveListPopupHeightsOptions): ListPopupHeights => {
  if (!hasSuggestions) {
    return { selectedRows: DEFAULT_MAX_VISIBLE_LIST_ITEMS, suggestionRows: 0 }
  }

  const fallbackHeight = 16
  const resolvedHeight = maxHeight ?? fallbackHeight
  const borderRows = 2
  const contentHeight = Math.max(1, resolvedHeight - borderRows)

  const fixedRows = 5
  const availableRows = Math.max(contentHeight - fixedRows, 1)

  const selectedMin = Math.min(3, availableRows)
  const suggestionRows = Math.min(
    DEFAULT_MAX_VISIBLE_SUGGESTIONS,
    Math.max(0, availableRows - selectedMin),
  )
  const selectedRows = Math.max(1, availableRows - suggestionRows)

  return { selectedRows, suggestionRows }
}
