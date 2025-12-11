export type IntentSourceSelection =
  | { kind: 'text'; intent: string }
  | { kind: 'file'; intentFile: string }
  | { kind: 'empty' }

export const resolveIntentSource = (
  intentValue: string,
  intentFileValue: string,
): IntentSourceSelection => {
  const trimmedFile = intentFileValue.trim()
  if (trimmedFile.length > 0) {
    return { kind: 'file', intentFile: trimmedFile }
  }
  const trimmedIntent = intentValue.trim()
  if (trimmedIntent.length > 0) {
    return { kind: 'text', intent: trimmedIntent }
  }
  return { kind: 'empty' }
}
