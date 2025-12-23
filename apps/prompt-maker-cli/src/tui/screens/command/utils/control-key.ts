export type ControlKey = {
  ctrl?: boolean | undefined
}

export const isControlKey = (input: string, key: ControlKey, target: string): boolean => {
  if (!target) {
    return false
  }

  const normalized = target.toLowerCase()
  const code = normalized.charCodeAt(0)
  const controlChar = code >= 97 && code <= 122 ? String.fromCharCode(code - 96) : null

  if (key.ctrl === true && input.toLowerCase() === normalized) {
    return true
  }

  return controlChar ? input === controlChar : false
}
