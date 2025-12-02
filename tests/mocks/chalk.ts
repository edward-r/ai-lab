interface ChalkPalette {
  [key: string]: ChalkFn
}

type ChalkFn = ((value?: unknown) => string) & ChalkPalette

const toStringValue = (value?: unknown): string => {
  if (typeof value === 'string') {
    return value
  }
  if (value === undefined || value === null) {
    return ''
  }
  return String(value)
}

const createStyle = (): ChalkFn => {
  const style = ((value?: unknown) => toStringValue(value)) as ChalkFn
  return style
}

const attach = (target: ChalkFn, name: string): ChalkFn => {
  const style = createStyle()
  target[name] = style
  return style
}

const chalkMock = createStyle()

const rootStyles = ['dim', 'gray', 'white', 'green', 'magenta', 'cyan', 'yellow']
rootStyles.forEach((style) => {
  attach(chalkMock, style)
})

const bold = attach(chalkMock, 'bold')
;['green', 'magenta', 'cyan'].forEach((style) => {
  attach(bold, style)
})

export default chalkMock
