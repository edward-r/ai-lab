import {
  getLastSessionModel,
  getRecentSessionModels,
  recordRecentSessionModel,
  resetLastSessionModelForTests,
  resetRecentSessionModelsForTests,
  setLastSessionModel,
} from '../tui/model-session'

describe('model-session helpers', () => {
  afterEach(() => {
    resetLastSessionModelForTests()
  })

  it('stores and retrieves the last session model id', () => {
    resetLastSessionModelForTests()
    expect(getLastSessionModel()).toBeNull()
    setLastSessionModel('gpt-4o-mini')
    expect(getLastSessionModel()).toBe('gpt-4o-mini')
  })

  it('clears the session value when set to empty', () => {
    setLastSessionModel('   ')
    expect(getLastSessionModel()).toBeNull()
  })
})

describe('model-session recent models', () => {
  beforeEach(() => {
    resetRecentSessionModelsForTests()
  })

  it('records recent models most-recent first', () => {
    recordRecentSessionModel('gpt-4o-mini')
    recordRecentSessionModel('gemini-1.5-pro')

    expect(getRecentSessionModels()).toEqual(['gemini-1.5-pro', 'gpt-4o-mini'])
  })

  it('deduplicates when recording the same model', () => {
    recordRecentSessionModel('gpt-4o-mini')
    recordRecentSessionModel('gemini-1.5-pro')
    recordRecentSessionModel('gpt-4o-mini')

    expect(getRecentSessionModels()).toEqual(['gpt-4o-mini', 'gemini-1.5-pro'])
  })

  it('caps the list length', () => {
    recordRecentSessionModel('a')
    recordRecentSessionModel('b')
    recordRecentSessionModel('c')
    recordRecentSessionModel('d')
    recordRecentSessionModel('e')
    recordRecentSessionModel('f')

    expect(getRecentSessionModels()).toEqual(['f', 'e', 'd', 'c', 'b'])
  })
})
