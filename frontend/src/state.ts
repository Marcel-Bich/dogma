import { signal } from '@preact/signals'
import type { BridgeEvent, ChatMessage, MessageBlock, SessionInfo } from './types'

let idCounter = 0

function generateId(): string {
  return `msg-${++idCounter}-${Date.now()}`
}

export const messages = signal<ChatMessage[]>([])
export const loading = signal(false)
export const stoppable = signal(false)
export const error = signal<string | null>(null)
export const sessionId = signal<string | null>(null)

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

export function addMessage(msg: ChatMessage): void {
  messages.value = [...messages.value, msg]
}

export function handleBridgeEvent(event: BridgeEvent): void {
  switch (event.type) {
    case 'system':
      if (event.session_id) {
        sessionId.value = event.session_id
      }
      break

    case 'assistant': {
      if (!currentMessage || finalized) {
        currentMessage = {
          id: generateId(),
          role: 'assistant',
          blocks: [],
          timestamp: Date.now(),
        }
        finalized = false
      }

      const block = buildBlock(event)
      if (block) {
        currentMessage.blocks = [...currentMessage.blocks, block]
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
      if (event.is_error) {
        const block: MessageBlock = { type: 'error', content: event.result || '' }

        if (!currentMessage || finalized) {
          currentMessage = {
            id: generateId(),
            role: 'assistant',
            blocks: [],
            timestamp: Date.now(),
          }
          finalized = false
          currentMessage.blocks = [block]
          messages.value = [...messages.value, { ...currentMessage }]
        } else {
          currentMessage.blocks = [...currentMessage.blocks, block]
          const existing = messages.value.findIndex((m) => m.id === currentMessage!.id)
          if (existing >= 0) {
            const updated = [...messages.value]
            updated[existing] = { ...currentMessage }
            messages.value = updated
          }
        }
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
