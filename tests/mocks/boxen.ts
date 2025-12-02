type BoxenOptions = {
  borderColor?: string
  borderStyle?: string
  padding?: number | { top?: number; bottom?: number; left?: number; right?: number }
  title?: string
  titleAlignment?: 'left' | 'center' | 'right'
}

const boxen = (content: string, _options?: BoxenOptions): string => content

export default boxen
