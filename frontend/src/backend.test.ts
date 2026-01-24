import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { BridgeEvent, SessionInfo } from './types'

describe('backend adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    // Ensure window.go is not defined by default
    delete (window as Record<string, unknown>)['go']
  })

  afterEach(() => {
    delete (window as Record<string, unknown>)['go']
  })

  describe('isWailsEnvironment', () => {
    it('returns false when window.go is undefined', async () => {
      const { isWailsEnvironment } = await import('./backend')
      expect(isWailsEnvironment()).toBe(false)
    })

    it('returns true when window.go is defined', async () => {
      ;(window as Record<string, unknown>)['go'] = { main: { App: {} } }
      const { isWailsEnvironment } = await import('./backend')
      expect(isWailsEnvironment()).toBe(true)
    })
  })

  describe('createBackend', () => {
    it('returns MockBackend when not in Wails', async () => {
      const { createBackend } = await import('./backend')
      const { MockBackend } = await import('./backend.mock')
      const backend = createBackend()
      expect(backend).toBeInstanceOf(MockBackend)
    })

    it('returns WailsBackend when in Wails environment', async () => {
      ;(window as Record<string, unknown>)['go'] = {
        main: {
          App: {
            SendPrompt: vi.fn(),
            ContinuePrompt: vi.fn(),
            CancelPrompt: vi.fn(),
            ListSessions: vi.fn(),
          },
        },
      }
      const { createBackend, WailsBackend } = await import('./backend')
      const backend = createBackend()
      expect(backend).toBeInstanceOf(WailsBackend)
    })
  })

  describe('WailsBackend', () => {
    let mockApp: Record<string, ReturnType<typeof vi.fn>>

    beforeEach(() => {
      mockApp = {
        SendPrompt: vi.fn().mockResolvedValue(undefined),
        ContinuePrompt: vi.fn().mockResolvedValue(undefined),
        CancelPrompt: vi.fn().mockResolvedValue(undefined),
        ListSessions: vi.fn().mockResolvedValue([]),
      }
      ;(window as Record<string, unknown>)['go'] = { main: { App: mockApp } }
    })

    it('delegates sendPrompt to window.go.main.App.SendPrompt', async () => {
      const { WailsBackend } = await import('./backend')
      const backend = new WailsBackend()
      await backend.sendPrompt('hello')
      expect(mockApp.SendPrompt).toHaveBeenCalledWith('hello')
    })

    it('delegates continuePrompt to window.go.main.App.ContinuePrompt', async () => {
      const { WailsBackend } = await import('./backend')
      const backend = new WailsBackend()
      await backend.continuePrompt('resume')
      expect(mockApp.ContinuePrompt).toHaveBeenCalledWith('resume')
    })

    it('delegates cancelPrompt to window.go.main.App.CancelPrompt', async () => {
      const { WailsBackend } = await import('./backend')
      const backend = new WailsBackend()
      await backend.cancelPrompt()
      expect(mockApp.CancelPrompt).toHaveBeenCalled()
    })

    it('delegates listSessions to window.go.main.App.ListSessions', async () => {
      const sessions: SessionInfo[] = [
        { id: 's1', summary: 'test', first_message: 'hi', timestamp: '2026-01-24T10:00:00Z', model: 'opus' },
      ]
      mockApp.ListSessions.mockResolvedValue(sessions)
      const { WailsBackend } = await import('./backend')
      const backend = new WailsBackend()
      const result = await backend.listSessions()
      expect(result).toEqual(sessions)
    })

    it('onEvent registers callback and returns unsubscribe', async () => {
      // Mock EventsOn from wails runtime
      const mockEventsOn = vi.fn().mockReturnValue(() => {})
      vi.doMock('../wailsjs/runtime/runtime', () => ({
        EventsOn: mockEventsOn,
      }))

      const { WailsBackend } = await import('./backend')
      const backend = new WailsBackend()
      const cb = vi.fn()
      const unsub = backend.onEvent(cb)
      expect(typeof unsub).toBe('function')
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
      const calls = cb.mock.calls.map((c: [BridgeEvent]) => c[0])
      // Should have at least one assistant event and a result event
      expect(calls.some((e: BridgeEvent) => e.type === 'assistant')).toBe(true)
      expect(calls.some((e: BridgeEvent) => e.type === 'result')).toBe(true)
      vi.useRealTimers()
    })

    it('continuePrompt emits BridgeEvents via registered callback', async () => {
      vi.useFakeTimers()
      const { MockBackend } = await import('./backend.mock')
      const backend = new MockBackend()
      const cb = vi.fn()
      backend.onEvent(cb)
      backend.continuePrompt('continue text')

      await vi.runAllTimersAsync()

      expect(cb).toHaveBeenCalled()
      const calls = cb.mock.calls.map((c: [BridgeEvent]) => c[0])
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
      const calls = cb.mock.calls.map((c: [BridgeEvent]) => c[0])
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
