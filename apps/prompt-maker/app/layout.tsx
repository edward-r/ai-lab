import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Prompt Maker',
  description: 'Craft high-signal prompts with scoring heuristics and improvement tools.',
}

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
)

export default RootLayout
