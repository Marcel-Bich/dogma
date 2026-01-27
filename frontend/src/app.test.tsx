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
  sendPromptWithSession: vi.fn().mockResolvedValue(undefined),
  sendPromptWithRequestId: vi.fn().mockResolvedValue(undefined),
  sendPromptWithSessionAndRequestId: vi.fn().mockResolvedValue(undefined),
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
  loadTheme: vi.fn(() => ({ presetId: 'arctic-pro', customAccent: null, intensity: 50, spellCheck: false, backgroundColor: '#000000' })),
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
  applyBackgroundColor: vi.fn((color: string) => {
    document.documentElement.style.setProperty('--bg-color', color)
  }),
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

    it('header has shadow for visual depth', () => {
      const { getByRole } = render(<App />)
      const menuBtn = getByRole('button', { name: 'Menu' })
      const header = menuBtn.closest('.z-10') as HTMLElement
      expect(header.className).toContain('shadow-md')
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

    it('result event without error sets stoppable=false', () => {
      render(<App />)
      state.setLoading(true)
      state.setStoppable(true)

      expect(registeredCallback).toBeDefined()
      registeredCallback!({ type: 'result', result: 'done' })
      expect(state.stoppable.value).toBe(false)
    })

    it('result event with is_error sets error and loading=false', () => {
      render(<App />)
      state.setLoading(true)

      expect(registeredCallback).toBeDefined()
      registeredCallback!({ type: 'result', result: 'something failed', is_error: true })
      expect(state.error.value).toBe('something failed')
      expect(state.loading.value).toBe(false)
    })

    it('result event with is_error sets stoppable=false', () => {
      render(<App />)
      state.setLoading(true)
      state.setStoppable(true)

      expect(registeredCallback).toBeDefined()
      registeredCallback!({ type: 'result', result: 'something failed', is_error: true })
      expect(state.stoppable.value).toBe(false)
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

  describe('send handler (new session)', () => {
    it('calls backend.sendPromptWithRequestId with text when 2x Enter triggers new session', () => {
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test prompt' } })
      // 2x Enter = new session
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(mockBackend.sendPromptWithRequestId).toHaveBeenCalledWith('test prompt', expect.any(String))
    })

    it('adds user message to messages list before calling backend', () => {
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'my user message' } })
      // 2x Enter = new session
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(state.messages.value.length).toBe(1)
      const msg = state.messages.value[0]
      expect(msg.role).toBe('user')
      expect(msg.blocks).toHaveLength(1)
      expect(msg.blocks[0].type).toBe('text')
      expect(msg.blocks[0].content).toBe('my user message')
    })

    it('sets stoppable=true when loading starts', () => {
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      // 2x Enter = new session
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(state.stoppable.value).toBe(true)
    })

    it('clears sessionId when starting new session', () => {
      state.sessionId.value = 'existing-session'
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      // 2x Enter = new session
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(state.sessionId.value).toBeNull()
      expect(mockBackend.sendPromptWithRequestId).toHaveBeenCalled()
    })

    it('sets loading=true when send is triggered', () => {
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      // 2x Enter = new session
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
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
      // 2x Enter = new session
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(state.error.value).toBeNull()
    })
  })

  describe('continue handler (continue session)', () => {
    it('calls backend.sendPromptWithSessionAndRequestId when session exists', () => {
      state.sessionId.value = 'existing-session-id'
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'continue work' } })
      // 1x Enter = continue session
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(mockBackend.sendPromptWithSessionAndRequestId).toHaveBeenCalledWith('continue work', 'existing-session-id', expect.any(String))
    })

    it('adds user message to messages list before calling backend', () => {
      state.sessionId.value = 'existing-session-id'
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'continue this' } })
      // 1x Enter = continue session
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(state.messages.value.length).toBe(1)
      const msg = state.messages.value[0]
      expect(msg.role).toBe('user')
      expect(msg.blocks).toHaveLength(1)
      expect(msg.blocks[0].type).toBe('text')
      expect(msg.blocks[0].content).toBe('continue this')
    })

    it('sets stoppable=true when loading starts', () => {
      state.sessionId.value = 'existing-session-id'
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      // 1x Enter = continue session
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(state.stoppable.value).toBe(true)
    })

    it('calls backend.sendPromptWithRequestId when no session exists (first message)', () => {
      state.sessionId.value = null
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'first message' } })
      // 1x Enter = continue session (but no session, so starts new)
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(mockBackend.sendPromptWithRequestId).toHaveBeenCalledWith('first message', expect.any(String))
      expect(mockBackend.sendPromptWithSessionAndRequestId).not.toHaveBeenCalled()
    })

    it('sets loading=true when continue is triggered', () => {
      state.sessionId.value = 'test-session'
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      // 1x Enter = continue session
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(state.loading.value).toBe(true)
    })

    it('clears error when continue is triggered', () => {
      state.setError('previous error')
      state.sessionId.value = 'test-session'
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      // 1x Enter = continue session
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
      vi.mocked(themes.loadTheme).mockReturnValueOnce({ presetId: 'pulse', customAccent: '#ff0000', intensity: 70, spellCheck: false, backgroundColor: '#000000' })
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
      expect(themes.saveTheme).toHaveBeenCalledWith('pulse', null, 50, false, '#000000')
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
      expect(themes.saveTheme).toHaveBeenCalledWith('arctic-pro', '#ff5500', 50, false, '#000000')
    })

    it('intensity slider updates theme and saves', () => {
      const { getByRole, getByText, getByLabelText } = render(<App />)
      // Open settings
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Settings'))
      // Change intensity slider
      const slider = getByLabelText('Intensity')
      fireEvent.input(slider, { target: { value: '75' } })
      expect(state.intensity.value).toBe(75)
      expect(themes.applyIntensity).toHaveBeenCalled()
      expect(themes.saveTheme).toHaveBeenCalledWith('arctic-pro', null, 75, false, '#000000')
    })

    it('intensity slider uses custom accent when available', () => {
      const { getByRole, getByText, getByLabelText } = render(<App />)
      // Open settings
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Settings'))
      // First set a custom accent via the color picker
      const colorInput = getByLabelText('Custom accent color')
      fireEvent.input(colorInput, { target: { value: '#ff0000' } })
      vi.clearAllMocks()
      // Now change intensity slider
      const slider = getByLabelText('Intensity')
      fireEvent.input(slider, { target: { value: '60' } })
      expect(themes.applyIntensity).toHaveBeenCalledWith(60, '#ff0000')
      expect(themes.saveTheme).toHaveBeenCalledWith('arctic-pro', '#ff0000', 60, false, '#000000')
    })

    it('loads spellCheck and backgroundColor from stored values', () => {
      vi.mocked(themes.loadTheme).mockReturnValueOnce({ presetId: 'arctic-pro', customAccent: null, intensity: 50, spellCheck: true, backgroundColor: '#112233' })
      render(<App />)
      expect(state.spellCheck.value).toBe(true)
      expect(state.backgroundColor.value).toBe('#112233')
    })

    it('spell check toggle updates state and saves', () => {
      const { getByRole, getByText, getByLabelText } = render(<App />)
      // Open settings
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Settings'))
      // Toggle spell check
      const toggle = getByLabelText('Spell check')
      fireEvent.click(toggle)
      expect(state.spellCheck.value).toBe(true)
      expect(themes.saveTheme).toHaveBeenCalledWith('arctic-pro', null, 50, true, '#000000')
    })

    it('background color picker updates state and saves', () => {
      const { getByRole, getByText, getByLabelText } = render(<App />)
      // Open settings
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Settings'))
      // Change background color
      const colorInput = getByLabelText('Background color')
      fireEvent.input(colorInput, { target: { value: '#ff0000' } })
      expect(state.backgroundColor.value).toBe('#ff0000')
      expect(themes.saveTheme).toHaveBeenCalledWith('arctic-pro', null, 50, false, '#ff0000')
    })

    it('applies backgroundColor via CSS variable to root container', () => {
      vi.mocked(themes.loadTheme).mockReturnValueOnce({ presetId: 'arctic-pro', customAccent: null, intensity: 50, spellCheck: false, backgroundColor: '#112233' })
      const { container } = render(<App />)
      const root = container.firstElementChild as HTMLElement
      expect(root.style.background).toBe('var(--bg-color)')
      expect(document.documentElement.style.getPropertyValue('--bg-color')).toBe('#112233')
    })

    it('passes spellCheck to ChatInput', () => {
      vi.mocked(themes.loadTheme).mockReturnValueOnce({ presetId: 'arctic-pro', customAccent: null, intensity: 50, spellCheck: true, backgroundColor: '#000000' })
      const { getByLabelText } = render(<App />)
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      expect(textarea.getAttribute('spellcheck')).toBe('true')
    })

    it('sets --bg-color CSS variable on document root', () => {
      vi.mocked(themes.loadTheme).mockReturnValueOnce({ presetId: 'arctic-pro', customAccent: null, intensity: 50, spellCheck: false, backgroundColor: '#112233' })
      render(<App />)
      expect(document.documentElement.style.getPropertyValue('--bg-color')).toBe('#112233')
    })

    it('topbar uses var(--bg-color) for background', () => {
      const { getByRole } = render(<App />)
      const menuBtn = getByRole('button', { name: 'Menu' })
      const header = menuBtn.closest('.z-10') as HTMLElement
      expect(header.style.background).toContain('var(--bg-color)')
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

    it('sessions panel has no border when closed', () => {
      const { getByTestId } = render(<App />)
      const panel = getByTestId('sessions-panel')
      expect(panel.className).toContain('border-r-0')
    })

    it('sessions panel has border when open', () => {
      const { getByRole, getByText, getByTestId } = render(<App />)
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Sessions'))
      const panel = getByTestId('sessions-panel')
      expect(panel.className).toContain('border-r')
      expect(panel.className).not.toContain('border-r-0')
    })

    it('SessionList is not rendered when panel is closed', () => {
      const { queryByTestId } = render(<App />)
      // SessionList renders one of these test IDs
      expect(queryByTestId('sessions-loading')).toBeNull()
      expect(queryByTestId('sessions-list')).toBeNull()
      expect(queryByTestId('sessions-empty')).toBeNull()
      expect(queryByTestId('sessions-error')).toBeNull()
    })

    it('SessionList is rendered when panel is open', () => {
      const { getByRole, getByText, queryByTestId } = render(<App />)
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Sessions'))
      // At least one of these should exist
      const hasSessionContent =
        queryByTestId('sessions-loading') !== null ||
        queryByTestId('sessions-list') !== null ||
        queryByTestId('sessions-empty') !== null ||
        queryByTestId('sessions-error') !== null
      expect(hasSessionContent).toBe(true)
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
      const { getByRole, getByText, getByTestId } = render(<App />)
      // Open sessions panel first (SessionList only renders when open)
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Sessions'))
      const sessionItem = getByTestId('session-item-test-session-id')
      expect(sessionItem.className).toContain('border-blue-500')
    })

    it('clicking a session item calls handleSelectSession', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      state.sessions.value = [{ id: 'click-session', summary: 'Click me', first_message: '', timestamp: '2026-01-24T10:00:00Z', model: 'opus' }]
      const { getByRole, getByText, getByTestId } = render(<App />)
      // Open sessions panel first (SessionList only renders when open)
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Sessions'))
      fireEvent.click(getByTestId('session-item-click-session'))
      expect(consoleSpy).toHaveBeenCalledWith('Selected session:', 'click-session')
      consoleSpy.mockRestore()
    })

    it('passes backend.listSessions as listFn to SessionList', () => {
      const loadSessionsSpy = vi.spyOn(state, 'loadSessions').mockResolvedValue(undefined)
      const { getByRole, getByText } = render(<App />)
      // Open sessions panel first (SessionList only renders when open)
      fireEvent.click(getByRole('button', { name: 'Menu' }))
      fireEvent.click(getByText('Sessions'))
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
