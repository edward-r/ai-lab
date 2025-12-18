export const stripBracketedPasteControlSequences = (value: string): string => {
  if (!value) {
    return value
  }

  return value.replace(/(?:\u001b)?\[(?:200|201)~/g, '')
}
