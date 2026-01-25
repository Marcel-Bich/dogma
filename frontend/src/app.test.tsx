import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, act } from '@testing-library/preact'
import { App } from './app'
import * as state from './state'
import * as themes from './themes'
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

// Mock themes module
vi.mock('./themes', () => ({
  loadTheme: vi.fn(() => ({ presetId: 'arctic-pro', customAccent: null, intensity: 50 })),
  getThemeColors: vi.fn(() => ({
    accent: '#22d3ee',
    accentDark: '#0e7490',
    accentLight: '#67e8f9',
    border: '#1e3a4a',
    text: '#c8c8d8',
    dim: '#4a6670',
    message: '#e0f0ff',
    thinking: '#3a6670',
    error: '#f87171',
    black: '#000000',
  })),
  applyTheme: vi.fn(),
  applyIntensity: vi.fn(),
  saveTheme: vi.fn(),
  PRESETS: [
    { id: 'arctic-pro', name: 'Arctic Pro', colors: { accent: '#22d3ee', accentDark: '#0e7490', accentLight: '#67e8f9', border: '#1e3a4a', text: '#c8c8d8', dim: '#4a6670', message: '#e0f0ff', thinking: '#3a6670', error: '#f87171', black: '#000000' } },
    { id: 'pulse', name: 'Pulse', colors: { accent: '#a78bfa', accentDark: '#6d28d9', accentLight: '#c4b5fd', border: '#2e1a5a', text: '#c8c8d8', dim: '#5a4a70', message: '#e0f0ff', thinking: '#4a3a60', error: '#f87171', black: '#000000' } },
    { id: 'ember', name: 'Ember', colors: { accent: '#f59e0b', accentDark: '#b45309', accentLight: '#fbbf24', border: '#4a3a1a', text: '#c8c8d8', dim: '#6a5a40', message: '#e0f0ff', thinking: '#5a4a30', error: '#f87171', black: '#000000' } },
  ],
}))

