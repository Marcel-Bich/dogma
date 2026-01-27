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
      expect(getByText('Awaiting commands')).toBeTruthy()
    })

    it('shows DOGMA branding in empty state pulse ring', () => {
      const { getByTestId } = render(
        <MessageList messages={[]} loading={false} />
      )
      const title = getByTestId('app-title')
      expect(title).toBeTruthy()
      expect(title.textContent).toBe('DOGMA')
    })

    it('does not show DOGMA branding when messages exist', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          blocks: [{ type: 'text', content: 'hello' }],
          timestamp: 1000,
        },
      ]
      const { queryByTestId } = render(
        <MessageList messages={messages} loading={false} />
      )
      expect(queryByTestId('app-title')).toBeNull()
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
      expect(queryByText('Awaiting commands')).toBeNull()
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

    it('shows role for user messages', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          blocks: [{ type: 'text', content: 'user input' }],
          timestamp: 1000,
        },
      ]
      const { container } = render(
        <MessageList messages={messages} loading={false} />
      )
      const roleEl = container.querySelector('[data-role="user"]')
      expect(roleEl).toBeTruthy()
    })
  })

  describe('message styling by role', () => {
    it('applies message-user class to user messages', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          blocks: [{ type: 'text', content: 'hello' }],
          timestamp: 1000,
        },
      ]
      const { container } = render(
        <MessageList messages={messages} loading={false} />
      )
      const userMsg = container.querySelector('.message-user')
      expect(userMsg).toBeTruthy()
    })

    it('applies message-assistant class to assistant messages', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          blocks: [{ type: 'text', content: 'hello' }],
          timestamp: 1000,
        },
      ]
      const { container } = render(
        <MessageList messages={messages} loading={false} />
      )
      const assistantMsg = container.querySelector('.message-assistant')
      expect(assistantMsg).toBeTruthy()
    })

    it('applies message-system class to system messages', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'system',
          blocks: [{ type: 'text', content: 'info' }],
          timestamp: 1000,
        },
      ]
      const { container } = render(
        <MessageList messages={messages} loading={false} />
      )
      const systemMsg = container.querySelector('.message-system')
      expect(systemMsg).toBeTruthy()
    })

    it('renders user and assistant messages with different styling', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          blocks: [{ type: 'text', content: 'user question' }],
          timestamp: 1000,
        },
        {
          id: 'msg-2',
          role: 'assistant',
          blocks: [{ type: 'text', content: 'assistant reply' }],
          timestamp: 2000,
        },
      ]
      const { container } = render(
        <MessageList messages={messages} loading={false} />
      )
      expect(container.querySelector('.message-user')).toBeTruthy()
      expect(container.querySelector('.message-assistant')).toBeTruthy()
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

    it('shows centered loading indicator when no messages', () => {
      const { container } = render(
        <MessageList messages={[]} loading={true} />
      )
      const loadingEl = container.querySelector('[data-testid="loading-indicator"]')
      expect(loadingEl).toBeTruthy()
      // Should have h-full for centering
      expect(loadingEl?.className).toContain('h-full')
    })

    it('shows sticky loading indicator when messages exist', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          blocks: [{ type: 'text', content: 'hello' }],
          timestamp: 1000,
        },
      ]
      const { container } = render(
        <MessageList messages={messages} loading={true} />
      )
      const loadingEl = container.querySelector('[data-testid="loading-indicator"]')
      expect(loadingEl).toBeTruthy()
      // Should have sticky class for floating at top
      expect(loadingEl?.className).toContain('loading-indicator-sticky')
    })

    it('shows full DOGMA loading indicator when messages exist and loading', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          blocks: [{ type: 'text', content: 'hello' }],
          timestamp: 1000,
        },
      ]
      const { container, getByText } = render(
        <MessageList messages={messages} loading={true} />
      )
      // Should have full DOGMA branding in sticky indicator
      expect(getByText('DOGMA')).toBeTruthy()
      // Should have the 140px container with pulse rings
      const loadingIndicator = container.querySelector('.loading-indicator-sticky')
      expect(loadingIndicator).toBeTruthy()
      const ringContainer = loadingIndicator?.querySelector('[style*="width: 140px"]')
      expect(ringContainer).toBeTruthy()
    })

    it('shows loading when stoppable=true even if loading=false', () => {
      const { container } = render(
        <MessageList messages={[]} loading={false} stoppable={true} />
      )
      const loadingEl = container.querySelector('[data-testid="loading-indicator"]')
      expect(loadingEl).toBeTruthy()
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
