import { marked, Token, Tokens } from 'marked'

// Preprocess footnotes: convert [^1] references and [^1]: definitions to inline format
function preprocessFootnotes(markdown: string): string {
  // Extract footnote definitions
  const footnoteDefRegex = /^\[\^([^\]]+)\]:\s*(.+)$/gm
  const footnotes: Map<string, string> = new Map()

  let match
  while ((match = footnoteDefRegex.exec(markdown)) !== null) {
    footnotes.set(match[1], match[2].trim())
  }

  // Remove footnote definitions from text
  let result = markdown.replace(/^\[\^([^\]]+)\]:\s*(.+)$/gm, '')

  // Replace footnote references with inline content
  result = result.replace(/\[\^([^\]]+)\]/g, (_, id) => {
    const content = footnotes.get(id)
    if (content) {
      return '[' + id + '] (' + content + ')'
    }
    return '[' + id + ']'
  })

  return result
}

// Process a single token to plain text
function processToken(token: Token): string {
  switch (token.type) {
    case 'heading':
      return processInlineTokens((token as Tokens.Heading).tokens) + '\n\n'

    case 'paragraph':
      return processInlineTokens((token as Tokens.Paragraph).tokens) + '\n\n'

    case 'code':
      return (token as Tokens.Code).text + '\n\n'

    case 'blockquote': {
      const bq = token as Tokens.Blockquote
      const innerText = bq.tokens
        .map((t) => {
          if (t.type === 'paragraph') {
            return processInlineTokens((t as Tokens.Paragraph).tokens)
          }
          return processToken(t)
        })
        .join('\n')
        .trim()
      return innerText.split('\n').map((line) => '> ' + line).join('\n') + '\n\n'
    }

    case 'list': {
      const list = token as Tokens.List
      let counter = list.start || 1
      const items = list.items.map((item) => {
        if (item.task) {
          const checkbox = item.checked ? '[x]' : '[ ]'
          const text = processListItemTokens(item.tokens).trim()
          return checkbox + ' ' + text
        }
        const text = processListItemTokens(item.tokens).trim()
        if (list.ordered) {
          return counter++ + '. ' + text
        }
        return '- ' + text
      })
      return items.join('\n') + '\n\n'
    }

    case 'table': {
      const table = token as Tokens.Table
      const formatCell = (text: string): string => {
        const trimmed = text.trim()
        // Check if it's a number (integer or decimal)
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
          return trimmed
        }
        // Non-numbers get quoted
        return '"' + trimmed + '"'
      }
      const headerCells = table.header.map((cell) => formatCell(processInlineTokens(cell.tokens)))
      const headerRow = headerCells.join(';')
      const bodyRows = table.rows.map((row) => {
        const cells = row.map((cell) => formatCell(processInlineTokens(cell.tokens)))
        return cells.join(';')
      })
      return headerRow + '\n' + bodyRows.join('\n') + '\n\n'
    }

    case 'hr':
      return '---\n\n'

    case 'space':
      return ''

    case 'html':
      return (token as Tokens.HTML).raw.trim() + '\n\n'

    default:
      // For any other block-level token, try to process its tokens
      if ('tokens' in token && Array.isArray(token.tokens)) {
        return processTokens(token.tokens as Token[])
      }
      if ('text' in token) {
        return (token as { text: string }).text + '\n\n'
      }
      return ''
  }
}

// Process list item tokens (may contain paragraphs)
function processListItemTokens(tokens: Token[]): string {
  return tokens.map((t) => {
    if (t.type === 'paragraph') {
      return processInlineTokens((t as Tokens.Paragraph).tokens)
    }
    if (t.type === 'text' && 'tokens' in t && Array.isArray(t.tokens)) {
      return processInlineTokens(t.tokens as Token[])
    }
    if (t.type === 'text') {
      return (t as Tokens.Text).text
    }
    return ''
  }).join('')
}

// Process inline tokens to plain text
function processInlineTokens(tokens: Token[] | undefined): string {
  if (!tokens) return ''
  let result = ''
  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        result += (token as Tokens.Text).text
        break
      case 'strong':
        result += processInlineTokens((token as Tokens.Strong).tokens)
        break
      case 'em':
        result += processInlineTokens((token as Tokens.Em).tokens)
        break
      case 'codespan':
        result += (token as Tokens.Codespan).text
        break
      case 'link': {
        const link = token as Tokens.Link
        const linkText = processInlineTokens(link.tokens)
        result += linkText + ': ' + link.href
        break
      }
      case 'image': {
        const img = token as Tokens.Image
        if (img.text) {
          result += img.href + ' (' + img.text + ')'
        } else {
          result += img.href
        }
        break
      }
      case 'del':
        result += processInlineTokens((token as Tokens.Del).tokens)
        break
      case 'br':
        result += '\n'
        break
      case 'escape':
        result += (token as Tokens.Escape).text
        break
      default:
        // Handle any other inline token with text property
        if ('text' in token) {
          result += (token as { text: string }).text
        }
    }
  }
  return result
}

// Process array of block tokens
function processTokens(tokens: Token[]): string {
  return tokens.map(processToken).join('')
}

// Export for testing only
export const processTokensForTest = processTokens
export const processInlineTokensForTest = processInlineTokens
export const processListItemTokensForTest = processListItemTokens

export interface MarkdownToPlainTextOptions {
  stripHtml?: boolean
}

// Strip HTML tags from text, preserving content and converting br to newlines
function stripHtmlTags(text: string): string {
  // Replace br tags with newlines
  let result = text.replace(/<br\s*\/?>/gi, '\n')
  // Remove all other HTML tags but keep content
  result = result.replace(/<[^>]+>/g, '')
  return result
}

export function markdownToPlainText(markdown: string, options?: MarkdownToPlainTextOptions): string {
  if (!markdown || !markdown.trim()) {
    return ''
  }

  // Preprocess footnotes before lexing
  const preprocessed = preprocessFootnotes(markdown)

  // Lexer returns array of tokens
  const tokens = marked.lexer(preprocessed)

  // Process all tokens
  let result = processTokens(tokens)

  // Strip HTML if option is enabled
  if (options?.stripHtml) {
    result = stripHtmlTags(result)
  }

  // Clean up: normalize newlines, trim only newlines (preserve indentation)
  return result
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/^\n+/, '') // Remove leading newlines only
    .replace(/\n+$/, '') // Remove trailing newlines only
}
