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
      const { getByLabelText } = render(<App />)
      expect(getByLabelText('Enter your prompt...')).toBeTruthy()
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
      const { getByTestId } = render(<App />)
      const title = getByTestId('app-title')
      expect(title).toBeTruthy()
      expect(title.textContent).toBe('DOGMA')
      expect(title.tagName).toBe('SPAN')
      const brandingSpan = title.parentElement as HTMLElement
      expect(brandingSpan.className).toContain('font-semibold')
      expect(brandingSpan.className).toContain('tracking-wide')
    })

    it('header has justify-between for title and button layout', () => {
      const { getByTestId } = render(<App />)
      const title = getByTestId('app-title')
      const header = title.parentElement!.parentElement as HTMLElement
      expect(header.className).toContain('justify-between')
    })

    it('header has shadow and gradient for visual depth', () => {
      const { getByTestId } = render(<App />)
      const title = getByTestId('app-title')
      const header = title.parentElement!.parentElement as HTMLElement
      expect(header.className).toContain('shadow-md')
      expect(header.className).toContain('bg-gradient-to-b')
      expect(header.className).toContain('z-10')
    })

    it('sessions button highlights on hover', () => {
      const { getByRole } = render(<App />)
      const btn = getByRole('button', { name: /toggle sessions/i })
      fireEvent.mouseEnter(btn)
      expect(btn.style.color).toBe('rgb(34, 211, 238)')
      fireEvent.mouseLeave(btn)
      expect(btn.style.color).toBe('rgb(102, 102, 102)')
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
      const { getByLabelText, getByRole } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test prompt' } })

      const sendButton = getByRole('button', { name: /send/i })
      fireEvent.click(sendButton)

      expect(mockBackend.sendPrompt).toHaveBeenCalledWith('test prompt')
    })

    it('sets loading=true when send is triggered', () => {
      const { getByLabelText, getByRole } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })

      const sendButton = getByRole('button', { name: /send/i })
      fireEvent.click(sendButton)

      expect(state.loading.value).toBe(true)
    })

    it('clears error when send is triggered', () => {
      state.setError('previous error')
      const { getByLabelText, getByRole } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })

      const sendButton = getByRole('button', { name: /send/i })
      fireEvent.click(sendButton)

      expect(state.error.value).toBeNull()
    })
  })

  describe('continue handler', () => {
    it('calls backend.continuePrompt with text when continue is triggered', () => {
      const { getByLabelText, getByRole } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'resume work' } })

      const continueButton = getByRole('button', { name: /continue session/i })
      fireEvent.click(continueButton)

      expect(mockBackend.continuePrompt).toHaveBeenCalledWith('resume work')
    })

    it('sets loading=true when continue is triggered', () => {
      const { getByLabelText, getByRole } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })

      const continueButton = getByRole('button', { name: /continue session/i })
      fireEvent.click(continueButton)

      expect(state.loading.value).toBe(true)
    })

    it('clears error when continue is triggered', () => {
      state.setError('previous error')
      const { getByLabelText, getByRole } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
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
    it('sessions panel is collapsed by default', () => {
      const { getByTestId } = render(<App />)
      const panel = getByTestId('sessions-panel')
      expect(panel.className).toContain('w-0')
      expect(panel.className).toContain('opacity-0')
    })

    it('toggle button expands sessions panel', () => {
      const { getByRole, getByTestId } = render(<App />)
      const toggleBtn = getByRole('button', { name: /toggle sessions/i })
      fireEvent.click(toggleBtn)
      const panel = getByTestId('sessions-panel')
      expect(panel.className).toContain('w-64')
      expect(panel.className).toContain('opacity-100')
    })

    it('toggle button collapses sessions panel on second click', () => {
      const { getByRole, getByTestId } = render(<App />)
      const toggleBtn = getByRole('button', { name: /toggle sessions/i })
      fireEvent.click(toggleBtn)
      const panel = getByTestId('sessions-panel')
      expect(panel.className).toContain('w-64')
      fireEvent.click(toggleBtn)
      expect(panel.className).toContain('w-0')
      expect(panel.className).toContain('opacity-0')
    })

    it('sessions panel has transition classes for smooth animation', () => {
      const { getByTestId } = render(<App />)
      const panel = getByTestId('sessions-panel')
      expect(panel.className).toContain('transition-all')
      expect(panel.className).toContain('duration-200')
      expect(panel.className).toContain('ease-in-out')
    })

    it('SessionList receives current sessionId as selectedId', () => {
      state.sessionId.value = 'test-session-id'
      state.sessions.value = [{ id: 'test-session-id', summary: 'Test', first_message: '', timestamp: '2026-01-24T10:00:00Z', model: 'opus' }]
      const { getByTestId } = render(<App />)
      const sessionItem = getByTestId('session-item-test-session-id')
      expect(sessionItem.className).toContain('border-blue-500')
    })

    it('clicking a session item calls handleSelectSession', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      state.sessions.value = [{ id: 'click-session', summary: 'Click me', first_message: '', timestamp: '2026-01-24T10:00:00Z', model: 'opus' }]
      const { getByTestId } = render(<App />)
      fireEvent.click(getByTestId('session-item-click-session'))
      expect(consoleSpy).toHaveBeenCalledWith('Selected session:', 'click-session')
      consoleSpy.mockRestore()
    })

    it('passes backend.listSessions as listFn to SessionList', () => {
      const loadSessionsSpy = vi.spyOn(state, 'loadSessions').mockResolvedValue(undefined)
      render(<App />)
      expect(loadSessionsSpy).toHaveBeenCalledWith(mockBackend.listSessions)
      loadSessionsSpy.mockRestore()
    })
  })
})
