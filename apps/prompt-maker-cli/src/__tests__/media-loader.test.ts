import { uploadFileForGemini, inferVideoMimeType } from '../media-loader'

jest.mock('node:fs/promises', () => ({
  access: jest.fn(),
}))
jest.mock('@google/generative-ai/server', () => {
  const manager = {
    uploadFile: jest.fn(),
    getFile: jest.fn(),
  }
  return {
    GoogleAIFileManager: jest.fn().mockImplementation(() => manager),
    __managerMock: manager,
  }
})

const fs = jest.requireMock('node:fs/promises') as { access: jest.Mock }
const googleModule = jest.requireMock('@google/generative-ai/server') as {
  GoogleAIFileManager: jest.Mock
  __managerMock: { uploadFile: jest.Mock; getFile: jest.Mock }
}
const manager = googleModule.__managerMock

describe('media-loader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    googleModule.GoogleAIFileManager.mockImplementation(() => manager)
    process.env.GEMINI_API_KEY = 'gem-key'
    manager.uploadFile.mockReset()
    manager.getFile.mockReset()
    manager.uploadFile.mockResolvedValue({ file: { name: 'files/123' } })
    manager.getFile.mockResolvedValue({ state: 'ACTIVE', uri: 'gs://files/123' })
    fs.access.mockResolvedValue(undefined)
  })

  it('infers known video mime types', () => {
    expect(inferVideoMimeType('clip.mp4')).toBe('video/mp4')
    expect(() => inferVideoMimeType('clip.txt')).toThrow('Unsupported media type')
  })

  it('uploads file and waits for active state', async () => {
    const uri = await uploadFileForGemini('clip.mp4')
    expect(googleModule.GoogleAIFileManager).toHaveBeenCalledWith('gem-key')
    expect(manager.uploadFile).toHaveBeenCalledWith('clip.mp4', {
      mimeType: 'video/mp4',
      displayName: 'clip.mp4',
    })
    expect(uri).toBe('gs://files/123')
  })

  it('throws when file is not readable', async () => {
    fs.access.mockRejectedValue(new Error('denied'))
    await expect(uploadFileForGemini('missing.mp4')).rejects.toThrow('is not readable')
  })

  it('throws when Gemini reports failure', async () => {
    manager.getFile.mockResolvedValueOnce({ state: 'FAILED', error: { message: 'bad' } })
    await expect(uploadFileForGemini('clip.mp4')).rejects.toThrow('bad')
  })

  it('requires GEMINI_API_KEY to be present', async () => {
    process.env.GEMINI_API_KEY = ''
    await expect(uploadFileForGemini('clip.mp4')).rejects.toThrow('GEMINI_API_KEY')
  })
})
