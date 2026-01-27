import type { BridgeEvent, SessionInfo } from './types'
import type { Backend, BackendEvents, BackendAdapter } from './backend'

export const MOCK_SESSIONS: SessionInfo[] = [
  {
    id: 'mock-session-001',
    summary: 'Refactored authentication module',
    first_message: 'Help me refactor the auth module to use JWT tokens',
    timestamp: '2026-01-24T09:15:00Z',
    model: 'claude-opus-4-5-20251101',
  },
  {
    id: 'mock-session-002',
    summary: 'Built REST API endpoints',
    first_message: 'Create CRUD endpoints for the user resource',
    timestamp: '2026-01-23T14:30:00Z',
    model: 'claude-sonnet-4-20250514',
  },
  {
    id: 'mock-session-003',
    summary: 'Fixed database migration issues',
    first_message: 'The migration for the sessions table is failing',
    timestamp: '2026-01-22T11:00:00Z',
    model: 'claude-opus-4-5-20251101',
  },
]

export const MOCK_RESPONSE_EVENTS: BridgeEvent[] = [
  { type: 'system', session_id: 'mock-session-001' },
  { type: 'assistant', thinking: 'Let me analyze the request and think about the best approach...' },
  { type: 'assistant', text: 'I will help you with that. Here is my analysis:\n\n' },
  { type: 'assistant', text: 'The implementation looks straightforward. Let me proceed with the changes.' },
  { type: 'assistant', tool_name: 'read_file', tool_input: '{"path": "src/main.ts"}' },
  { type: 'result', result: 'completed' },
]

type EventCallback = (event: BridgeEvent) => void

export class MockBackend implements BackendAdapter {
  private listeners: Set<EventCallback> = new Set()

  async sendPrompt(_text: string): Promise<void> {
    this.emitMockEvents()
  }

  async sendPromptWithSession(_text: string, _sessionId: string): Promise<void> {
    this.emitMockEvents()
  }

  async sendPromptWithRequestId(_text: string, requestId: string): Promise<void> {
    this.emitMockEventsWithRequestId(requestId)
  }

  async sendPromptWithSessionAndRequestId(_text: string, _sessionId: string, requestId: string): Promise<void> {
    this.emitMockEventsWithRequestId(requestId)
  }

  async cancelPrompt(): Promise<void> {
    this.emitDoneEvent()
  }

  async listSessions(): Promise<SessionInfo[]> {
    return MOCK_SESSIONS
  }

  onEvent(callback: EventCallback): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private emit(event: BridgeEvent): void {
    for (const cb of this.listeners) {
      cb(event)
    }
  }

  private emitMockEvents(): void {
    let delay = 50
    for (const event of MOCK_RESPONSE_EVENTS) {
      setTimeout(() => this.emit(event), delay)
      delay += 100
    }
  }

  private emitMockEventsWithRequestId(requestId: string): void {
    let delay = 50
    for (const event of MOCK_RESPONSE_EVENTS) {
      setTimeout(() => this.emit({ ...event, request_id: requestId }), delay)
      delay += 100
    }
  }

  private emitDoneEvent(): void {
    setTimeout(() => this.emit({ type: 'result', result: 'cancelled' }), 50)
  }
}
