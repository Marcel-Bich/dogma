import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/preact'
import { MessageBlockView, parseMarkdown } from './MessageBlock'
import type { MessageBlock } from '../types'

describe('parseMarkdown', () => {
  it('parses bold text', () => {
    const result = parseMarkdown('**bold**')
    expect(result).toContain('<strong>')
    expect(result).toContain('bold')
  })

  it('parses italic text', () => {
    const result = parseMarkdown('*italic*')
    expect(result).toContain('<em>')
    expect(result).toContain('italic')
  })

  it('parses code blocks', () => {
    const result = parseMarkdown('```\ncode\n```')
    expect(result).toContain('<pre>')
    expect(result).toContain('<code') // code has class attribute from hljs
  })

  it('parses inline code', () => {
    const result = parseMarkdown('`inline`')
    expect(result).toContain('<code>')
    expect(result).toContain('inline')
  })

  it('parses lists', () => {
    const result = parseMarkdown('- item 1\n- item 2')
    expect(result).toContain('<ul>')
    expect(result).toContain('<li>')
  })

  it('sanitizes script tags via DOMPurify', () => {
    const result = parseMarkdown('<script>alert(1)</script>')
    expect(result).not.toContain('<script>')
  })

  it('sanitizes onclick handlers via DOMPurify', () => {
    const result = parseMarkdown('<button onclick="alert(1)">click</button>')
    expect(result).not.toContain('onclick')
  })

  it('sanitizes javascript: URLs via DOMPurify', () => {
    const result = parseMarkdown('<a href="javascript:alert(1)">link</a>')
    expect(result).not.toContain('javascript:')
  })

  it('preserves safe HTML', () => {
    const result = parseMarkdown('Hello **world**')
    expect(result).toContain('<strong>world</strong>')
  })
})

describe('MessageBlockView', () => {
  describe('text block', () => {
    it('renders text content', () => {
      const block: MessageBlock = { type: 'text', content: 'Hello world' }
      const { getByText } = render(<MessageBlockView block={block} />)
      expect(getByText('Hello world')).toBeTruthy()
    })

    it('applies markdown-content class', () => {
      const block: MessageBlock = { type: 'text', content: 'plain text' }
      const { container } = render(<MessageBlockView block={block} />)
      const el = container.firstElementChild as HTMLElement
      expect(el.className).toContain('markdown-content')
    })

    it('renders markdown bold text', () => {
      const block: MessageBlock = { type: 'text', content: '**bold text**' }
      const { container } = render(<MessageBlockView block={block} />)
      const strong = container.querySelector('strong')
      expect(strong).toBeTruthy()
      expect(strong!.textContent).toBe('bold text')
    })

    it('renders markdown code blocks', () => {
      const block: MessageBlock = { type: 'text', content: '```js\nconst x = 1\n```' }
      const { container } = render(<MessageBlockView block={block} />)
      expect(container.querySelector('pre')).toBeTruthy()
      expect(container.querySelector('code')).toBeTruthy()
    })

    it('renders markdown lists', () => {
      const block: MessageBlock = { type: 'text', content: '- item 1\n- item 2' }
      const { container } = render(<MessageBlockView block={block} />)
      expect(container.querySelector('ul')).toBeTruthy()
      expect(container.querySelectorAll('li').length).toBe(2)
    })

    it('copies original markdown content on copy event', () => {
      const originalMarkdown = '**bold text** and *italic*'
      const block: MessageBlock = { type: 'text', content: originalMarkdown }
      const { container } = render(<MessageBlockView block={block} />)
      const el = container.firstElementChild as HTMLElement

      const clipboardData = {
        setData: vi.fn(),
      }
      const copyEvent = new Event('copy', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent
      Object.defineProperty(copyEvent, 'clipboardData', { value: clipboardData })
      const preventDefaultSpy = vi.spyOn(copyEvent, 'preventDefault')

      el.dispatchEvent(copyEvent)

      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', originalMarkdown)
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

    it('applies error-block class for styling', () => {
      const block: MessageBlock = { type: 'error', content: 'fail' }
      const { container } = render(<MessageBlockView block={block} />)
      const el = container.firstElementChild as HTMLElement
      expect(el.className).toContain('error-block')
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
