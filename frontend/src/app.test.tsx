import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/preact'
import { App } from './app'
import * as state from './state'
import type { BridgeEvent } from './types'

// Mock backend module
type EventCallback = (event: BridgeEvent) => void
let registeredCallback: EventCallback | null = null
const mockUnsubscribe = vi.fn()

const mockBackend = {
  sendPrompt: vi.fn().mockResolvedValue(undefined),
  continuePrompt: vi.fn().mockResolvedValue(undefined),
  cancelPrompt: vi.fn().mockResolvedValue(undefined),
  listSessions: vi.fn().mockResolvedValue([]),
  onEvent: vi.fn((cb: EventCallback) => {
    registeredCallback = cb
    return mockUnsubscribe
  }),
}

vi.mock('./backend', () => ({
  createBackend: () => mockBackend,
}))

// Mock loadSessions to prevent SessionList useEffect from interfering
vi.spyOn(state, 'loadSessions').mockResolvedValue(undefined)

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    registeredCallback = null
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

    it('renders DOGMA title in header', () => {
      const { getByText } = render(<App />)
      const title = getByText('DOGMA')
      expect(title).toBeTruthy()
      expect(title.tagName).toBe('SPAN')
      expect(title.className).toContain('font-semibold')
      expect(title.className).toContain('tracking-wide')
    })

    it('header has justify-between for title and button layout', () => {
      const { getByText } = render(<App />)
      const title = getByText('DOGMA')
      const header = title.parentElement as HTMLElement
      expect(header.className).toContain('justify-between')
    })
  })

  describe('backend event listener', () => {
    it('registers onEvent callback on mount', () => {
      render(<App />)
      expect(mockBackend.onEvent).toHaveBeenCalledWith(expect.any(Function))
    })

    it('unsubscribes onEvent on unmount', () => {
      const { unmount } = render(<App />)
      unmount()
      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('non-result events are forwarded to handleBridgeEvent', () => {
      const spy = vi.spyOn(state, 'handleBridgeEvent')
      render(<App />)

      expect(registeredCallback).toBeDefined()
      const event: BridgeEvent = { type: 'assistant', text: 'hello' }
      registeredCallback!(event)
      expect(spy).toHaveBeenCalledWith(event)
    })

    it('result event without error sets loading=false', () => {
      render(<App />)
      state.setLoading(true)

      expect(registeredCallback).toBeDefined()
      registeredCallback!({ type: 'result', result: 'done' })
      expect(state.loading.value).toBe(false)
    })

    it('result event with is_error sets error and loading=false', () => {
      render(<App />)
      state.setLoading(true)

      expect(registeredCallback).toBeDefined()
      registeredCallback!({ type: 'result', result: 'something failed', is_error: true })
      expect(state.error.value).toBe('something failed')
      expect(state.loading.value).toBe(false)
    })

    it('result event with is_error and no result uses fallback message', () => {
      render(<App />)

      expect(registeredCallback).toBeDefined()
      registeredCallback!({ type: 'result', is_error: true })
      expect(state.error.value).toBe('Unknown error')
    })

    it('system event is forwarded to handleBridgeEvent', () => {
      const spy = vi.spyOn(state, 'handleBridgeEvent')
      render(<App />)

      expect(registeredCallback).toBeDefined()
      const event: BridgeEvent = { type: 'system', session_id: 'sess-1' }
      registeredCallback!(event)
      expect(spy).toHaveBeenCalledWith(event)
    })
  })

  describe('send handler', () => {
    it('calls backend.sendPrompt with text when send is triggered', async () => {
      const { getByPlaceholderText, getByRole } = render(<App />)
      const textarea = getByPlaceholderText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test prompt' } })

      const sendButton = getByRole('button', { name: /send/i })
      fireEvent.click(sendButton)

      expect(mockBackend.sendPrompt).toHaveBeenCalledWith('test prompt')
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

  describe('continue handler', () => {
    it('calls backend.continuePrompt with text when continue is triggered', () => {
      const { getByPlaceholderText, getByRole } = render(<App />)
      const textarea = getByPlaceholderText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'resume work' } })

      const continueButton = getByRole('button', { name: /continue session/i })
      fireEvent.click(continueButton)

      expect(mockBackend.continuePrompt).toHaveBeenCalledWith('resume work')
    })

    it('sets loading=true when continue is triggered', () => {
      const { getByPlaceholderText, getByRole } = render(<App />)
      const textarea = getByPlaceholderText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })

      const continueButton = getByRole('button', { name: /continue session/i })
      fireEvent.click(continueButton)

      expect(state.loading.value).toBe(true)
    })

    it('clears error when continue is triggered', () => {
      state.setError('previous error')
      const { getByPlaceholderText, getByRole } = render(<App />)
      const textarea = getByPlaceholderText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })

      const continueButton = getByRole('button', { name: /continue session/i })
      fireEvent.click(continueButton)

      expect(state.error.value).toBeNull()
    })
  })

  describe('cancel handler', () => {
    it('calls backend.cancelPrompt when cancel is triggered', () => {
      state.setLoading(true)
      const { getByRole } = render(<App />)

      const cancelButton = getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockBackend.cancelPrompt).toHaveBeenCalledTimes(1)
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

  describe('session panel', () => {
    it('sessions panel is not visible by default', () => {
      const { queryByTestId } = render(<App />)
      expect(queryByTestId('sessions-panel')).toBeNull()
    })

    it('toggle button shows sessions panel', () => {
      const { getByRole, queryByTestId } = render(<App />)
      const toggleBtn = getByRole('button', { name: /toggle sessions/i })
      fireEvent.click(toggleBtn)
      expect(queryByTestId('sessions-panel')).toBeTruthy()
    })

    it('toggle button hides sessions panel on second click', () => {
      const { getByRole, queryByTestId } = render(<App />)
      const toggleBtn = getByRole('button', { name: /toggle sessions/i })
      fireEvent.click(toggleBtn)
      expect(queryByTestId('sessions-panel')).toBeTruthy()
      fireEvent.click(toggleBtn)
      expect(queryByTestId('sessions-panel')).toBeNull()
    })

    it('SessionList receives current sessionId as selectedId', () => {
      state.sessionId.value = 'test-session-id'
      state.sessions.value = [{ id: 'test-session-id', summary: 'Test', first_message: '', timestamp: '2026-01-24T10:00:00Z', model: 'opus' }]
      const { getByRole, getByTestId } = render(<App />)
      const toggleBtn = getByRole('button', { name: /toggle sessions/i })
      fireEvent.click(toggleBtn)
      const sessionItem = getByTestId('session-item-test-session-id')
      expect(sessionItem.className).toContain('border-blue-500')
    })

    it('clicking a session item calls handleSelectSession', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      state.sessions.value = [{ id: 'click-session', summary: 'Click me', first_message: '', timestamp: '2026-01-24T10:00:00Z', model: 'opus' }]
      const { getByRole, getByTestId } = render(<App />)
      const toggleBtn = getByRole('button', { name: /toggle sessions/i })
      fireEvent.click(toggleBtn)
      fireEvent.click(getByTestId('session-item-click-session'))
      expect(consoleSpy).toHaveBeenCalledWith('Selected session:', 'click-session')
      consoleSpy.mockRestore()
    })

    it('passes backend.listSessions as listFn to SessionList', () => {
      const loadSessionsSpy = vi.spyOn(state, 'loadSessions').mockResolvedValue(undefined)
      const { getByRole } = render(<App />)
      const toggleBtn = getByRole('button', { name: /toggle sessions/i })
      fireEvent.click(toggleBtn)
      expect(loadSessionsSpy).toHaveBeenCalledWith(mockBackend.listSessions)
      loadSessionsSpy.mockRestore()
    })
  })
})