// Mock loadSessions to prevent SessionList useEffect from interfering
vi.spyOn(state, 'loadSessions').mockResolvedValue(undefined)

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    registeredCallback = null
    state.resetState()
    // jsdom does not implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  describe('rendering', () => {
    it('renders ChatInput component', () => {
      const { getByLabelText } = render(<App />)
      expect(getByLabelText('Enter your prompt...')).toBeTruthy()
    })

    it('renders MessageList component', () => {
      const { getByText } = render(<App />)
      expect(getByText('Awaiting commands')).toBeTruthy()
    })

    it('has flex-col h-screen layout', () => {
      const { container } = render(<App />)
      const root = container.firstElementChild as HTMLElement
      expect(root.className).toContain('flex')
      expect(root.className).toContain('flex-col')
      expect(root.className).toContain('h-screen')
    })

    it('renders Menu component in header', () => {
      const { getByRole } = render(<App />)
      const menuBtn = getByRole('button', { name: 'Menu' })
      expect(menuBtn).toBeTruthy()
    })

    it('header has shadow and gradient for visual depth', () => {
      const { getByRole } = render(<App />)
      const menuBtn = getByRole('button', { name: 'Menu' })
      const header = menuBtn.closest('.z-10') as HTMLElement
      expect(header.className).toContain('shadow-md')
      expect(header.className).toContain('bg-gradient-to-b')
      expect(header.className).toContain('z-10')
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
    it('calls backend.sendPrompt with text when send is triggered', () => {
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test prompt' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(mockBackend.sendPrompt).toHaveBeenCalledWith('test prompt')
    })

    it('sets loading=true when send is triggered', () => {
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(state.loading.value).toBe(true)
    })

    it('clears error when send is triggered', () => {
      state.setError('previous error')
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(state.error.value).toBeNull()
    })
  })

  describe('continue handler', () => {
    it('calls backend.continuePrompt with text when continue is triggered', () => {
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'resume work' } })
      // First Enter triggers pending, second Enter toggles to continue mode
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(mockBackend.continuePrompt).toHaveBeenCalledWith('resume work')
    })

    it('sets loading=true when continue is triggered', () => {
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(state.loading.value).toBe(true)
    })

    it('clears error when continue is triggered', () => {
      state.setError('previous error')
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(state.error.value).toBeNull()
    })
  })

  describe('cancel handler', () => {
    it('calls backend.cancelPrompt when cancel is triggered', () => {
      state.setLoading(true)
      state.setStoppable(true)
      const { getByTestId } = render(<App />)

      // When loading and stoppable, indicator shows # and calls onCancel when clicked
      const indicator = getByTestId('indicator')
      fireEvent.click(indicator)

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

  describe('settings panel', () => {
    it('renders SettingsPanel component', () => {
      const { getByTestId } = render(<App />)
      expect(getByTestId('settings-panel')).toBeTruthy()
    })

    it('settings panel is initially hidden', () => {
      const { getByTestId } = render(<App />)
      const panel = getByTestId('settings-panel')
      expect((panel as HTMLElement).style.transform).toBe('translateX(100%)')
    })

    it('opening settings via menu shows settings panel', () => {
      const { getByRole, getByText, getByTestId } = render(<App />)
      const menuBtn = getByRole('button', { name: 'Menu' })
      fireEvent.click(menuBtn)
      fireEvent.click(getByText('Settings'))
      const panel = getByTestId('settings-panel')
      expect((panel as HTMLElement).style.transform).toBe('translateX(0)')
    })

    it('closing settings panel hides it', () => {
      const { getByRole, getByText, getByTestId } = render(<App />)
      // Open
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Settings'))
      // Close
      fireEvent.click(getByRole('button', { name: 'Close settings' }))
      const panel = getByTestId('settings-panel')
      expect((panel as HTMLElement).style.transform).toBe('translateX(100%)')
    })
  })

  describe('theme initialization', () => {
    it('loads theme from localStorage on mount', () => {
      render(<App />)
      expect(themes.loadTheme).toHaveBeenCalled()
      expect(themes.getThemeColors).toHaveBeenCalledWith('arctic-pro', null)
      expect(themes.applyTheme).toHaveBeenCalled()
      expect(themes.applyIntensity).toHaveBeenCalledWith(50, '#22d3ee')
    })

    it('sets active theme and custom accent from stored values', () => {
      vi.mocked(themes.loadTheme).mockReturnValueOnce({ presetId: 'pulse', customAccent: '#ff0000', intensity: 70 })
      render(<App />)
      expect(state.activeThemeId.value).toBe('pulse')
      expect(state.customAccent.value).toBe('#ff0000')
      expect(state.intensity.value).toBe(70)
    })

    it('selecting a preset updates theme and saves', () => {
      const { getByRole, getByText, getByTestId } = render(<App />)
      // Open settings
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Settings'))
      // Click Pulse preset
      fireEvent.click(getByTestId('preset-pulse'))
      expect(state.activeThemeId.value).toBe('pulse')
      expect(state.customAccent.value).toBeNull()
      expect(themes.getThemeColors).toHaveBeenCalledWith('pulse', null)
      expect(themes.applyTheme).toHaveBeenCalled()
      expect(themes.applyIntensity).toHaveBeenCalled()
      expect(themes.saveTheme).toHaveBeenCalledWith('pulse', null, 50)
    })

    it('custom accent updates theme and saves', () => {
      const { getByRole, getByText, getByLabelText } = render(<App />)
      // Open settings
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Settings'))
      // Change custom color
      const colorInput = getByLabelText('Custom accent color')
      fireEvent.input(colorInput, { target: { value: '#ff5500' } })
      expect(state.customAccent.value).toBe('#ff5500')
      expect(themes.getThemeColors).toHaveBeenCalledWith('arctic-pro', '#ff5500')
      expect(themes.applyTheme).toHaveBeenCalled()
      expect(themes.applyIntensity).toHaveBeenCalled()
      expect(themes.saveTheme).toHaveBeenCalledWith('arctic-pro', '#ff5500', 50)
    })
  })

  describe('session panel', () => {
    it('sessions panel is collapsed by default', () => {
      const { getByTestId } = render(<App />)
      const panel = getByTestId('sessions-panel')
      expect(panel.className).toContain('w-0')
      expect(panel.className).toContain('opacity-0')
    })

    it('sessions menu item expands sessions panel', () => {
      const { getByRole, getByText, getByTestId } = render(<App />)
      const menuBtn = getByRole('button', { name: 'Menu' })
      fireEvent.click(menuBtn)
      fireEvent.click(getByText('Sessions'))
      const panel = getByTestId('sessions-panel')
      expect(panel.className).toContain('sm:w-64')
      expect(panel.className).toContain('opacity-100')
    })

    it('sessions menu item collapses sessions panel on second toggle', () => {
      const { getByRole, getByText, getByTestId } = render(<App />)
      // Open sessions
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Sessions'))
      const panel = getByTestId('sessions-panel')
      expect(panel.className).toContain('sm:w-64')
      // Close sessions
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Sessions'))
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

    it('sessions panel uses responsive width classes when open', () => {
      const { getByRole, getByText, getByTestId } = render(<App />)
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Sessions'))
      const panel = getByTestId('sessions-panel')
      // Mobile: 85vw width, absolute positioning, z-index
      expect(panel.className).toContain('w-[85vw]')
      expect(panel.className).toContain('absolute')
      expect(panel.className).toContain('z-20')
      // Desktop: relative positioning, fixed 256px width
      expect(panel.className).toContain('sm:w-64')
      expect(panel.className).toContain('sm:relative')
      expect(panel.className).toContain('sm:z-auto')
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

    it('clicking main content area closes sessions panel', () => {
      const { getByRole, getByText, getByTestId } = render(<App />)
      // Open sessions panel
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Sessions'))
      const panel = getByTestId('sessions-panel')
      expect(panel.className).toContain('opacity-100')
      // Click main content area
      fireEvent.click(getByTestId('main-content'))
      expect(panel.className).toContain('w-0')
      expect(panel.className).toContain('opacity-0')
    })
  })

  describe('click-outside behavior', () => {
    it('clicking backdrop closes settings panel', () => {
      const { getByRole, getByText, getByTestId } = render(<App />)
      // Open settings
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Settings'))
      const panel = getByTestId('settings-panel')
      expect((panel as HTMLElement).style.transform).toBe('translateX(0)')
      // Click backdrop
      fireEvent.click(getByTestId('settings-backdrop'))
      expect((panel as HTMLElement).style.transform).toBe('translateX(100%)')
    })

    it('backdrop is not rendered when settings panel is closed', () => {
      const { queryByTestId } = render(<App />)
      expect(queryByTestId('settings-backdrop')).toBeNull()
    })
  })
})
