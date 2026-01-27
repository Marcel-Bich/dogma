import type { BridgeEvent, SessionInfo } from './types'
import type { Backend, BackendEvents, BackendAdapter } from './backend'

// Mock types for different screenshot scenarios
// 'echo' mode returns the user input as assistant response - perfect for custom screenshots
export type MockType = 'default' | 'echo' | 'markdown' | 'checkbox' | 'code' | 'thinking' | 'tool' | 'error' | 'long'

export function getMockType(): MockType {
  if (typeof window === 'undefined') return 'default'
  const params = new URLSearchParams(window.location.search)
  const mockParam = params.get('mock')
  if (mockParam && ['default', 'echo', 'markdown', 'checkbox', 'code', 'thinking', 'tool', 'error', 'long'].includes(mockParam)) {
    return mockParam as MockType
  }
  return 'default'
}

// Response templates for different mock types
export const MOCK_RESPONSES: Record<MockType, BridgeEvent[]> = {
  default: [
    { type: 'system', session_id: 'mock-session-001' },
    { type: 'assistant', text: 'I will help you with that task.' },
    { type: 'result', result: 'completed' },
  ],

  // Echo mode is handled dynamically in createMockBackend - returns user input as response
  echo: [
    { type: 'system', session_id: 'mock-session-001' },
    { type: 'assistant', text: '' }, // Placeholder - actual text set dynamically
    { type: 'result', result: 'completed' },
  ],

  markdown: [
    { type: 'system', session_id: 'mock-session-001' },
    { type: 'assistant', text: '# Markdown Rendering Demo\n\nHere is some **bold text** and *italic text*.\n\n## Features\n\n- Bullet point one\n- Bullet point two\n- Bullet point three\n\n### Code Example\n\nInline `code` looks like this.\n\n> This is a blockquote with important information.\n\n1. First ordered item\n2. Second ordered item\n3. Third ordered item' },
    { type: 'result', result: 'completed' },
  ],

  checkbox: [
    { type: 'system', session_id: 'mock-session-001' },
    { type: 'assistant', text: '## Task Checklist\n\nHere are the tasks to complete:\n\n- [ ] First unchecked item\n- [x] Second item is completed\n- [ ] Third item pending\n- [x] Fourth item done\n- [ ] Fifth item to do' },
    { type: 'result', result: 'completed' },
  ],

  code: [
    { type: 'system', session_id: 'mock-session-001' },
    { type: 'assistant', text: 'Here is the TypeScript implementation:\n\n```typescript\ninterface User {\n  id: string\n  name: string\n  email: string\n}\n\nfunction createUser(name: string, email: string): User {\n  return {\n    id: crypto.randomUUID(),\n    name,\n    email,\n  }\n}\n\nconst user = createUser("Alice", "alice@example.com")\nconsole.log(user)\n```\n\nAnd here is some Python code:\n\n```python\ndef fibonacci(n: int) -> int:\n    if n <= 1:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)\n\nresult = fibonacci(10)\nprint(f"Result: {result}")\n```' },
    { type: 'result', result: 'completed' },
  ],

  thinking: [
    { type: 'system', session_id: 'mock-session-001' },
    { type: 'assistant', thinking: 'Let me think about this problem carefully.\n\nFirst, I need to understand the requirements:\n1. The user wants to implement a feature\n2. This feature needs to handle edge cases\n3. Performance is important\n\nPossible approaches:\n- Approach A: Simple but slower\n- Approach B: Complex but faster\n- Approach C: Balanced solution\n\nI think Approach C is the best because it balances complexity and performance. Let me outline the implementation steps...' },
    { type: 'assistant', text: 'After careful consideration, here is my recommendation:\n\nI suggest using a balanced approach that prioritizes maintainability while still being performant.' },
    { type: 'result', result: 'completed' },
  ],

  tool: [
    { type: 'system', session_id: 'mock-session-001' },
    { type: 'assistant', text: 'I will read the file to understand the current implementation.' },
    { type: 'assistant', tool_name: 'Read', tool_input: '{"file_path": "/home/user/project/src/main.ts"}' },
    { type: 'assistant', text: 'Now I will make the necessary changes.' },
    { type: 'assistant', tool_name: 'Edit', tool_input: '{"file_path": "/home/user/project/src/main.ts", "old_string": "const x = 1", "new_string": "const x = 2"}' },
    { type: 'result', result: 'completed' },
  ],

  error: [
    { type: 'system', session_id: 'mock-session-001' },
    { type: 'assistant', text: 'I will attempt to execute the command.' },
    { type: 'assistant', tool_name: 'Bash', tool_input: '{"command": "npm run build"}' },
    { type: 'assistant', is_error: true, text: 'Error: Command failed with exit code 1\n\nBuild error: TypeScript compilation failed\n- src/index.ts(15,3): error TS2322: Type string is not assignable to type number\n- src/utils.ts(8,10): error TS2345: Argument of type undefined is not assignable' },
    { type: 'result', result: 'completed' },
  ],

  long: [
    { type: 'system', session_id: 'mock-session-001' },
    { type: 'assistant', text: '# Comprehensive Analysis\n\n## Introduction\n\nThis document provides a detailed analysis of the current system architecture and proposes several improvements.\n\n## Current State\n\nThe existing implementation has served us well, but there are areas where we can improve:\n\n1. **Performance**: The current approach uses synchronous operations which block the main thread.\n2. **Scalability**: The monolithic structure makes it difficult to scale individual components.\n3. **Maintainability**: Code is tightly coupled, making changes risky.\n\n## Proposed Changes\n\n### Phase 1: Refactoring\n\nWe should start by extracting core logic into separate modules:\n\n- Authentication module\n- Data processing module\n- UI rendering module\n\n### Phase 2: Optimization\n\nAfter refactoring, we can focus on performance:\n\n- Implement lazy loading\n- Add caching layer\n- Use web workers for heavy computations\n\n### Phase 3: Testing\n\nFinally, we need comprehensive tests:\n\n- Unit tests for all modules\n- Integration tests for API endpoints\n- E2E tests for critical user flows\n\n## Conclusion\n\nBy following this plan, we can significantly improve the system while minimizing risk.' },
    { type: 'result', result: 'completed' },
  ],
}

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

