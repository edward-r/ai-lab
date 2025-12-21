export type InputBarMode = 'intent' | 'refinement'

export type InputBarPresentation = {
  borderColor: 'cyan' | 'yellow'
  label: string
  labelColor: 'gray' | 'yellow'
  labelBold: boolean
}

export const resolveInputBarPresentation = (mode: InputBarMode): InputBarPresentation => {
  if (mode === 'refinement') {
    return {
      borderColor: 'yellow',
      label: 'Refinement (Enter to submit · empty to finish)',
      labelColor: 'yellow',
      labelBold: true,
    }
  }

  return {
    borderColor: 'cyan',
    label: 'Intent / Command',
    labelColor: 'gray',
    labelBold: false,
  }
}
