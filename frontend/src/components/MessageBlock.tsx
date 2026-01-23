import type { MessageBlock } from '../types'

interface Props {
  block: MessageBlock
}

export function MessageBlockView({ block }: Props) {
  switch (block.type) {
    case 'text':
      return <div class="text-white">{block.content}</div>

    case 'thinking':
      return (
        <div class="italic text-gray-400 text-sm">{block.content}</div>
      )

    case 'tool_use':
      return (
        <div class="text-blue-400">
          <span class="font-semibold">{block.toolName}</span>
          <pre class="mt-1 overflow-x-auto">
            <code class="font-mono text-xs text-gray-300">{block.toolInput}</code>
          </pre>
        </div>
      )

    case 'result':
      return <div class="text-green-400">{block.content}</div>

    case 'error':
      return <div class="text-red-400">{block.content}</div>

    default:
      return null
  }
}
