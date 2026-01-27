import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  messages,
  loading,
  stoppable,
  error,
  sessionId,
  sessions,
  sessionsLoading,
  sessionsError,
  menuOpen,
  settingsOpen,
  activeThemeId,
  customAccent,
  intensity,
  spellCheck,
  backgroundColor,
  addMessage,
  handleBridgeEvent,
  setLoading,
  setStoppable,
  setError,
  setMenuOpen,
  setSettingsOpen,
  setActiveTheme,
  setCustomAccent,
  setIntensity,
  setSpellCheck,
  setBackgroundColor,
  resetState,
  loadSessions,
  formatErrorMessage,
  currentRequestId,
  setCurrentRequestId,
  generateRequestId,
} from './state'
import type { BridgeEvent, ChatMessage, SessionInfo } from './types'

describe('state', () => {
  beforeEach(() => {
    resetState()
  })

  describe('initial state', () => {
    it('has empty messages array', () => {
      expect(messages.value).toEqual([])
    })

    it('has loading=false', () => {
      expect(loading.value).toBe(false)
    })

    it('has error=null', () => {
      expect(error.value).toBeNull()
    })

    it('has sessionId=null', () => {
      expect(sessionId.value).toBeNull()
    })
  })

  describe('addMessage', () => {
    it('appends a ChatMessage to messages signal', () => {
      const msg: ChatMessage = {
        id: 'msg-1',
        role: 'assistant',
        blocks: [{ type: 'text', content: 'hello' }],
        timestamp: 1000,
      }
      addMessage(msg)
      expect(messages.value).toHaveLength(1)
      expect(messages.value[0]).toEqual(msg)
    })

    it('appends multiple messages in order', () => {
      const msg1: ChatMessage = {
        id: 'msg-1',
        role: 'assistant',
        blocks: [{ type: 'text', content: 'first' }],
        timestamp: 1000,
      }
      const msg2: ChatMessage = {
        id: 'msg-2',
        role: 'system',
        blocks: [{ type: 'text', content: 'second' }],
        timestamp: 2000,
      }
      addMessage(msg1)
      addMessage(msg2)
      expect(messages.value).toHaveLength(2)
      expect(messages.value[0].id).toBe('msg-1')
      expect(messages.value[1].id).toBe('msg-2')
    })
  })

  describe('handleBridgeEvent', () => {
    it('with type="assistant" + text creates TextBlock in current message', () => {
      const event: BridgeEvent = { type: 'assistant', text: 'hello world' }
      handleBridgeEvent(event)
      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].role).toBe('assistant')
      expect(messages.value[0].blocks).toHaveLength(1)
      expect(messages.value[0].blocks[0]).toEqual({
        type: 'text',
        content: 'hello world',
      })
    })

    it('with type="assistant" + thinking creates ThinkingBlock', () => {
      const event: BridgeEvent = { type: 'assistant', thinking: 'let me think...' }
      handleBridgeEvent(event)
      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].blocks[0]).toEqual({
        type: 'thinking',
        content: 'let me think...',
      })
    })

    it('with type="assistant" + tool_name creates ToolUseBlock', () => {
      const event: BridgeEvent = {
        type: 'assistant',
        tool_name: 'read_file',
        tool_input: '{"path": "/foo.txt"}',
      }
      handleBridgeEvent(event)
      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].blocks[0]).toEqual({
        type: 'tool_use',
        content: 'read_file',
        toolName: 'read_file',
        toolInput: '{"path": "/foo.txt"}',
      })
    })

    it('successful result event finalizes message without adding a block', () => {
      // First create a message via assistant event
      const assistantEvent: BridgeEvent = { type: 'assistant', text: 'working...' }
      handleBridgeEvent(assistantEvent)

      const resultEvent: BridgeEvent = { type: 'result', result: 'done!' }
      handleBridgeEvent(resultEvent)
      expect(messages.value).toHaveLength(1)
      // Only the text block from the assistant event, no result block
      expect(messages.value[0].blocks).toHaveLength(1)
      expect(messages.value[0].blocks[0]).toEqual({
        type: 'text',
        content: 'working...',
      })
    })

    it('with type="result" + is_error=true creates ErrorBlock in new message', () => {
      const assistantEvent: BridgeEvent = { type: 'assistant', text: 'trying...' }
      handleBridgeEvent(assistantEvent)

      const errorEvent: BridgeEvent = {
        type: 'result',
        result: 'something failed',
        is_error: true,
      }
      handleBridgeEvent(errorEvent)
      // Error always creates a NEW message for chronological ordering
      expect(messages.value).toHaveLength(2)
      expect(messages.value[0].blocks[0]).toEqual({
        type: 'text',
        content: 'trying...',
      })
      expect(messages.value[1].blocks[0]).toEqual({
        type: 'error',
        content: 'something failed',
      })
    })

    it('with type="system" sets sessionId signal when request_id matches', () => {
      setCurrentRequestId('my-request-123')
      const event: BridgeEvent = {
        type: 'system',
        session_id: 'sess-abc-123',
        request_id: 'my-request-123',
      }
      handleBridgeEvent(event)
      expect(sessionId.value).toBe('sess-abc-123')
    })

    it('with type="system" does NOT set sessionId when request_id differs', () => {
      // Another client sent a prompt - we should ignore their session
      setCurrentRequestId('my-request-123')
      const event: BridgeEvent = {
        type: 'system',
        session_id: 'other-session',
        request_id: 'other-request-456',
      }
      handleBridgeEvent(event)
      expect(sessionId.value).toBeNull() // should remain null (event filtered)
    })

    it('multiple sequential assistant events accumulate blocks in same message', () => {
      const ev1: BridgeEvent = { type: 'assistant', thinking: 'thinking first' }
      const ev2: BridgeEvent = { type: 'assistant', text: 'then text' }
      const ev3: BridgeEvent = {
        type: 'assistant',
        tool_name: 'bash',
        tool_input: '{"cmd": "ls"}',
      }

      handleBridgeEvent(ev1)
      handleBridgeEvent(ev2)
      handleBridgeEvent(ev3)

      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].blocks).toHaveLength(3)
      expect(messages.value[0].blocks[0].type).toBe('thinking')
      expect(messages.value[0].blocks[1].type).toBe('text')
      expect(messages.value[0].blocks[2].type).toBe('tool_use')
    })

    it('successful orphan result event does not create a message', () => {
      const resultEvent: BridgeEvent = { type: 'result', result: 'orphan result' }
      handleBridgeEvent(resultEvent)
      // Successful result without prior assistant should not create a visible message
      expect(messages.value).toHaveLength(0)
    })

    it('error orphan result event creates a message with ErrorBlock', () => {
      const resultEvent: BridgeEvent = {
        type: 'result',
        result: 'orphan error',
        is_error: true,
      }
      handleBridgeEvent(resultEvent)
      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].blocks[0]).toEqual({
        type: 'error',
        content: 'orphan error',
      })
    })

    it('assistant event with no content fields does not add a block', () => {
      const event: BridgeEvent = { type: 'assistant' }
      handleBridgeEvent(event)
      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].blocks).toHaveLength(0)
    })

    it('system event without session_id does not change sessionId', () => {
      setCurrentRequestId('my-request')
      handleBridgeEvent({ type: 'system', session_id: 'initial', request_id: 'my-request' })
      // Second system event without session_id should not override
      handleBridgeEvent({ type: 'system', request_id: 'my-request' })
      expect(sessionId.value).toBe('initial')
    })

    it('assistant event from different request is filtered out', () => {
      // Set up our request
      setCurrentRequestId('my-request')
      handleBridgeEvent({ type: 'system', session_id: 'my-session', request_id: 'my-request' })

      // Assistant event from same request should be processed
      handleBridgeEvent({ type: 'assistant', text: 'hello', request_id: 'my-request' })
      expect(messages.value).toHaveLength(1)

      // Assistant event from different request should be ignored
      handleBridgeEvent({ type: 'assistant', text: 'other', request_id: 'other-request' })
      expect(messages.value).toHaveLength(1) // still 1, not 2
    })

    it('result event from different request is filtered out', () => {
      // Set up our request
      setCurrentRequestId('my-request')
      handleBridgeEvent({ type: 'system', session_id: 'my-session', request_id: 'my-request' })
      handleBridgeEvent({ type: 'assistant', text: 'hello', request_id: 'my-request' })

      // Result from different request should be ignored
      handleBridgeEvent({ type: 'result', is_error: true, result: 'error', request_id: 'other-request' })
      // No error message should be added
      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].blocks[0].type).toBe('text')
    })

    it('successful result with empty result does not add a block', () => {
      const assistantEvent: BridgeEvent = { type: 'assistant', text: 'hi' }
      handleBridgeEvent(assistantEvent)

      const event: BridgeEvent = { type: 'result' }
      handleBridgeEvent(event)
      // Only the text block, no result block
      expect(messages.value[0].blocks).toHaveLength(1)
      expect(messages.value[0].blocks[0].type).toBe('text')
    })

    it('tool_use event without tool_input uses empty string', () => {
      const event: BridgeEvent = { type: 'assistant', tool_name: 'bash' }
      handleBridgeEvent(event)
      expect(messages.value[0].blocks[0]).toEqual({
        type: 'tool_use',
        content: 'bash',
        toolName: 'bash',
        toolInput: '',
      })
    })

    it('result event with is_error=true and no result uses empty string', () => {
      const event: BridgeEvent = { type: 'result', is_error: true }
      handleBridgeEvent(event)
      expect(messages.value[0].blocks[0]).toEqual({
        type: 'error',
        content: '',
      })
    })

    it('error result always creates new message at end for chronological order', () => {
      // Simulate: user message exists, then error comes in
      const userMsg: ChatMessage = {
        id: 'user-msg-1',
        role: 'user',
        blocks: [{ type: 'text', content: 'user prompt' }],
        timestamp: Date.now(),
      }
      addMessage(userMsg)

      // Error event should create a NEW message at the end
      const errorEvent: BridgeEvent = {
        type: 'result',
        result: 'claude exited: exit status 143',
        is_error: true,
      }
      handleBridgeEvent(errorEvent)

      // Should have 2 messages: user first, then error
      expect(messages.value).toHaveLength(2)
      expect(messages.value[0].role).toBe('user')
      expect(messages.value[1].role).toBe('assistant')
      expect(messages.value[1].blocks[0].type).toBe('error')
    })

    it('error result formats the message using formatErrorMessage', () => {
      const errorEvent: BridgeEvent = {
        type: 'result',
        result: 'claude exited: exit status 143',
        is_error: true,
      }
      handleBridgeEvent(errorEvent)

      expect(messages.value[0].blocks[0]).toEqual({
        type: 'error',
        content: 'Interrupted',
      })
    })

    it('error during active assistant message still creates new message', () => {
      // Start an assistant message
      handleBridgeEvent({ type: 'assistant', text: 'Starting...' })
      expect(messages.value).toHaveLength(1)
      const firstMsgId = messages.value[0].id

      // Error comes in - should create NEW message, not append to existing
      const errorEvent: BridgeEvent = {
        type: 'result',
        result: 'claude exited: signal: terminated',
        is_error: true,
      }
      handleBridgeEvent(errorEvent)

      // Should have 2 messages now
      expect(messages.value).toHaveLength(2)
      expect(messages.value[0].id).toBe(firstMsgId)
      expect(messages.value[0].blocks).toHaveLength(1)
      expect(messages.value[0].blocks[0].type).toBe('text')
      expect(messages.value[1].blocks[0]).toEqual({
        type: 'error',
        content: 'Interrupted',
      })
    })

    it('unknown event type is ignored', () => {
      const event: BridgeEvent = { type: 'unknown' }
      handleBridgeEvent(event)
      expect(messages.value).toHaveLength(0)
    })

    it('new assistant event after result starts a new message', () => {
      const ev1: BridgeEvent = { type: 'assistant', text: 'first turn' }
      const ev2: BridgeEvent = { type: 'result', result: 'done' }
      const ev3: BridgeEvent = { type: 'assistant', text: 'second turn' }

      handleBridgeEvent(ev1)
      handleBridgeEvent(ev2)
      handleBridgeEvent(ev3)

      expect(messages.value).toHaveLength(2)
      // First message: only the text block (result does not add a block)
      expect(messages.value[0].blocks).toHaveLength(1)
      expect(messages.value[0].blocks[0]).toEqual({
        type: 'text',
        content: 'first turn',
      })
      expect(messages.value[1].blocks[0]).toEqual({
        type: 'text',
        content: 'second turn',
      })
    })
  })

  describe('setLoading', () => {
    it('sets loading to true', () => {
      setLoading(true)
      expect(loading.value).toBe(true)
    })

    it('sets loading to false', () => {
      setLoading(true)
      setLoading(false)
      expect(loading.value).toBe(false)
    })
  })

  describe('setStoppable', () => {
    it('sets stoppable to true', () => {
      setStoppable(true)
      expect(stoppable.value).toBe(true)
    })

    it('sets stoppable to false', () => {
      setStoppable(true)
      setStoppable(false)
      expect(stoppable.value).toBe(false)
    })
  })

  describe('setError', () => {
    it('sets error message', () => {
      setError('something went wrong')
      expect(error.value).toBe('something went wrong')
    })

    it('clears error with null', () => {
      setError('oops')
      setError(null)
      expect(error.value).toBeNull()
    })
  })

  describe('resetState', () => {
    it('clears all signals to initial values', () => {
      // Set up some state
      const msg: ChatMessage = {
        id: 'msg-1',
        role: 'assistant',
        blocks: [{ type: 'text', content: 'hello' }],
        timestamp: 1000,
      }
      addMessage(msg)
      setLoading(true)
      setStoppable(true)
      setError('some error')
      setCurrentRequestId('test-request')
      handleBridgeEvent({ type: 'system', session_id: 'sess-1', request_id: 'test-request' })

      // Reset
      resetState()

      expect(messages.value).toEqual([])
      expect(loading.value).toBe(false)
      expect(stoppable.value).toBe(false)
      expect(error.value).toBeNull()
      expect(sessionId.value).toBeNull()
    })

    it('clears session state', () => {
      sessions.value = [{ id: 's1', summary: 'test', first_message: 'hi', timestamp: '2026-01-01T00:00:00Z', model: 'opus' }]
      sessionsLoading.value = true
      sessionsError.value = 'old error'

      resetState()

      expect(sessions.value).toEqual([])
      expect(sessionsLoading.value).toBe(false)
      expect(sessionsError.value).toBeNull()
    })
  })

  describe('menuOpen', () => {
    it('starts as false', () => {
      expect(menuOpen.value).toBe(false)
    })

    it('setMenuOpen(true) updates menuOpen.value to true', () => {
      setMenuOpen(true)
      expect(menuOpen.value).toBe(true)
    })

    it('setMenuOpen(false) updates menuOpen.value to false', () => {
      setMenuOpen(true)
      setMenuOpen(false)
      expect(menuOpen.value).toBe(false)
    })
  })

  describe('settingsOpen', () => {
    it('starts as false', () => {
      expect(settingsOpen.value).toBe(false)
    })

    it('setSettingsOpen(true) updates settingsOpen.value', () => {
      setSettingsOpen(true)
      expect(settingsOpen.value).toBe(true)
    })

    it('setSettingsOpen(false) updates settingsOpen.value', () => {
      setSettingsOpen(true)
      setSettingsOpen(false)
      expect(settingsOpen.value).toBe(false)
    })
  })

  describe('activeThemeId', () => {
    it('starts as arctic-pro', () => {
      expect(activeThemeId.value).toBe('arctic-pro')
    })

    it('setActiveTheme updates activeThemeId.value', () => {
      setActiveTheme('pulse')
      expect(activeThemeId.value).toBe('pulse')
    })
  })

  describe('customAccent', () => {
    it('starts as null', () => {
      expect(customAccent.value).toBeNull()
    })

    it('setCustomAccent sets hex value', () => {
      setCustomAccent('#ff0000')
      expect(customAccent.value).toBe('#ff0000')
    })

    it('setCustomAccent(null) resets to null', () => {
      setCustomAccent('#ff0000')
      setCustomAccent(null)
      expect(customAccent.value).toBeNull()
    })
  })

  describe('intensity', () => {
    it('starts at 50', () => {
      expect(intensity.value).toBe(50)
    })

    it('setIntensity updates intensity.value', () => {
      setIntensity(75)
      expect(intensity.value).toBe(75)
    })

    it('setIntensity can be set to minimum 30', () => {
      setIntensity(30)
      expect(intensity.value).toBe(30)
    })

    it('setIntensity can be set to maximum 90', () => {
      setIntensity(90)
      expect(intensity.value).toBe(90)
    })
  })

  describe('resetState with settings signals', () => {
    it('resets all settings signals to defaults', () => {
      setMenuOpen(true)
      setSettingsOpen(true)
      setActiveTheme('pulse')
      setCustomAccent('#00ff00')
      setIntensity(80)
      setSpellCheck(true)
      setBackgroundColor('#ff0000')

      resetState()

      expect(menuOpen.value).toBe(false)
      expect(settingsOpen.value).toBe(false)
      expect(activeThemeId.value).toBe('arctic-pro')
      expect(customAccent.value).toBeNull()
      expect(intensity.value).toBe(50)
      expect(spellCheck.value).toBe(false)
      expect(backgroundColor.value).toBe('#000000')
    })
  })

  describe('spellCheck', () => {
    it('starts as false', () => {
      expect(spellCheck.value).toBe(false)
    })

    it('setSpellCheck(true) updates spellCheck.value to true', () => {
      setSpellCheck(true)
      expect(spellCheck.value).toBe(true)
    })

    it('setSpellCheck(false) updates spellCheck.value to false', () => {
      setSpellCheck(true)
      setSpellCheck(false)
      expect(spellCheck.value).toBe(false)
    })
  })

  describe('backgroundColor', () => {
    it('starts as #000000', () => {
      expect(backgroundColor.value).toBe('#000000')
    })

    it('setBackgroundColor updates backgroundColor.value', () => {
      setBackgroundColor('#112233')
      expect(backgroundColor.value).toBe('#112233')
    })

    it('setBackgroundColor can be set to any hex color', () => {
      setBackgroundColor('#ffffff')
      expect(backgroundColor.value).toBe('#ffffff')
    })
  })

  describe('currentRequestId', () => {
    it('starts as null', () => {
      expect(currentRequestId.value).toBeNull()
    })

    it('setCurrentRequestId updates currentRequestId.value', () => {
      setCurrentRequestId('req-123')
      expect(currentRequestId.value).toBe('req-123')
    })

    it('setCurrentRequestId(null) clears currentRequestId', () => {
      setCurrentRequestId('req-123')
      setCurrentRequestId(null)
      expect(currentRequestId.value).toBeNull()
    })

    it('generateRequestId creates unique IDs', () => {
      const id1 = generateRequestId()
      const id2 = generateRequestId()
      expect(id1).toMatch(/^req-\d+-[a-z0-9]+$/)
      expect(id2).toMatch(/^req-\d+-[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })

    it('events without request_id are processed when currentRequestId is set', () => {
      setCurrentRequestId('my-request')
      // Events without request_id should pass through (backward compatibility)
      handleBridgeEvent({ type: 'assistant', text: 'hello' })
      expect(messages.value).toHaveLength(1)
    })

    it('events are processed when currentRequestId is null', () => {
      // When no request is active, all events should be processed
      handleBridgeEvent({ type: 'assistant', text: 'hello' })
      expect(messages.value).toHaveLength(1)
    })
  })

  describe('formatErrorMessage', () => {
    it('converts exit status 143 to Interrupted', () => {
      expect(formatErrorMessage('claude exited: exit status 143')).toBe('Interrupted')
    })

    it('converts signal terminated to Interrupted', () => {
      expect(formatErrorMessage('claude exited: signal: terminated')).toBe('Interrupted')
    })

    it('converts exit status 1 to Process error', () => {
      expect(formatErrorMessage('claude exited: exit status 1')).toBe('Process error')
    })

    it('returns original text for unknown errors', () => {
      expect(formatErrorMessage('some other error')).toBe('some other error')
    })

    it('returns empty string for empty input', () => {
      expect(formatErrorMessage('')).toBe('')
    })

    it('handles case sensitivity correctly', () => {
      expect(formatErrorMessage('CLAUDE EXITED: EXIT STATUS 143')).toBe('CLAUDE EXITED: EXIT STATUS 143')
    })
  })

  describe('loadSessions', () => {
    const mockSessions: SessionInfo[] = [
      { id: 's1', summary: 'First session', first_message: 'Hello', timestamp: '2026-01-24T10:00:00Z', model: 'opus' },
      { id: 's2', summary: '', first_message: 'Build a feature', timestamp: '2026-01-24T09:00:00Z', model: 'sonnet' },
    ]

    it('sets sessionsLoading to true during load', async () => {
      let resolvePromise: (v: SessionInfo[]) => void
      const listFn = () => new Promise<SessionInfo[]>((resolve) => { resolvePromise = resolve })

      const promise = loadSessions(listFn)
      expect(sessionsLoading.value).toBe(true)

      resolvePromise!(mockSessions)
      await promise

      expect(sessionsLoading.value).toBe(false)
    })

    it('populates sessions on success', async () => {
      const listFn = vi.fn().mockResolvedValue(mockSessions)

      await loadSessions(listFn)

      expect(sessions.value).toEqual(mockSessions)
      expect(sessionsError.value).toBeNull()
    })

    it('sets sessionsError on failure', async () => {
      const listFn = vi.fn().mockRejectedValue(new Error('network error'))

      await loadSessions(listFn)

      expect(sessionsError.value).toBe('network error')
      expect(sessions.value).toEqual([])
    })

    it('sets sessionsError with string for non-Error rejections', async () => {
      const listFn = vi.fn().mockRejectedValue('string error')

      await loadSessions(listFn)

      expect(sessionsError.value).toBe('string error')
    })

    it('sets sessionsLoading to false after failure', async () => {
      const listFn = vi.fn().mockRejectedValue(new Error('fail'))

      await loadSessions(listFn)

      expect(sessionsLoading.value).toBe(false)
    })

    it('clears previous error on success', async () => {
      sessionsError.value = 'previous error'
      const listFn = vi.fn().mockResolvedValue(mockSessions)

      await loadSessions(listFn)

      expect(sessionsError.value).toBeNull()
    })
  })
})
