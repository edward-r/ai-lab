import {
  INITIAL_TEST_RUNNER_STATE,
  testRunnerReducer,
} from '../tui/screens/test-runner/test-runner-reducer'

describe('testRunnerReducer', () => {
  it('updates the file path', () => {
    const next = testRunnerReducer(INITIAL_TEST_RUNNER_STATE, {
      type: 'set-file-path',
      next: 'other.yaml',
    })

    expect(next.filePath).toBe('other.yaml')
  })

  it('starts a run and clears transient state', () => {
    const seeded = {
      ...INITIAL_TEST_RUNNER_STATE,
      tests: [{ name: 'a', status: 'fail' as const, reason: 'nope' }],
      error: 'boom',
      summary: { passed: 1, failed: 2 },
    }

    const next = testRunnerReducer(seeded, { type: 'run-start' })

    expect(next.status).toBe('running')
    expect(next.tests).toEqual([])
    expect(next.error).toBeNull()
    expect(next.summary).toBeNull()
  })

  it('loads suite tests as pending', () => {
    const afterLoad = testRunnerReducer(INITIAL_TEST_RUNNER_STATE, {
      type: 'suite-loaded',
      loadedPath: '/tmp/prompt-tests.yaml',
      testNames: ['t1', 't2'],
    })

    expect(afterLoad.lastRunFile).toBe('/tmp/prompt-tests.yaml')
    expect(afterLoad.tests).toEqual([
      { name: 't1', status: 'pending', reason: null },
      { name: 't2', status: 'pending', reason: null },
    ])
  })

  it('updates a test status by ordinal', () => {
    const withSuite = testRunnerReducer(INITIAL_TEST_RUNNER_STATE, {
      type: 'suite-loaded',
      loadedPath: '/tmp/prompt-tests.yaml',
      testNames: ['t1', 't2'],
    })

    const running = testRunnerReducer(withSuite, { type: 'test-start', ordinal: 2, name: 't2' })
    expect(running.tests[1]).toEqual({ name: 't2', status: 'running', reason: null })

    const failed = testRunnerReducer(running, {
      type: 'test-complete',
      ordinal: 2,
      name: 't2',
      pass: false,
      reason: 'bad',
    })

    expect(failed.tests[1]).toEqual({ name: 't2', status: 'fail', reason: 'bad' })
  })

  it('completes run with summary and returns to idle', () => {
    const running = testRunnerReducer(INITIAL_TEST_RUNNER_STATE, { type: 'run-start' })
    const next = testRunnerReducer(running, { type: 'run-complete', passed: 3, failed: 1 })

    expect(next.status).toBe('idle')
    expect(next.summary).toEqual({ passed: 3, failed: 1 })
  })

  it('stores errors and returns to idle', () => {
    const running = testRunnerReducer(INITIAL_TEST_RUNNER_STATE, { type: 'run-start' })
    const next = testRunnerReducer(running, { type: 'run-error', message: 'boom' })

    expect(next.status).toBe('idle')
    expect(next.error).toBe('boom')
  })
})
