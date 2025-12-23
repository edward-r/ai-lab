import { Box, Text } from 'ink'

import type { PastedSnippet } from '../../paste-snippet'
import { useTheme } from '../../theme/theme-provider'
import {
  inkBackgroundColorProps,
  inkBorderColorProps,
  inkColorProps,
} from '../../theme/theme-types'

export type PastedSnippetCardProps = {
  snippet: PastedSnippet
}

export const PastedSnippetCard = ({ snippet }: PastedSnippetCardProps) => {
  const { theme } = useTheme()

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      {...inkBorderColorProps(theme.border)}
      {...inkBackgroundColorProps(theme.popupBackground)}
    >
      <Text {...inkColorProps(theme.warning)}>{snippet.label}</Text>
      {snippet.previewLines.map((line, index) => (
        <Text key={`${index}-${line}`} {...inkColorProps(theme.mutedText)}>
          {line}
        </Text>
      ))}
      {snippet.lineCount > snippet.previewLines.length ? (
        <Text {...inkColorProps(theme.mutedText)}>…</Text>
      ) : null}
      <Text {...inkColorProps(theme.mutedText)}>Enter to submit · Esc to discard</Text>
    </Box>
  )
}
