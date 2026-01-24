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
        <div class="flex flex-col items-center justify-center h-full gap-4">
          <div class="relative flex items-center justify-center" style={{ width: '80px', height: '80px' }}>
            <div
              class="absolute rounded-full"
              style={{
                width: '50px',
                height: '50px',
                border: '1px solid rgba(34,211,238,0.5)',
                animation: 'pulse-ring 3s ease-in-out infinite',
              }}
            />
            <div
              class="absolute rounded-full"
              style={{
                width: '80px',
                height: '80px',
                border: '1px solid rgba(34,211,238,0.25)',
                animation: 'pulse-ring 3.5s ease-in-out infinite 1.5s',
              }}
            />
          </div>
          <span class="text-xs" style={{ color: '#4a6a7a' }}>
            Send a prompt to start
          </span>
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
        <div data-testid="loading-indicator" class="flex flex-col items-center justify-center gap-4 py-4">
          <div class="relative flex items-center justify-center" style={{ width: '80px', height: '80px' }}>
            <div
              class="rounded-full"
              style={{
                width: '50px',
                height: '50px',
                border: '1px solid rgba(34,211,238,0.5)',
                animation: 'pulse-ring-fast 1.5s ease-in-out infinite',
              }}
            />
            <div
              class="absolute rounded-full"
              style={{
                width: '80px',
                height: '80px',
                border: '1px solid rgba(34,211,238,0.25)',
                animation: 'pulse-ring-fast 1.8s ease-in-out infinite 0.75s',
              }}
            />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
