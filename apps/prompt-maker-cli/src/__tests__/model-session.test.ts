import {
  getLastSessionModel,
  resetLastSessionModelForTests,
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
