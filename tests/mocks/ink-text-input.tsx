import type { FC } from 'react'

type Props = {
  value?: string
  onChange?: (value: string) => void
  onSubmit?: () => void
  focus?: boolean
  placeholder?: string
}

const InkTextInput: FC<Props> = ({ onChange, onSubmit }) => {
  if (onChange) {
    onChange('')
  }
  if (onSubmit) {
    onSubmit()
  }
  return null
}

export default InkTextInput
