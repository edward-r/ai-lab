import fs from 'node:fs/promises'
import path from 'node:path'

import { type ImagePart } from '@prompt-maker/core'

const MAX_IMAGE_SIZE_MB = 20
const SUPPORTED_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

export const resolveImageParts = async (
  filePaths: string[],
  onUploadStateChange?: (
    state: 'start' | 'finish',
    detail: { kind: 'image'; filePath: string },
  ) => void,
): Promise<ImagePart[]> => {
  const parts: ImagePart[] = []

  for (const filePath of filePaths) {
    const ext = path.extname(filePath).toLowerCase()
    if (!SUPPORTED_EXTS.includes(ext)) {
      console.warn(`Skipping unsupported image type: ${filePath}`)
      continue
    }

    onUploadStateChange?.('start', { kind: 'image', filePath })
    try {
      const buffer = await fs.readFile(filePath)
      const sizeMb = buffer.length / (1024 * 1024)
      if (sizeMb > MAX_IMAGE_SIZE_MB) {
        console.warn(`Skipping image too large (${sizeMb.toFixed(1)}MB): ${filePath}`)
        continue
      }

      const mimeType =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.gif'
              ? 'image/gif'
              : 'image/jpeg'

      parts.push({
        type: 'image',
        mimeType,
        data: buffer.toString('base64'),
      })
    } catch (error) {
      console.warn(`Failed to read image ${filePath}:`, error)
    } finally {
      onUploadStateChange?.('finish', { kind: 'image', filePath })
    }
  }

  return parts
}
