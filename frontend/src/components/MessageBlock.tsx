import { useMemo } from 'preact/hooks'
import { marked } from 'marked'
import { gfmHeadingId } from 'marked-gfm-heading-id'
import markedFootnote from 'marked-footnote'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'
import type { MessageBlock } from '../types'

// highlight.js full bundle includes all 192 languages

// Custom renderer for syntax highlighting
const renderer = new marked.Renderer()
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  let highlighted: string
  try {
    highlighted = language !== 'plaintext'
      ? hljs.highlight(text, { language }).value
      : escapeHtml(text)
  } catch {
    highlighted = escapeHtml(text)
  }
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Configure marked with extensions
marked.use(gfmHeadingId())
marked.use(markedFootnote())
marked.use({ renderer })

marked.setOptions({
  breaks: true,
  gfm: true,
})

// Configure DOMPurify to allow hljs classes
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  if (data.attrName === 'class') {
    // Allow hljs-* and language-* classes
    data.forceKeepAttr = true
  }
})

// Parse markdown and sanitize
export function parseMarkdown(content: string): string {
  const html = marked.parse(content, { async: false }) as string
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['id'], // Allow id for anchor links
  })
}

interface Props {
  block: MessageBlock
}

export function MessageBlockView({ block }: Props) {
  const renderedHtml = useMemo(() => {
    if (block.type === 'text') {
      return parseMarkdown(block.content)
    }
    return ''
  }, [block.type, block.content])

  switch (block.type) {
    case 'text': {
      const handleCopy = (e: ClipboardEvent) => {
        e.preventDefault()
        e.clipboardData?.setData('text/plain', block.content)
      }

      return (
        <div
          class="text-sm leading-relaxed markdown-content"
          style={{ color: 'var(--arctic-message)' }}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
          onCopy={handleCopy}
        />
      )
    }

    case 'thinking':
      return (
        <div class="italic text-gray-400 text-xs" style={{ color: 'var(--arctic-thinking)' }}>{block.content}</div>
      )

    case 'tool_use':
      return (
        <div class="text-sm">
          <span class="text-xs uppercase tracking-wider" style={{ color: 'var(--arctic-cyan-dark)' }}>{block.toolName}</span>
          <pre class="mt-1 overflow-x-auto p-2 rounded" style={{ background: '#0a0a0a' }}>
            <code class="font-mono text-xs" style={{ color: '#9ca3af' }}>{block.toolInput}</code>
          </pre>
        </div>
      )

    case 'result':
      return <div class="text-green-400 text-sm" style={{ color: 'var(--arctic-cyan-light)' }}>{block.content}</div>

    case 'error':
      return <div class="error-block text-sm">{block.content}</div>

    default:
      return null
  }
}
