export const getHelpOverlayContentRows = (height: number): number => {
  return Math.max(1, height - 5)
}

export const getHelpOverlayMaxScroll = (lineCount: number, contentRows: number): number => {
  return Math.max(0, lineCount - contentRows)
}

export const clampHelpOverlayScrollOffset = (
  offset: number,
  lineCount: number,
  contentRows: number,
): number => {
  const maxScroll = getHelpOverlayMaxScroll(lineCount, contentRows)
  return Math.max(0, Math.min(offset, maxScroll))
}

export const scrollHelpOverlayBy = (
  offset: number,
  delta: number,
  lineCount: number,
  contentRows: number,
): number => {
  return clampHelpOverlayScrollOffset(offset + delta, lineCount, contentRows)
}
