import { resolveInputBarPresentation } from '../tui/components/core/input-bar-presentation'

describe('InputBar presentation', () => {
  it('renders intent mode styling by default', () => {
    expect(resolveInputBarPresentation('intent')).toEqual({
      borderColor: 'cyan',
      label: 'Intent / Command',
      labelColor: 'gray',
      labelBold: false,
    })
  })

  it('renders refinement mode with prominent styling', () => {
    expect(resolveInputBarPresentation('refinement')).toEqual({
      borderColor: 'yellow',
      label: 'Refinement (Enter to submit · empty to finish)',
      labelColor: 'yellow',
      labelBold: true,
    })
  })
})
