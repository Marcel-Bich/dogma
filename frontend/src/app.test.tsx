import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/preact'
import { App } from './app'
import * as state from './state'

// Mock Wails bindings
const mockSendPrompt = vi.fn().mockResolvedValue(undefined)
const mockCancelPrompt = vi.fn().mockResolvedValue(undefined)

vi.mock('../wailsjs/go/main/App', () => ({
  SendPrompt: (...args: unknown[]) => mockSendPrompt(...args),
  CancelPrompt: (...args: unknown[]) => mockCancelPrompt(...args),
}))

// Track registered listeners and their cleanup functions
type Listener = (...data: unknown[]) => void
const listeners: Map<string, Listener> = new Map()
const cleanupFns: Array<() => void> = []

const mockEventsOn = vi.fn((eventName: string, callback: Listener) => {
  listeners.set(eventName, callback)
  const unsub = () => { listeners.delete(eventName) }
  cleanupFns.push(unsub)
  return unsub
})

vi.mock('../wailsjs/runtime/runtime', () => ({
  EventsOn: (...args: unknown[]) => mockEventsOn(...(args as [string, Listener])),
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listeners.clear()
    cleanupFns.length = 0
    state.resetState()
    // jsdom does not implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders ChatInput component', () => {
      const { getByPlaceholderText } = render(<App />)
      expect(getByPlaceholderText('Enter your prompt...')).toBeTruthy()
    })

    it('renders MessageList component', () => {
      const { getByText } = render(<App />)
      expect(getByText('Send a prompt to start')).toBeTruthy()
    })

    it('has flex-col h-screen layout', () => {
      const { container } = render(<App />)
      const root = container.firstElementChild as HTMLElement
      expect(root.className).toContain('flex')
      expect(root.className).toContain('flex-col')
      expect(root.className).toContain('h-screen')
    })
  })

  describe('EventsOn listeners', () => {
    it('registers claude:event listener on mount', () => {
      render(<App />)
      expect(mockEventsOn).toHaveBeenCalledWith('claude:event', expect.any(Function))
    })

    it('registers claude:done listener on mount', () => {
      render(<App />)
      expect(mockEventsOn).toHaveBeenCalledWith('claude:done', expect.any(Function))
    })

    it('registers claude:error listener on mount', () => {
      render(<App />)
      expect(mockEventsOn).toHaveBeenCalledWith('claude:error', expect.any(Function))
    })

    it('claude:event listener calls handleBridgeEvent', () => {
      const spy = vi.spyOn(state, 'handleBridgeEvent')
      render(<App />)

      const eventCallback = listeners.get('claude:event')
      expect(eventCallback).toBeDefined()

      const bridgeEvent = { type: 'assistant', text: 'hello' }
      eventCallback!(bridgeEvent)
      expect(spy).toHaveBeenCalledWith(bridgeEvent)
    })

    it('claude:done listener sets loading=false', () => {
      render(<App />)
      state.setLoading(true)

      const doneCallback = listeners.get('claude:done')
      expect(doneCallback).toBeDefined()
      doneCallback!()

      expect(state.loading.value).toBe(false)
    })

    it('claude:error listener sets error and loading=false', () => {
      render(<App />)
      state.setLoading(true)

      const errorCallback = listeners.get('claude:error')
      expect(errorCallback).toBeDefined()
      errorCallback!('something went wrong')

      expect(state.error.value).toBe('something went wrong')
      expect(state.loading.value).toBe(false)
    })
  })

  describe('cleanup on unmount', () => {
    it('unsubscribes all EventsOn listeners on unmount', () => {
      const { unmount } = render(<App />)

      // All three listeners should be registered
      expect(listeners.size).toBe(3)

      unmount()

      // After unmount, cleanup should have been called
      expect(listeners.size).toBe(0)
    })
  })

  describe('send handler', () => {
    it('calls SendPrompt with text when send is triggered', async () => {
      const { getByPlaceholderText, getByRole } = render(<App />)
      const textarea = getByPlaceholderText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test prompt' } })

      const sendButton = getByRole('button', { name: /send/i })
      fireEvent.click(sendButton)

      expect(mockSendPrompt).toHaveBeenCalledWith('test prompt')
    })

    it('sets loading=true when send is triggered', () => {
      const { getByPlaceholderText, getByRole } = render(<App />)
      const textarea = getByPlaceholderText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })

      const sendButton = getByRole('button', { name: /send/i })
      fireEvent.click(sendButton)

      expect(state.loading.value).toBe(true)
    })

    it('clears error when send is triggered', () => {
      state.setError('previous error')
      const { getByPlaceholderText, getByRole } = render(<App />)
      const textarea = getByPlaceholderText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })

      const sendButton = getByRole('button', { name: /send/i })
      fireEvent.click(sendButton)

      expect(state.error.value).toBeNull()
    })
  })

  describe('cancel handler', () => {
    it('calls CancelPrompt when cancel is triggered', () => {
      state.setLoading(true)
      const { getByRole } = render(<App />)

      const cancelButton = getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockCancelPrompt).toHaveBeenCalledTimes(1)
    })
  })

  describe('error display', () => {
    it('renders error message when error state is set', () => {
      state.setError('connection failed')
      const { getByText } = render(<App />)
      expect(getByText('connection failed')).toBeTruthy()
    })

    it('does not render error when error state is null', () => {
      const { queryByTestId } = render(<App />)
      expect(queryByTestId('error-message')).toBeNull()
    })
  })
})
