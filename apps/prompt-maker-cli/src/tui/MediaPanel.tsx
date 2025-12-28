import React, { useEffect, useState } from 'react'
import { Box, Text, useInput } from 'ink'

import { SingleLineTextInput } from './components/core/SingleLineTextInput'
import { isBackspaceKey } from './components/core/text-input-keys'
import { useTheme } from './theme/theme-provider'
import { inkBackgroundColorProps, inkBorderColorProps, inkColorProps } from './theme/theme-types'
import { useContextDispatch, useContextState } from './context-store'

export type MediaPanelFocus = 'images' | 'videos' | 'none'

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

export const MediaPanel: React.FC<{ focus: MediaPanelFocus }> = ({ focus }) => {
  const { theme } = useTheme()
  const { images, videos } = useContextState()
  const { addImage, removeImage, addVideo, removeVideo } = useContextDispatch()

  const [imageDraft, setImageDraft] = useState('')
  const [videoDraft, setVideoDraft] = useState('')
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVideo, setSelectedVideo] = useState(0)

  useEffect(() => {
    setSelectedImage((prev) => Math.min(prev, Math.max(images.length - 1, 0)))
  }, [images.length])

  useEffect(() => {
    setSelectedVideo((prev) => Math.min(prev, Math.max(videos.length - 1, 0)))
  }, [videos.length])

  useInput((input, key) => {
    const imagesFocused = focus === 'images'
    const videosFocused = focus === 'videos'

    if (imagesFocused && images.length > 0) {
      if (key.upArrow) {
        setSelectedImage((prev) => Math.max(prev - 1, 0))
        return
      }
      if (key.downArrow) {
        setSelectedImage((prev) => Math.min(prev + 1, images.length - 1))
        return
      }
      if (key.delete || isBackspaceKey(input, key)) {
        removeImage(selectedImage)
        return
      }
    }

    if (videosFocused && videos.length > 0) {
      if (key.upArrow) {
        setSelectedVideo((prev) => Math.max(prev - 1, 0))
        return
      }
      if (key.downArrow) {
        setSelectedVideo((prev) => Math.min(prev + 1, videos.length - 1))
        return
      }
      if (key.delete || isBackspaceKey(input, key)) {
        removeVideo(selectedVideo)
        return
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
      <SectionHeader label="Images" focused={focus === 'images'} />
      <SingleLineTextInput
        value={imageDraft}
        onChange={setImageDraft}
        placeholder="assets/example.png"
        focus={focus === 'images'}
        backgroundColor={theme.panelBackground}
        onSubmit={() => {
          if (imageDraft.trim()) {
            addImage(imageDraft)
            setImageDraft('')
          }
        }}
      />
      <Box flexDirection="column" marginTop={1}>
        {images.length === 0 ? (
          <Text {...inkColorProps(theme.mutedText)}>No images attached</Text>
        ) : null}
        {images.map((value, index) => (
          <ListEntry
            key={`${value}-${index}`}
            label={value}
            highlighted={focus === 'images' && index === selectedImage}
            index={index}
          />
        ))}
        {images.length > 0 ? (
          <Text {...inkColorProps(theme.mutedText)}>Use ↑/↓ to select, Del to remove</Text>
        ) : null}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <SectionHeader label="Videos" focused={focus === 'videos'} />
        <SingleLineTextInput
          value={videoDraft}
          onChange={setVideoDraft}
          placeholder="assets/demo.mp4"
          focus={focus === 'videos'}
          backgroundColor={theme.panelBackground}
          onSubmit={() => {
            if (videoDraft.trim()) {
              addVideo(videoDraft)
              setVideoDraft('')
            }
          }}
        />
        <Box flexDirection="column" marginTop={1}>
          {videos.length === 0 ? (
            <Text {...inkColorProps(theme.mutedText)}>No videos attached</Text>
          ) : null}
          {videos.map((value, index) => (
            <ListEntry
              key={`${value}-${index}`}
              label={value}
              highlighted={focus === 'videos' && index === selectedVideo}
              index={index}
            />
          ))}
          {videos.length > 0 ? (
            <Text {...inkColorProps(theme.mutedText)}>Use ↑/↓ to select, Del to remove</Text>
          ) : null}
          {videos.length > 0 ? (
            <Text {...inkColorProps(theme.mutedText)}>
              Videos require Gemini models; switching happens automatically.
            </Text>
          ) : null}
        </Box>
      </Box>
    </Box>
  )
}
