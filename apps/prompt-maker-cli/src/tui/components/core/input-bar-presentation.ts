export type InputBarMode = 'intent' | 'refinement'

type InputBarTone = 'default' | 'warning'

type InputBarLabelTone = 'muted' | 'warning'

export type InputBarPresentation = {
  borderTone: InputBarTone
  label: string
  labelTone: InputBarLabelTone
  labelBold: boolean
}

export const resolveInputBarPresentation = (mode: InputBarMode): InputBarPresentation => {
  if (mode === 'refinement') {
    return {
      borderTone: 'warning',
      label: 'Refinement (Enter to submit · empty to finish)',
      labelTone: 'warning',
      labelBold: true,
    }
  }

  return {
    borderTone: 'default',
    label: 'Intent / Command',
    labelTone: 'muted',
    labelBold: false,
  }
}
