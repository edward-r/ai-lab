export const stripBracketedPasteControlSequences = (value: string): string => {
  if (!value) {
    return value
  }

  return value.replace(/(?:\u001b)?\[(?:200|201)~/g, '')
}

export const stripTerminalPasteArtifacts = (value: string): string => {
  if (!value) {
    return value
  }

  const withoutBracketedPaste = stripBracketedPasteControlSequences(value)
  return withoutBracketedPaste.replace(/(?:\u001b)?\[[0-9;]*m/g, '')
}
