import { useRef, useEffect } from 'preact/hooks'
import { MessageBlockView } from './MessageBlock'
import type { ChatMessage } from '../types'

interface Props {
  messages: ChatMessage[]
  loading: boolean
}

export function MessageList({ messages, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  return (
    <div class="flex flex-col gap-4 overflow-y-auto h-full p-4">
      {messages.length === 0 && !loading && (
        <div class="flex items-center justify-center h-full text-gray-500">
          Send a prompt to start
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} data-role={msg.role} class="flex flex-col gap-1">
          {msg.blocks.map((block, i) => (
            <MessageBlockView key={i} block={block} />
          ))}
        </div>
      ))}

      {loading && (
        <div data-testid="loading-indicator" class="flex gap-1 items-center text-gray-400">
          <span class="animate-pulse">...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
