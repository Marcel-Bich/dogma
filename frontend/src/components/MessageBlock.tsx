import type { MessageBlock } from '../types'

interface Props {
  block: MessageBlock
}

export function MessageBlockView({ block }: Props) {
  switch (block.type) {
    case 'text':
      return <div class="text-sm leading-relaxed" style={{ color: 'var(--arctic-message)' }}>{block.content}</div>

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
