import { signal } from '@preact/signals'
import type { BridgeEvent, ChatMessage, MessageBlock } from './types'

let idCounter = 0

function generateId(): string {
  return `msg-${++idCounter}-${Date.now()}`
}

export const messages = signal<ChatMessage[]>([])
export const loading = signal(false)
export const error = signal<string | null>(null)
export const sessionId = signal<string | null>(null)

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
      const block: MessageBlock = event.is_error
        ? { type: 'error', content: event.result || '' }
        : { type: 'result', content: event.result || '' }

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

export function setError(value: string | null): void {
  error.value = value
}

export function resetState(): void {
  messages.value = []
  loading.value = false
  error.value = null
  sessionId.value = null
  currentMessage = null
  finalized = false
  idCounter = 0
}
