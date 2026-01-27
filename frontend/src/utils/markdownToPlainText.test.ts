import { describe, it, expect } from 'vitest'
import {
  markdownToPlainText,
  processTokensForTest,
  processInlineTokensForTest,
  processListItemTokensForTest,
} from './markdownToPlainText'

describe('markdownToPlainText', () => {
  describe('headings', () => {
    it('converts headings to plain text with double newline', () => {
      expect(markdownToPlainText('# H1\n## H2')).toBe('H1\n\nH2')
    })

    it('handles all heading levels', () => {
      expect(markdownToPlainText('# H1')).toBe('H1')
      expect(markdownToPlainText('## H2')).toBe('H2')
      expect(markdownToPlainText('### H3')).toBe('H3')
      expect(markdownToPlainText('#### H4')).toBe('H4')
      expect(markdownToPlainText('##### H5')).toBe('H5')
      expect(markdownToPlainText('###### H6')).toBe('H6')
    })
  })

  describe('paragraphs', () => {
    it('preserves paragraph separation', () => {
      expect(markdownToPlainText('Absatz eins\n\nAbsatz zwei')).toBe('Absatz eins\n\nAbsatz zwei')
    })

    it('handles single paragraph', () => {
      expect(markdownToPlainText('Single paragraph')).toBe('Single paragraph')
    })
  })

  describe('code blocks', () => {
    it('outputs code blocks without indentation', () => {
      expect(markdownToPlainText('```js\ncode\n```')).toBe('code')
    })

    it('handles multi-line code blocks', () => {
      expect(markdownToPlainText('```\nline1\nline2\n```')).toBe('line1\nline2')
    })

    it('handles code blocks without language', () => {
      expect(markdownToPlainText('```\ncode\n```')).toBe('code')
    })
  })

  describe('inline code', () => {
    it('removes backticks from inline code', () => {
      expect(markdownToPlainText('Text `code` mehr')).toBe('Text code mehr')
    })

    it('handles multiple inline code spans', () => {
      expect(markdownToPlainText('Use `const` and `let`')).toBe('Use const and let')
    })
  })

  describe('unordered lists', () => {
    it('preserves unordered list format', () => {
      expect(markdownToPlainText('- Item 1\n- Item 2')).toBe('- Item 1\n- Item 2')
    })

    it('handles asterisk lists', () => {
      expect(markdownToPlainText('* Item 1\n* Item 2')).toBe('- Item 1\n- Item 2')
    })
  })

  describe('ordered lists', () => {
    it('preserves ordered list format', () => {
      expect(markdownToPlainText('1. First\n2. Second')).toBe('1. First\n2. Second')
    })

    it('handles continuation numbering', () => {
      expect(markdownToPlainText('1. First\n2. Second\n3. Third')).toBe('1. First\n2. Second\n3. Third')
    })
  })

  describe('tables', () => {
    it('converts tables to CSV format with semicolon delimiter', () => {
      expect(markdownToPlainText('| A | B |\n|---|---|\n| 1 | 2 |')).toBe('"A";"B"\n1;2')
    })

    it('handles multi-row tables with quoted non-numbers', () => {
      const input = '| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |'
      expect(markdownToPlainText(input)).toBe('"Name";"Age"\n"Alice";30\n"Bob";25')
    })

    it('handles tables with mixed content', () => {
      const input = '| Item | Price | Qty |\n|------|-------|-----|\n| Apple | 1.50 | 10 |'
      expect(markdownToPlainText(input)).toBe('"Item";"Price";"Qty"\n"Apple";1.50;10')
    })
  })

  describe('blockquotes', () => {
    it('preserves blockquote format', () => {
      expect(markdownToPlainText('> Quote')).toBe('> Quote')
    })

    it('handles multi-line blockquotes', () => {
      expect(markdownToPlainText('> Line 1\n> Line 2')).toBe('> Line 1\n> Line 2')
    })
  })

  describe('links', () => {
    it('shows link text with URL', () => {
      expect(markdownToPlainText('[Link](https://example.com)')).toBe('Link: https://example.com')
    })

    it('handles links with titles (ignores title)', () => {
      expect(markdownToPlainText('[Link](https://example.com "Tooltip")')).toBe('Link: https://example.com')
    })

    it('handles multiple links', () => {
      expect(markdownToPlainText('[A](url1) and [B](url2)')).toBe('A: url1 and B: url2')
    })
  })

  describe('images', () => {
    it('shows URL with alt text in parentheses', () => {
      expect(markdownToPlainText('![Alt Text](https://img.jpg)')).toBe('https://img.jpg (Alt Text)')
    })

    it('handles images with titles (ignores title)', () => {
      expect(markdownToPlainText('![Alt](https://img.jpg "title")')).toBe('https://img.jpg (Alt)')
    })

    it('handles images without alt text', () => {
      expect(markdownToPlainText('![](https://img.jpg)')).toBe('https://img.jpg')
    })
  })

  describe('emphasis', () => {
    it('removes bold formatting', () => {
      expect(markdownToPlainText('**bold**')).toBe('bold')
    })

    it('removes italic formatting', () => {
      expect(markdownToPlainText('*italic*')).toBe('italic')
    })

    it('removes mixed bold and italic', () => {
      expect(markdownToPlainText('**bold** *italic*')).toBe('bold italic')
    })

    it('handles underscore emphasis', () => {
      expect(markdownToPlainText('__bold__ _italic_')).toBe('bold italic')
    })
  })

  describe('horizontal rules', () => {
    it('preserves horizontal rule', () => {
      expect(markdownToPlainText('---')).toBe('---')
    })

    it('handles asterisk horizontal rule', () => {
      expect(markdownToPlainText('***')).toBe('---')
    })
  })

  describe('checklists', () => {
    it('converts checklists to bracket format', () => {
      expect(markdownToPlainText('- [x] Done\n- [ ] Todo')).toBe('[x] Done\n[ ] Todo')
    })

    it('handles uppercase X', () => {
      expect(markdownToPlainText('- [X] Done')).toBe('[x] Done')
    })
  })

  describe('strikethrough', () => {
    it('removes strikethrough formatting', () => {
      expect(markdownToPlainText('~~deleted~~')).toBe('deleted')
    })
  })

  describe('footnotes', () => {
    it('converts footnotes to bracketed format with content', () => {
      expect(markdownToPlainText('Text[^1]\n\n[^1]: Footnote content')).toBe('Text[1] (Footnote content)')
    })

    it('handles multiple footnotes', () => {
      const input = 'First[^1] and second[^2]\n\n[^1]: First note\n[^2]: Second note'
      expect(markdownToPlainText(input)).toBe('First[1] (First note) and second[2] (Second note)')
    })

    it('handles footnotes with named references', () => {
      expect(markdownToPlainText('Text[^note]\n\n[^note]: Named footnote')).toBe('Text[note] (Named footnote)')
    })

    it('handles footnote references without definitions', () => {
      expect(markdownToPlainText('Text[^missing]')).toBe('Text[missing]')
    })
  })

  describe('line breaks', () => {
    it('handles explicit line breaks', () => {
      // Two spaces at end of line creates a <br>
      expect(markdownToPlainText('Line one  \nLine two')).toBe('Line one\nLine two')
    })
  })

  describe('escape sequences', () => {
    it('handles escaped characters', () => {
      expect(markdownToPlainText('\\*not italic\\*')).toBe('*not italic*')
    })
  })

  describe('nested blockquotes', () => {
    it('handles blockquotes with code blocks', () => {
      // Blockquote containing a code block
      const input = '> ```\n> code\n> ```'
      const result = markdownToPlainText(input)
      expect(result).toContain('code')
    })
  })

  describe('html content', () => {
    it('outputs inline HTML as code', () => {
      expect(markdownToPlainText('<div>content</div>')).toBe('<div>content</div>')
    })

    it('handles self-closing HTML tags', () => {
      expect(markdownToPlainText('<br/>')).toBe('<br/>')
    })
  })

  describe('stripHtml option', () => {
    it('strips simple HTML tags and returns text content', () => {
      expect(markdownToPlainText('<div>text</div>', { stripHtml: true })).toBe('text')
    })

    it('strips nested HTML tags', () => {
      expect(markdownToPlainText('<div><span>nested</span></div>', { stripHtml: true })).toBe('nested')
    })

    it('strips mixed content with HTML', () => {
      expect(markdownToPlainText('Text <b>bold</b> more', { stripHtml: true })).toBe('Text bold more')
    })

    it('handles self-closing br tags as newline', () => {
      expect(markdownToPlainText('Line<br/>break', { stripHtml: true })).toBe('Line\nbreak')
    })

    it('handles br tags without slash', () => {
      expect(markdownToPlainText('Line<br>break', { stripHtml: true })).toBe('Line\nbreak')
    })

    it('strips complex nested HTML', () => {
      expect(markdownToPlainText('<div>Hello <b>World</b></div>', { stripHtml: true })).toBe('Hello World')
    })

    it('preserves whitespace between elements', () => {
      expect(markdownToPlainText('<p>First</p> <p>Second</p>', { stripHtml: true })).toBe('First Second')
    })

    it('handles HTML with attributes', () => {
      expect(markdownToPlainText('<a href="url">link text</a>', { stripHtml: true })).toBe('link text')
    })

    it('does not strip HTML when option is false', () => {
      expect(markdownToPlainText('<div>content</div>', { stripHtml: false })).toBe('<div>content</div>')
    })

    it('does not strip HTML when option is undefined', () => {
      expect(markdownToPlainText('<div>content</div>', {})).toBe('<div>content</div>')
    })

    it('strips inline HTML within markdown', () => {
      expect(markdownToPlainText('Some **bold** and <em>italic</em> text', { stripHtml: true })).toBe('Some bold and italic text')
    })
  })

  describe('space tokens', () => {
    it('handles multiple blank lines', () => {
      expect(markdownToPlainText('Para 1\n\n\n\nPara 2')).toBe('Para 1\n\nPara 2')
    })
  })

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(markdownToPlainText('')).toBe('')
    })

    it('handles whitespace only', () => {
      expect(markdownToPlainText('   ')).toBe('')
    })

    it('trims trailing newlines', () => {
      expect(markdownToPlainText('Text\n\n')).toBe('Text')
    })

    it('handles complex mixed content', () => {
      const input = '# Title\n\nSome **bold** and [link](url)\n\n- Item 1\n- Item 2'
      const expected = 'Title\n\nSome bold and link: url\n\n- Item 1\n- Item 2'
      expect(markdownToPlainText(input)).toBe(expected)
    })
  })

  describe('internal function edge cases', () => {
    it('handles unknown token with tokens array in processTokens', () => {
      // Simulate unknown token type with nested tokens
      const unknownToken = {
        type: 'unknown_block',
        raw: 'test',
        tokens: [{ type: 'text', raw: 'nested', text: 'nested' }],
      }
      const result = processTokensForTest([unknownToken as never])
      // The text token in processToken adds \n\n
      expect(result).toBe('nested\n\n')
    })

    it('handles unknown token with text property in processTokens', () => {
      // Simulate unknown token type with text property
      const unknownToken = {
        type: 'unknown_block',
        raw: 'test',
        text: 'fallback text',
      }
      const result = processTokensForTest([unknownToken as never])
      expect(result).toBe('fallback text\n\n')
    })

    it('handles unknown token without tokens or text in processTokens', () => {
      // Simulate unknown token type without tokens or text
      const unknownToken = {
        type: 'unknown_block',
        raw: 'test',
      }
      const result = processTokensForTest([unknownToken as never])
      expect(result).toBe('')
    })

    it('handles unknown inline token with text property', () => {
      // Simulate unknown inline token type
      const unknownToken = {
        type: 'unknown_inline',
        raw: 'test',
        text: 'unknown text',
      }
      const result = processInlineTokensForTest([unknownToken as never])
      expect(result).toBe('unknown text')
    })

    it('handles unknown inline token without text property', () => {
      // Simulate unknown inline token type without text
      const unknownToken = {
        type: 'unknown_inline',
        raw: 'test',
      }
      const result = processInlineTokensForTest([unknownToken as never])
      expect(result).toBe('')
    })

    it('handles text token without nested tokens in list items', () => {
      // This tests the branch at line 91-92 where text token has no tokens array
      // We need a list that produces plain text tokens
      const input = '- simple'
      const result = markdownToPlainText(input)
      expect(result).toBe('- simple')
    })

    it('handles paragraph token in list item via processListItemTokens', () => {
      // Test paragraph branch in processListItemTokens
      const tokens = [
        {
          type: 'paragraph',
          raw: 'test',
          text: 'test',
          tokens: [{ type: 'text', raw: 'test', text: 'para text' }],
        },
      ]
      const result = processListItemTokensForTest(tokens as never)
      expect(result).toBe('para text')
    })

    it('handles text token with tokens array in list item', () => {
      // Test text with tokens branch in processListItemTokens
      const tokens = [
        {
          type: 'text',
          raw: 'test',
          text: 'test',
          tokens: [{ type: 'text', raw: 'test', text: 'nested text' }],
        },
      ]
      const result = processListItemTokensForTest(tokens as never)
      expect(result).toBe('nested text')
    })

    it('handles text token without tokens array in list item', () => {
      // Test text without tokens branch in processListItemTokens (line 91-92)
      const tokens = [
        {
          type: 'text',
          raw: 'plain',
          text: 'plain text only',
        },
      ]
      const result = processListItemTokensForTest(tokens as never)
      expect(result).toBe('plain text only')
    })

    it('handles unknown token type in list item', () => {
      // Test default branch (returns empty string) in processListItemTokens (line 94)
      const tokens = [
        {
          type: 'unknown',
          raw: 'unknown',
        },
      ]
      const result = processListItemTokensForTest(tokens as never)
      expect(result).toBe('')
    })

    it('handles undefined tokens in processInlineTokens', () => {
      // Test early return for undefined tokens
      const result = processInlineTokensForTest(undefined)
      expect(result).toBe('')
    })
  })
})
