import type { DebugKeyEvent } from '../../../components/core/MultilineTextInput'

export const formatDebugKeyEvent = (event: DebugKeyEvent): string => {
  const codes = Array.from(event.input)
    .map((character) => character.codePointAt(0) ?? 0)
    .map((code) => `0x${code.toString(16).padStart(2, '0')}`)
    .join(' ')

  const activeFlags = (Object.entries(event.key) as Array<[string, unknown]>)
    .filter(([, value]) => value === true)
    .map(([name]) => name)
    .join(',')

  const safeInput = JSON.stringify(event.input)
  return `dbg input=${safeInput} codes=[${codes}] key=[${activeFlags}]`
}
