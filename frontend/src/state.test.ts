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
  resetState,
  loadSessions,
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

    it('with type="result" + is_error=true creates ErrorBlock', () => {
      const assistantEvent: BridgeEvent = { type: 'assistant', text: 'trying...' }
      handleBridgeEvent(assistantEvent)

      const errorEvent: BridgeEvent = {
        type: 'result',
        result: 'something failed',
        is_error: true,
      }
      handleBridgeEvent(errorEvent)
      expect(messages.value).toHaveLength(1)
      const blocks = messages.value[0].blocks
      expect(blocks[blocks.length - 1]).toEqual({
        type: 'error',
        content: 'something failed',
      })
    })

    it('with type="system" sets sessionId signal', () => {
      const event: BridgeEvent = {
        type: 'system',
        session_id: 'sess-abc-123',
      }
      handleBridgeEvent(event)
      expect(sessionId.value).toBe('sess-abc-123')
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
      handleBridgeEvent({ type: 'system', session_id: 'initial' })
      handleBridgeEvent({ type: 'system' })
      expect(sessionId.value).toBe('initial')
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
      handleBridgeEvent({ type: 'system', session_id: 'sess-1' })

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

      resetState()

      expect(menuOpen.value).toBe(false)
      expect(settingsOpen.value).toBe(false)
      expect(activeThemeId.value).toBe('arctic-pro')
      expect(customAccent.value).toBeNull()
      expect(intensity.value).toBe(50)
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
