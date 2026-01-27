import { signal } from '@preact/signals'
import type { BridgeEvent, ChatMessage, MessageBlock, SessionInfo } from './types'

let idCounter = 0

export function generateId(): string {
  return `msg-${++idCounter}-${Date.now()}`
}

export const messages = signal<ChatMessage[]>([])
export const loading = signal(false)
export const stoppable = signal(false)
export const error = signal<string | null>(null)
export const sessionId = signal<string | null>(null)
export const currentRequestId = signal<string | null>(null)

export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export const sessions = signal<SessionInfo[]>([])
export const sessionsLoading = signal(false)
export const sessionsError = signal<string | null>(null)

export const menuOpen = signal(false)
export const settingsOpen = signal(false)
export const activeThemeId = signal<string>('arctic-pro')
export const customAccent = signal<string | null>(null)
export const intensity = signal(50)
export const spellCheck = signal(false)
export const backgroundColor = signal('#000000')

let currentMessage: ChatMessage | null = null
let finalized = false

export function formatErrorMessage(rawError: string): string {
  if (rawError === '') return ''
  if (rawError === 'claude exited: exit status 143') return 'Interrupted'
  if (rawError === 'claude exited: signal: terminated') return 'Interrupted'
  if (rawError === 'claude exited: exit status 1') return 'Process error'
  return rawError
}

export function addMessage(msg: ChatMessage): void {
  messages.value = [...messages.value, msg]
}

export function setCurrentRequestId(id: string | null): void {
  currentRequestId.value = id
}

export function handleBridgeEvent(event: BridgeEvent): void {
  // Filter events by request_id - only process events for our current request
  if (event.request_id && currentRequestId.value && event.request_id !== currentRequestId.value) {
    console.log('[STATE] Event FILTERED - event request:', event.request_id, 'my request:', currentRequestId.value)
    return
  }

  switch (event.type) {
    case 'system':
      console.log('[STATE] system event - session_id:', event.session_id, 'model:', event.model, 'request_id:', event.request_id)
      if (event.session_id) {
        sessionId.value = event.session_id
      }
      break

    case 'assistant': {
      const blockType = event.thinking ? 'thinking' : event.tool_name ? 'tool_use' : event.text ? 'text' : 'unknown'
      console.log('[STATE] assistant event - blockType:', blockType, event.tool_name ? `tool: ${event.tool_name}` : '', event.text ? `text: ${event.text.substring(0, 50)}...` : '')

      if (!currentMessage || finalized) {
        currentMessage = {
          id: generateId(),
          role: 'assistant',
          blocks: [],
          timestamp: Date.now(),
        }
        finalized = false
        console.log('[STATE] Created new assistant message:', currentMessage.id)
      }

      const block = buildBlock(event)
      if (block) {
        currentMessage.blocks = [...currentMessage.blocks, block]
        console.log('[STATE] Added block:', block.type, 'total blocks:', currentMessage.blocks.length)
      }

      // Update messages array reactively
      const existing = messages.value.findIndex((m) => m.id === currentMessage!.id)
      if (existing >= 0) {
        const updated = [...messages.value]
        updated[existing] = { ...currentMessage }
        messages.value = updated
      } else {
        messages.value = [...messages.value, { ...currentMessage }]
      }
      break
    }

    case 'result': {
      console.log('[STATE] result event - is_error:', event.is_error, 'result:', event.result?.substring(0, 100))
      if (event.is_error) {
        const formattedError = formatErrorMessage(event.result || '')
        const block: MessageBlock = { type: 'error', content: formattedError }

        // ALWAYS create a new message for errors to guarantee chronological order
        // This prevents race conditions where error appears before user prompt
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          blocks: [block],
          timestamp: Date.now(),
        }
        messages.value = [...messages.value, errorMessage]
      }
      finalized = true
      break
    }
  }
}

function buildBlock(event: BridgeEvent): MessageBlock | null {
  if (event.thinking) {
    return { type: 'thinking', content: event.thinking }
  }
  if (event.tool_name) {
    return {
      type: 'tool_use',
      content: event.tool_name,
      toolName: event.tool_name,
      toolInput: event.tool_input || '',
    }
  }
  if (event.text) {
    return { type: 'text', content: event.text }
  }
  return null
}

export function setLoading(value: boolean): void {
  loading.value = value
}

export function setStoppable(value: boolean): void {
  stoppable.value = value
}

export function setError(value: string | null): void {
  error.value = value
}

export function setMenuOpen(value: boolean): void {
  menuOpen.value = value
}

export function setSettingsOpen(value: boolean): void {
  settingsOpen.value = value
}

export function setActiveTheme(id: string): void {
  activeThemeId.value = id
}

export function setCustomAccent(hex: string | null): void {
  customAccent.value = hex
}

export function setIntensity(val: number): void {
  intensity.value = val
}

export function setSpellCheck(value: boolean): void {
  spellCheck.value = value
}

export function setBackgroundColor(value: string): void {
  backgroundColor.value = value
}

export async function loadSessions(listFn: () => Promise<SessionInfo[]>): Promise<void> {
  sessionsLoading.value = true
  try {
    const result = await listFn()
    sessions.value = result
    sessionsError.value = null
  } catch (err: unknown) {
    sessionsError.value = err instanceof Error ? err.message : String(err)
  } finally {
    sessionsLoading.value = false
  }
}

export function resetState(): void {
  messages.value = []
  loading.value = false
  stoppable.value = false
  error.value = null
  sessionId.value = null
  currentRequestId.value = null
  sessions.value = []
  sessionsLoading.value = false
  sessionsError.value = null
  menuOpen.value = false
  settingsOpen.value = false
  activeThemeId.value = 'arctic-pro'
  customAccent.value = null
  intensity.value = 50
  spellCheck.value = false
  backgroundColor.value = '#000000'
  currentMessage = null
  finalized = false
  idCounter = 0
}
