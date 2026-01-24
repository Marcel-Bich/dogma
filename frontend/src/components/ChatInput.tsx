import { useState } from 'preact/hooks'

interface ChatInputProps {
  onSend: (text: string) => void
  onContinue: (text: string) => void
  onCancel: () => void
  loading: boolean
}

export function ChatInput({ onSend, onContinue, onCancel, loading }: ChatInputProps) {
  const [text, setText] = useState('')

  const trimmed = text.trim()
  const canSend = trimmed.length > 0 && !loading

  function handleSend() {
    if (!canSend) return
    onSend(trimmed)
    setText('')
  }

  function handleContinue() {
    if (!canSend) return
    onContinue(trimmed)
    setText('')
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div class="flex items-end gap-3 p-3 bg-black border-t" style={{ borderColor: 'var(--arctic-border)' }}>
      <textarea
        class="flex-1 resize-none p-2 border text-sm glass-input focus:outline-none transition-all duration-200"
        style={{
          background: '#000',
          color: 'var(--arctic-message)',
          borderColor: 'rgba(var(--arctic-accent-rgb), 0.2)',
          borderRadius: '2px',
        }}
        onFocus={(e) => {
          const t = e.target as HTMLTextAreaElement
          t.style.borderColor = 'rgba(var(--arctic-accent-rgb), 0.5)'
          t.style.boxShadow = '0 0 8px rgba(var(--arctic-accent-rgb), 0.3)'
        }}
        onBlur={(e) => {
          const t = e.target as HTMLTextAreaElement
          t.style.borderColor = 'rgba(var(--arctic-accent-rgb), 0.2)'
          t.style.boxShadow = 'none'
        }}
        placeholder="..."
        aria-label="Enter your prompt..."
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
        rows={3}
      />
      <div class="flex flex-row gap-2 pb-0.5">
        <button
          type="button"
          aria-label="Send"
          disabled={!canSend}
          onClick={handleSend}
          class="px-3 py-1.5 text-xs uppercase tracking-wider border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: 'var(--arctic-cyan)', borderColor: 'var(--arctic-cyan)', background: 'transparent' }}
        >
          EXEC
        </button>
        <button
          type="button"
          aria-label="Continue session"
          disabled={!canSend}
          onClick={handleContinue}
          class="px-3 py-1.5 text-xs uppercase tracking-wider border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: '#666', borderColor: '#333', background: 'transparent' }}
        >
          CONT
        </button>
        {loading && (
          <button
            type="button"
            aria-label="Cancel"
            onClick={onCancel}
            class="px-3 py-1.5 text-xs uppercase tracking-wider border transition-all duration-200"
            style={{ color: 'var(--arctic-error)', borderColor: 'var(--arctic-error)', background: 'transparent' }}
          >
            STOP
          </button>
        )}
      </div>
    </div>
  )
}
