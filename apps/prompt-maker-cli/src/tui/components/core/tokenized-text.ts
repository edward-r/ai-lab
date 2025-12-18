export type TokenLabelLookup = (token: string) => string | null

export const expandTokenizedText = (value: string, tokenLabel: TokenLabelLookup): string => {
  let output = ''
  for (const character of value) {
    const label = tokenLabel(character)
    output += label ?? character
  }
  return output
}

export type CursorCoordinates = {
  readonly row: number
  readonly column: number
}

export const getTokenizedCursorCoordinates = (
  value: string,
  cursor: number,
  tokenLabel: TokenLabelLookup,
): CursorCoordinates => {
  let row = 0
  let column = 0

  const safeCursor = Math.max(0, Math.min(cursor, value.length))

  for (let index = 0; index < safeCursor; index += 1) {
    const character = value[index]
    if (!character) {
      break
    }

    if (character === '\n') {
      row += 1
      column = 0
      continue
    }

    const label = tokenLabel(character)
    column += label ? label.length : 1
  }

  return { row, column }
}

export const expandTokenizedLines = (
  value: string,
  tokenLabel: TokenLabelLookup,
): readonly string[] => {
  const lines = value.split('\n')
  return lines.map((line) => expandTokenizedText(line, tokenLabel))
}
