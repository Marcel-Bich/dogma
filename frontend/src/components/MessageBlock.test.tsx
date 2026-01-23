import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/preact'
import { MessageBlockView } from './MessageBlock'
import type { MessageBlock } from '../types'

describe('MessageBlockView', () => {
  describe('text block', () => {
    it('renders text content', () => {
      const block: MessageBlock = { type: 'text', content: 'Hello world' }
      const { getByText } = render(<MessageBlockView block={block} />)
      expect(getByText('Hello world')).toBeTruthy()
    })

    it('applies no italic or error styling', () => {
      const block: MessageBlock = { type: 'text', content: 'plain text' }
      const { container } = render(<MessageBlockView block={block} />)
      const el = container.firstElementChild as HTMLElement
      expect(el.className).not.toContain('italic')
      expect(el.className).not.toContain('red')
    })
  })

  describe('thinking block', () => {
    it('renders thinking content', () => {
      const block: MessageBlock = { type: 'thinking', content: 'Let me consider...' }
      const { getByText } = render(<MessageBlockView block={block} />)
      expect(getByText('Let me consider...')).toBeTruthy()
    })

    it('applies italic styling', () => {
      const block: MessageBlock = { type: 'thinking', content: 'pondering' }
      const { container } = render(<MessageBlockView block={block} />)
      const el = container.firstElementChild as HTMLElement
      expect(el.className).toContain('italic')
    })

    it('applies muted color', () => {
      const block: MessageBlock = { type: 'thinking', content: 'hmm' }
      const { container } = render(<MessageBlockView block={block} />)
      const el = container.firstElementChild as HTMLElement
      expect(el.className).toContain('text-gray-400')
    })
  })

  describe('tool_use block', () => {
    it('renders tool name', () => {
      const block: MessageBlock = {
        type: 'tool_use',
        content: 'read_file',
        toolName: 'read_file',
        toolInput: '{"path": "/foo.txt"}',
      }
      const { getByText } = render(<MessageBlockView block={block} />)
      expect(getByText('read_file')).toBeTruthy()
    })

    it('renders tool input in code block', () => {
      const block: MessageBlock = {
        type: 'tool_use',
        content: 'bash',
        toolName: 'bash',
        toolInput: '{"cmd": "ls -la"}',
      }
      const { container } = render(<MessageBlockView block={block} />)
      const codeEl = container.querySelector('code')
      expect(codeEl).toBeTruthy()
      expect(codeEl!.textContent).toBe('{"cmd": "ls -la"}')
    })

    it('applies monospace styling to code', () => {
      const block: MessageBlock = {
        type: 'tool_use',
        content: 'bash',
        toolName: 'bash',
        toolInput: '{}',
      }
      const { container } = render(<MessageBlockView block={block} />)
      const codeEl = container.querySelector('code')
      expect(codeEl!.className).toContain('font-mono')
    })
  })

  describe('result block', () => {
    it('renders result content', () => {
      const block: MessageBlock = { type: 'result', content: 'Operation complete' }
      const { getByText } = render(<MessageBlockView block={block} />)
      expect(getByText('Operation complete')).toBeTruthy()
    })

    it('applies green accent', () => {
      const block: MessageBlock = { type: 'result', content: 'done' }
      const { container } = render(<MessageBlockView block={block} />)
      const el = container.firstElementChild as HTMLElement
      expect(el.className).toContain('text-green')
    })
  })

  describe('error block', () => {
    it('renders error content', () => {
      const block: MessageBlock = { type: 'error', content: 'Something failed' }
      const { getByText } = render(<MessageBlockView block={block} />)
      expect(getByText('Something failed')).toBeTruthy()
    })

    it('applies red error styling', () => {
      const block: MessageBlock = { type: 'error', content: 'fail' }
      const { container } = render(<MessageBlockView block={block} />)
      const el = container.firstElementChild as HTMLElement
      expect(el.className).toContain('text-red-400')
    })
  })

  describe('unknown block type', () => {
    it('renders nothing for unknown type', () => {
      const block = { type: 'unknown', content: 'mystery' } as unknown as MessageBlock
      const { container } = render(<MessageBlockView block={block} />)
      expect(container.innerHTML).toBe('')
    })
  })
})
