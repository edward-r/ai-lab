import { resolveImageParts } from '../image-loader'

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}))

const fs = jest.requireMock('node:fs/promises') as { readFile: jest.Mock }

describe('image-loader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('skips unsupported extensions with a warning', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const parts = await resolveImageParts(['doc.txt'])
    expect(parts).toEqual([])
    expect(warn).toHaveBeenCalledWith('Skipping unsupported image type: doc.txt')
    warn.mockRestore()
  })

  it('returns base64 encoded part for supported image', async () => {
    const buffer = Buffer.from('image-bytes')
    fs.readFile.mockResolvedValue(buffer)
    const onUpload = jest.fn()
    const parts = await resolveImageParts(['photo.png'], onUpload)
    expect(onUpload).toHaveBeenNthCalledWith(1, 'start', { kind: 'image', filePath: 'photo.png' })
    expect(onUpload).toHaveBeenLastCalledWith('finish', { kind: 'image', filePath: 'photo.png' })
    expect(parts).toEqual([
      {
        type: 'image',
        mimeType: 'image/png',
        data: buffer.toString('base64'),
      },
    ])
  })

  it('skips images larger than limit', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const buffer = Buffer.alloc(25 * 1024 * 1024)
    fs.readFile.mockResolvedValue(buffer)
    const parts = await resolveImageParts(['large.jpg'])
    expect(parts).toEqual([])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Skipping image too large'))
    warn.mockRestore()
  })

  it('logs and skips unreadable files', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    fs.readFile.mockRejectedValue(new Error('nope'))
    const parts = await resolveImageParts(['broken.png'])
    expect(parts).toEqual([])
    expect(warn).toHaveBeenCalledWith('Failed to read image broken.png:', expect.any(Error))
    warn.mockRestore()
  })
})
