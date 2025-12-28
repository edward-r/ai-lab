import React, { useEffect, useState } from 'react'
import { Box, Text, useInput } from 'ink'

import { SingleLineTextInput } from './components/core/SingleLineTextInput'
import { isBackspaceKey } from './components/core/text-input-keys'
import { useTheme } from './theme/theme-provider'
import { inkBackgroundColorProps, inkBorderColorProps, inkColorProps } from './theme/theme-types'
import { useContextDispatch, useContextState } from './context-store'

export type ContextPanelFocus = 'files' | 'urls' | 'smart' | 'none'

type SectionHeaderProps = {
  label: string
  focused: boolean
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ label, focused }) => {
  const { theme } = useTheme()
  return focused ? <Text {...inkColorProps(theme.accent)}>{label}</Text> : <Text>{label}</Text>
}

type ListEntryProps = {
  label: string
  highlighted: boolean
  index: number
}

const ListEntry: React.FC<ListEntryProps> = ({ label, highlighted, index }) => {
  const { theme } = useTheme()

  return highlighted ? (
    <Text {...inkColorProps(theme.warning)}>
      {index + 1}. {label}
    </Text>
  ) : (
    <Text>
      {index + 1}. {label}
    </Text>
  )
}

export const ContextPanel: React.FC<{ focus: ContextPanelFocus }> = ({ focus }) => {
  const { theme } = useTheme()
  const { files, urls, smartContextEnabled, smartContextRoot } = useContextState()
  const { addFile, removeFile, addUrl, removeUrl, toggleSmartContext, setSmartRoot } =
    useContextDispatch()

  const [fileDraft, setFileDraft] = useState('')
  const [urlDraft, setUrlDraft] = useState('')
  const [smartRootDraft, setSmartRootDraft] = useState(smartContextRoot ?? '')
  const [selectedFile, setSelectedFile] = useState(0)
  const [selectedUrl, setSelectedUrl] = useState(0)

  useEffect(() => {
    setSmartRootDraft(smartContextRoot ?? '')
  }, [smartContextRoot])

  useEffect(() => {
    setSelectedFile((prev) => Math.min(prev, Math.max(files.length - 1, 0)))
  }, [files.length])

  useEffect(() => {
    setSelectedUrl((prev) => Math.min(prev, Math.max(urls.length - 1, 0)))
  }, [urls.length])

  useInput((input, key) => {
    const filesFocused = focus === 'files'
    const urlsFocused = focus === 'urls'
    const smartFocused = focus === 'smart'

    if (filesFocused && files.length > 0) {
      if (key.upArrow) {
        setSelectedFile((prev) => Math.max(prev - 1, 0))
        return
      }
      if (key.downArrow) {
        setSelectedFile((prev) => Math.min(prev + 1, files.length - 1))
        return
      }
      if (key.delete || isBackspaceKey(input, key)) {
        removeFile(selectedFile)
        return
      }
    }

    if (urlsFocused && urls.length > 0) {
      if (key.upArrow) {
        setSelectedUrl((prev) => Math.max(prev - 1, 0))
        return
      }
      if (key.downArrow) {
        setSelectedUrl((prev) => Math.min(prev + 1, urls.length - 1))
        return
      }
      if (key.delete || isBackspaceKey(input, key)) {
        removeUrl(selectedUrl)
        return
      }
    }

    if (smartFocused) {
      const lower = input.toLowerCase()
      if (lower === 's') {
        toggleSmartContext()
        return
      }
      if (lower === 'r' || key.return) {
        setSmartRoot(smartRootDraft)
      }
    }
  })

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      {...inkBorderColorProps(theme.border)}
      {...inkBackgroundColorProps(theme.panelBackground)}
    >
      <SectionHeader label="File Context" focused={focus === 'files'} />
      <SingleLineTextInput
        value={fileDraft}
        onChange={setFileDraft}
        placeholder="src/**/*.ts"
        focus={focus === 'files'}
        backgroundColor={theme.panelBackground}
        onSubmit={() => {
          if (fileDraft.trim()) {
            addFile(fileDraft)
            setFileDraft('')
          }
        }}
      />
      <Box flexDirection="column" marginTop={1}>
        {files.length === 0 ? (
          <Text {...inkColorProps(theme.mutedText)}>No file globs added</Text>
        ) : null}
        {files.map((value, index) => (
          <ListEntry
            key={`${value}-${index}`}
            label={value}
            highlighted={focus === 'files' && index === selectedFile}
            index={index}
          />
        ))}
        {files.length > 0 ? (
          <Text {...inkColorProps(theme.mutedText)}>Use ↑/↓ to select, Del to remove</Text>
        ) : null}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <SectionHeader label="URLs" focused={focus === 'urls'} />
        <SingleLineTextInput
          value={urlDraft}
          onChange={setUrlDraft}
          placeholder="https://github.com/..."
          focus={focus === 'urls'}
          backgroundColor={theme.panelBackground}
          onSubmit={() => {
            if (urlDraft.trim()) {
              addUrl(urlDraft)
              setUrlDraft('')
            }
          }}
        />
        <Box flexDirection="column" marginTop={1}>
          {urls.length === 0 ? (
            <Text {...inkColorProps(theme.mutedText)}>No URLs added</Text>
          ) : null}
          {urls.map((value, index) => (
            <ListEntry
              key={`${value}-${index}`}
              label={value}
              highlighted={focus === 'urls' && index === selectedUrl}
              index={index}
            />
          ))}
          {urls.length > 0 ? (
            <Text {...inkColorProps(theme.mutedText)}>Use ↑/↓ to select, Del to remove</Text>
          ) : null}
        </Box>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <SectionHeader label="Smart Context" focused={focus === 'smart'} />
        <Text>Status: {smartContextEnabled ? 'enabled' : 'disabled'} (press "s" to toggle)</Text>
        <Text>Root override (Enter to apply):</Text>
        <SingleLineTextInput
          value={smartRootDraft}
          onChange={setSmartRootDraft}
          focus={focus === 'smart'}
          backgroundColor={theme.panelBackground}
          onSubmit={() => setSmartRoot(smartRootDraft)}
        />
        {smartContextRoot ? (
          <Text {...inkColorProps(theme.mutedText)}>Current root: {smartContextRoot}</Text>
        ) : null}
      </Box>
    </Box>
  )
}
