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
          <div class="relative flex items-center justify-center" style={{ width: '140px', height: '140px' }}>
            <div
              class="absolute rounded-full"
              style={{
                width: '60px',
                height: '60px',
                border: '1px solid rgba(var(--arctic-accent-rgb), 0.5)',
                animation: 'pulse-ring 3s ease-in-out infinite',
              }}
            />
            <div
              class="absolute rounded-full"
              style={{
                width: '110px',
                height: '110px',
                border: '1px solid rgba(var(--arctic-accent-rgb), 0.25)',
                animation: 'pulse-ring 3.5s ease-in-out infinite 1.5s',
              }}
            />
            <span
              data-testid="app-title"
              class="absolute text-xs uppercase select-none text-center"
              style={{
                color: 'var(--arctic-dim)',
                letterSpacing: '0.25em',
                fontWeight: 300,
                marginLeft: '0.125em',
              }}
            >
              DOGMA
            </span>
          </div>
          <span class="text-xs" style={{ color: 'var(--arctic-dim)' }}>
            Awaiting commands
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
          <div class="relative flex items-center justify-center" style={{ width: '120px', height: '120px' }}>
            <div
              class="rounded-full"
              style={{
                width: '70px',
                height: '70px',
                border: '1px solid rgba(var(--arctic-accent-rgb), 0.5)',
                animation: 'pulse-ring-fast 1.5s ease-in-out infinite',
              }}
            />
            <div
              class="absolute rounded-full"
              style={{
                width: '110px',
                height: '110px',
                border: '1px solid rgba(var(--arctic-accent-rgb), 0.25)',
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
