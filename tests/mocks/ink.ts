import type { FC } from 'react'

type InkRenderResult = {
  waitUntilExit: () => Promise<void>
}

const NullComponent: FC<Record<string, unknown>> = () => null

export const Box = NullComponent
export const Text = NullComponent
export const Newline = NullComponent
export const Spacer = NullComponent
export const useInput = (): void => {}

export const render = (): InkRenderResult => ({
  waitUntilExit: async () => {},
})

export default {
  render,
  Box,
  Text,
  Newline,
  Spacer,
  useInput,
}
