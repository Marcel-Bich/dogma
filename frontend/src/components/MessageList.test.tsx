import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/preact'
import { MessageList } from './MessageList'
import type { ChatMessage } from '../types'

describe('MessageList', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // jsdom does not implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()
  })

  describe('empty state', () => {
    it('renders empty state text when no messages', () => {
      const { getByText } = render(
        <MessageList messages={[]} loading={false} />
      )
      expect(getByText('Send a prompt to start')).toBeTruthy()
    })

    it('does not render empty state when messages exist', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          blocks: [{ type: 'text', content: 'hello' }],
          timestamp: 1000,
        },
      ]
      const { queryByText } = render(
        <MessageList messages={messages} loading={false} />
      )
      expect(queryByText('Send a prompt to start')).toBeNull()
    })
  })

  describe('message rendering', () => {
    it('renders multiple messages with their blocks', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          blocks: [{ type: 'text', content: 'First message' }],
          timestamp: 1000,
        },
        {
          id: 'msg-2',
          role: 'assistant',
          blocks: [
            { type: 'thinking', content: 'Let me think' },
            { type: 'text', content: 'Second message' },
          ],
          timestamp: 2000,
        },
      ]
      const { getByText } = render(
        <MessageList messages={messages} loading={false} />
      )
      expect(getByText('First message')).toBeTruthy()
      expect(getByText('Let me think')).toBeTruthy()
      expect(getByText('Second message')).toBeTruthy()
    })

    it('renders all block types within a message', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          blocks: [
            { type: 'text', content: 'some text' },
            { type: 'tool_use', content: 'bash', toolName: 'bash', toolInput: '{"cmd":"ls"}' },
            { type: 'result', content: 'done' },
            { type: 'error', content: 'oops' },
          ],
          timestamp: 1000,
        },
      ]
      const { getByText } = render(
        <MessageList messages={messages} loading={false} />
      )
      expect(getByText('some text')).toBeTruthy()
      expect(getByText('bash')).toBeTruthy()
      expect(getByText('done')).toBeTruthy()
      expect(getByText('oops')).toBeTruthy()
    })
  })

  describe('role indicator', () => {
    it('shows role for assistant messages', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          blocks: [{ type: 'text', content: 'hi' }],
          timestamp: 1000,
        },
      ]
      const { container } = render(
        <MessageList messages={messages} loading={false} />
      )
      const roleEl = container.querySelector('[data-role="assistant"]')
      expect(roleEl).toBeTruthy()
    })

    it('shows role for system messages', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'system',
          blocks: [{ type: 'text', content: 'system info' }],
          timestamp: 1000,
        },
      ]
      const { container } = render(
        <MessageList messages={messages} loading={false} />
      )
      const roleEl = container.querySelector('[data-role="system"]')
      expect(roleEl).toBeTruthy()
    })
  })

  describe('loading indicator', () => {
    it('shows loading indicator when loading=true', () => {
      const { container } = render(
        <MessageList messages={[]} loading={true} />
      )
      const loadingEl = container.querySelector('[data-testid="loading-indicator"]')
      expect(loadingEl).toBeTruthy()
    })

    it('hides loading indicator when loading=false', () => {
      const { container } = render(
        <MessageList messages={[]} loading={false} />
      )
      const loadingEl = container.querySelector('[data-testid="loading-indicator"]')
      expect(loadingEl).toBeNull()
    })
  })

  describe('auto-scroll', () => {
    it('scrolls to bottom when messages change', () => {
      const scrollIntoViewMock = vi.fn()
      // Mock scrollIntoView on Element prototype
      Element.prototype.scrollIntoView = scrollIntoViewMock

      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          blocks: [{ type: 'text', content: 'hello' }],
          timestamp: 1000,
        },
      ]
      render(<MessageList messages={messages} loading={false} />)
      expect(scrollIntoViewMock).toHaveBeenCalled()
    })

    it('scrolls again when new message is added', () => {
      const scrollIntoViewMock = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoViewMock

      const messages1: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          blocks: [{ type: 'text', content: 'first' }],
          timestamp: 1000,
        },
      ]
      const { rerender } = render(
        <MessageList messages={messages1} loading={false} />
      )

      const messages2: ChatMessage[] = [
        ...messages1,
        {
          id: 'msg-2',
          role: 'assistant',
          blocks: [{ type: 'text', content: 'second' }],
          timestamp: 2000,
        },
      ]
      rerender(<MessageList messages={messages2} loading={false} />)
      expect(scrollIntoViewMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('layout', () => {
    it('has overflow-y-auto on container', () => {
      const { container } = render(
        <MessageList messages={[]} loading={false} />
      )
      const el = container.firstElementChild as HTMLElement
      expect(el.className).toContain('overflow-y-auto')
    })

    it('has flex-col layout', () => {
      const { container } = render(
        <MessageList messages={[]} loading={false} />
      )
      const el = container.firstElementChild as HTMLElement
      expect(el.className).toContain('flex')
      expect(el.className).toContain('flex-col')
    })
  })
})