// Legacy export for backwards compatibility
export const MOCK_RESPONSE_EVENTS: BridgeEvent[] = MOCK_RESPONSES.default

type EventCallback = (event: BridgeEvent) => void

export class MockBackend implements BackendAdapter {
  private listeners: Set<EventCallback> = new Set()

  async sendPrompt(text: string): Promise<void> {
    this.emitMockEvents(text)
  }

  async sendPromptWithSession(text: string, _sessionId: string): Promise<void> {
    this.emitMockEvents(text)
  }

  async sendPromptWithRequestId(text: string, requestId: string): Promise<void> {
    this.emitMockEventsWithRequestId(text, requestId)
  }

  async sendPromptWithSessionAndRequestId(text: string, _sessionId: string, requestId: string): Promise<void> {
    this.emitMockEventsWithRequestId(text, requestId)
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

  private emitMockEvents(inputText: string): void {
    const mockType = getMockType()

    // Echo mode: return the input as assistant response
    if (mockType === 'echo') {
      const echoEvents: BridgeEvent[] = [
        { type: 'system', session_id: 'mock-session-001' },
        { type: 'assistant', text: inputText },
        { type: 'result', result: 'completed' },
      ]
      let delay = 50
      for (const event of echoEvents) {
        setTimeout(() => this.emit(event), delay)
        delay += 100
      }
      return
    }

    const events = MOCK_RESPONSES[mockType]
    let delay = 50
    for (const event of events) {
      setTimeout(() => this.emit(event), delay)
      delay += 100
    }
  }

  private emitMockEventsWithRequestId(inputText: string, requestId: string): void {
    const mockType = getMockType()

    // Echo mode: return the input as assistant response
    if (mockType === 'echo') {
      const echoEvents: BridgeEvent[] = [
        { type: 'system', session_id: 'mock-session-001' },
        { type: 'assistant', text: inputText },
        { type: 'result', result: 'completed' },
      ]
      let delay = 50
      for (const event of echoEvents) {
        setTimeout(() => this.emit({ ...event, request_id: requestId }), delay)
        delay += 100
      }
      return
    }

    const events = MOCK_RESPONSES[mockType]
    let delay = 50
    for (const event of events) {
      setTimeout(() => this.emit({ ...event, request_id: requestId }), delay)
      delay += 100
    }
  }

  private emitDoneEvent(): void {
    setTimeout(() => this.emit({ type: 'result', result: 'cancelled' }), 50)
  }
}
