import { render } from 'ink'

import { App } from './App'
import type { PromptMakerTuiOptions } from './launch'

export { prepareTuiLaunch } from './launch'

export const runPromptMakerTui = async (options: PromptMakerTuiOptions = {}): Promise<void> => {
  const app = render(<App initialIntent={options.initialIntent ?? ''} />)
  await app.waitUntilExit()
}
