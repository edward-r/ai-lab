import { EventEmitter } from 'node:events'

import { readFromStdin } from '../io'

describe('readFromStdin', () => {
  const originalStdin = process.stdin

  afterEach(() => {
    Object.defineProperty(process, 'stdin', { value: originalStdin, configurable: true })
  })

  it('returns null when stdin is a TTY', async () => {
    Object.defineProperty(process, 'stdin', {
      value: { isTTY: true } as NodeJS.ReadStream,
      configurable: true,
    })
    await expect(readFromStdin()).resolves.toBeNull()
  })

  it('collects data chunks when stdin is piped', async () => {
    class MockStdin extends EventEmitter {
      isTTY = false
      on(event: string, listener: (...args: unknown[]) => void): this {
        super.on(event, listener)
        return this
      }
    }
    const mock = new MockStdin()
    Object.defineProperty(process, 'stdin', { value: mock, configurable: true })

    const promise = readFromStdin()
    mock.emit('data', 'hello ')
    mock.emit('data', Buffer.from('world'))
    mock.emit('end')
    await expect(promise).resolves.toBe('hello world')
  })

  it('rejects when stdin emits an error', async () => {
    class MockStdin extends EventEmitter {
      isTTY = false
      on(event: string, listener: (...args: unknown[]) => void): this {
        super.on(event, listener)
        return this
      }
    }
    const mock = new MockStdin()
    Object.defineProperty(process, 'stdin', { value: mock, configurable: true })

    const promise = readFromStdin()
    mock.emit('error', new Error('boom'))
    await expect(promise).rejects.toThrow('boom')
  })
})
