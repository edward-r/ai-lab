type Spinner = {
  text: string
  succeed: (message?: string) => void
  fail: (message?: string) => void
  stop: () => void
}

type OraOptions = {
  text?: string
  color?: string
  spinner?: string
}

const createSpinner = (text: string): Spinner => {
  let currentText = text
  return {
    get text() {
      return currentText
    },
    set text(value: string) {
      currentText = value
    },
    succeed: () => undefined,
    fail: () => undefined,
    stop: () => undefined,
  }
}

const ora = (options?: OraOptions) => {
  const spinner = createSpinner(options?.text ?? '')
  return {
    start: () => spinner,
  }
}

export default ora
