import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isWailsEnvironment,
  createBackend,
  WailsBackend,
} from './backend'
import { MockBackend } from './backend.mock'
import type { BridgeEvent, SessionInfo } from './types'

// Top-level mock for wails runtime
type Listener = (...data: unknown[]) => void
const registeredListeners: Map<string, Listener> = new Map()
const unsubFns: Array<ReturnType<typeof vi.fn>> = []
const mockEventsOn = vi.fn((eventName: string, callback: Listener) => {
  registeredListeners.set(eventName, callback)
  const unsub = vi.fn(() => { registeredListeners.delete(eventName) })
  unsubFns.push(unsub)
  return unsub
})

vi.mock('../wailsjs/runtime/runtime', () => ({
  EventsOn: (...args: unknown[]) => mockEventsOn(...(args as [string, Listener])),
}))

describe('backend adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    registeredListeners.clear()
    unsubFns.length = 0
    // Ensure window.go is not defined by default
    delete (window as unknown as Record<string, unknown>)['go']
  })

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>)['go']
  })

  describe('isWailsEnvironment', () => {
    it('returns false when window.go is undefined', () => {
      expect(isWailsEnvironment()).toBe(false)
    })

    it('returns true when window.go is defined', () => {
      ;(window as unknown as Record<string, unknown>)['go'] = { main: { App: {} } }
      expect(isWailsEnvironment()).toBe(true)
    })
  })

  describe('createBackend', () => {
    it('returns MockBackend when not in Wails', () => {
      const backend = createBackend()
      expect(backend).toBeInstanceOf(MockBackend)
    })

    it('returns WailsBackend when in Wails environment', () => {
      ;(window as unknown as Record<string, unknown>)['go'] = {
        main: {
          App: {
            SendPrompt: vi.fn(),
            SendPromptWithSession: vi.fn(),
            CancelPrompt: vi.fn(),
            ListSessions: vi.fn(),
          },
        },
      }
      const backend = createBackend()
      expect(backend).toBeInstanceOf(WailsBackend)
    })
  })

  describe('WailsBackend', () => {
    let mockApp: Record<string, ReturnType<typeof vi.fn>>

    beforeEach(() => {
      mockApp = {
        SendPrompt: vi.fn().mockResolvedValue(undefined),
        SendPromptWithSession: vi.fn().mockResolvedValue(undefined),
        CancelPrompt: vi.fn().mockResolvedValue(undefined),
        ListSessions: vi.fn().mockResolvedValue([]),
      }
      ;(window as unknown as Record<string, unknown>)['go'] = { main: { App: mockApp } }
    })

    it('delegates sendPrompt to window.go.main.App.SendPrompt', async () => {
      const backend = new WailsBackend()
      await backend.sendPrompt('hello')
      expect(mockApp.SendPrompt).toHaveBeenCalledWith('hello')
    })

    it('delegates sendPromptWithSession to window.go.main.App.SendPromptWithSession', async () => {
      const backend = new WailsBackend()
      await backend.sendPromptWithSession('resume', 'session-123')
      expect(mockApp.SendPromptWithSession).toHaveBeenCalledWith('resume', 'session-123')
    })

    it('delegates cancelPrompt to window.go.main.App.CancelPrompt', async () => {
      const backend = new WailsBackend()
      await backend.cancelPrompt()
      expect(mockApp.CancelPrompt).toHaveBeenCalled()
    })

    it('delegates listSessions to window.go.main.App.ListSessions', async () => {
      const sessions: SessionInfo[] = [
        { id: 's1', summary: 'test', first_message: 'hi', timestamp: '2026-01-24T10:00:00Z', model: 'opus' },
      ]
      mockApp.ListSessions.mockResolvedValue(sessions)
      const backend = new WailsBackend()
      const result = await backend.listSessions()
      expect(result).toEqual(sessions)
    })

    it('onEvent registers listeners for claude:event, claude:done, claude:error', () => {
      const backend = new WailsBackend()
      const cb = vi.fn()
      backend.onEvent(cb)
      expect(mockEventsOn).toHaveBeenCalledWith('claude:event', expect.any(Function))
      expect(mockEventsOn).toHaveBeenCalledWith('claude:done', expect.any(Function))
      expect(mockEventsOn).toHaveBeenCalledWith('claude:error', expect.any(Function))
    })

    it('onEvent forwards claude:event to callback', () => {
      const backend = new WailsBackend()
      const cb = vi.fn()
      backend.onEvent(cb)

      const eventListener = registeredListeners.get('claude:event')
      expect(eventListener).toBeDefined()
      const event: BridgeEvent = { type: 'assistant', text: 'hello' }
      eventListener!(event)
      expect(cb).toHaveBeenCalledWith(event)
    })

    it('onEvent forwards claude:done as result event', () => {
      const backend = new WailsBackend()
      const cb = vi.fn()
      backend.onEvent(cb)

      const doneListener = registeredListeners.get('claude:done')
      expect(doneListener).toBeDefined()
      doneListener!()
      expect(cb).toHaveBeenCalledWith({ type: 'result', result: 'done' })
    })

    it('onEvent forwards claude:error as error result event', () => {
      const backend = new WailsBackend()
      const cb = vi.fn()
      backend.onEvent(cb)

      const errorListener = registeredListeners.get('claude:error')
      expect(errorListener).toBeDefined()
      errorListener!('connection lost')
      expect(cb).toHaveBeenCalledWith({ type: 'result', result: 'connection lost', is_error: true })
    })

    it('onEvent returns unsubscribe that calls all unsub functions', () => {
      const backend = new WailsBackend()
      const cb = vi.fn()
      const unsub = backend.onEvent(cb)

      expect(typeof unsub).toBe('function')
      unsub()
      // Each internal EventsOn unsub should have been called
      for (const fn of unsubFns) {
        expect(fn).toHaveBeenCalled()
      }
    })
  })

  describe('MockBackend', () => {
    it('listSessions returns 3 sessions with all fields populated', async () => {
      const { MockBackend } = await import('./backend.mock')
      const backend = new MockBackend()
      const sessions = await backend.listSessions()
      expect(sessions).toHaveLength(3)
      for (const session of sessions) {
        expect(session.id).toBeTruthy()
        expect(session.summary).toBeTruthy()
        expect(session.first_message).toBeTruthy()
        expect(session.timestamp).toBeTruthy()
        expect(session.model).toBeTruthy()
      }
    })

    it('sendPrompt emits BridgeEvents via registered callback', async () => {
      vi.useFakeTimers()
      const { MockBackend } = await import('./backend.mock')
      const backend = new MockBackend()
      const cb = vi.fn()
      backend.onEvent(cb)
      backend.sendPrompt('test prompt')

      // Advance timers to trigger all mock events
      await vi.runAllTimersAsync()

      expect(cb).toHaveBeenCalled()
      const calls = cb.mock.calls.map((c: unknown[]) => c[0] as BridgeEvent)
      // Should have at least one assistant event and a result event
      expect(calls.some((e: BridgeEvent) => e.type === 'assistant')).toBe(true)
      expect(calls.some((e: BridgeEvent) => e.type === 'result')).toBe(true)
      vi.useRealTimers()
    })

    it('sendPromptWithSession emits BridgeEvents via registered callback', async () => {
      vi.useFakeTimers()
      const { MockBackend } = await import('./backend.mock')
      const backend = new MockBackend()
      const cb = vi.fn()
      backend.onEvent(cb)
      backend.sendPromptWithSession('continue text', 'session-123')

      await vi.runAllTimersAsync()

      expect(cb).toHaveBeenCalled()
      const calls = cb.mock.calls.map((c: unknown[]) => c[0] as BridgeEvent)
      expect(calls.some((e: BridgeEvent) => e.type === 'assistant')).toBe(true)
      expect(calls.some((e: BridgeEvent) => e.type === 'result')).toBe(true)
      vi.useRealTimers()
    })

    it('cancelPrompt emits done event', async () => {
      vi.useFakeTimers()
      const { MockBackend } = await import('./backend.mock')
      const backend = new MockBackend()
      const cb = vi.fn()
      backend.onEvent(cb)
      backend.cancelPrompt()

      await vi.runAllTimersAsync()

      expect(cb).toHaveBeenCalled()
      const calls = cb.mock.calls.map((c: unknown[]) => c[0] as BridgeEvent)
      expect(calls.some((e: BridgeEvent) => e.type === 'result')).toBe(true)
      vi.useRealTimers()
    })

    it('onEvent returns working unsubscribe function', async () => {
      const { MockBackend } = await import('./backend.mock')
      const backend = new MockBackend()
      const cb = vi.fn()
      const unsub = backend.onEvent(cb)
      expect(typeof unsub).toBe('function')
      unsub()
    })

    it('unsubscribe prevents further callbacks', async () => {
      vi.useFakeTimers()
      const { MockBackend } = await import('./backend.mock')
      const backend = new MockBackend()
      const cb = vi.fn()
      const unsub = backend.onEvent(cb)
      unsub()

      backend.sendPrompt('test')
      await vi.runAllTimersAsync()

      expect(cb).not.toHaveBeenCalled()
      vi.useRealTimers()
    })

    it('supports multiple subscribers', async () => {
      vi.useFakeTimers()
      const { MockBackend } = await import('./backend.mock')
      const backend = new MockBackend()
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      backend.onEvent(cb1)
      backend.onEvent(cb2)

      backend.sendPrompt('test')
      await vi.runAllTimersAsync()

      expect(cb1).toHaveBeenCalled()
      expect(cb2).toHaveBeenCalled()
      vi.useRealTimers()
    })

    it('unsubscribing one does not affect other subscribers', async () => {
      vi.useFakeTimers()
      const { MockBackend } = await import('./backend.mock')
      const backend = new MockBackend()
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      const unsub1 = backend.onEvent(cb1)
      backend.onEvent(cb2)
      unsub1()

      backend.sendPrompt('test')
      await vi.runAllTimersAsync()

      expect(cb1).not.toHaveBeenCalled()
      expect(cb2).toHaveBeenCalled()
      vi.useRealTimers()
    })
  })
})
