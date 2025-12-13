import React from 'react'
import { Box, Text } from 'ink'

import type { PastedSnippet } from '../../paste-snippet'

export type PastedSnippetCardProps = {
  snippet: PastedSnippet
}

export const PastedSnippetCard: React.FC<PastedSnippetCardProps> = ({ snippet }) => (
  <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1} paddingY={0}>
    <Text color="yellow">{snippet.label}</Text>
    {snippet.previewLines.map((line, index) => (
      <Text key={`${index}-${line}`} color="gray">
        {line}
      </Text>
    ))}
    {snippet.lineCount > snippet.previewLines.length ? <Text color="gray">…</Text> : null}
    <Text color="gray">Enter to submit · Esc to discard</Text>
  </Box>
)
