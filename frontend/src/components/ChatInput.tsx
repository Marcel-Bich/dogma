import { useState, useRef } from 'preact/hooks'

interface ChatInputProps {
  onSend: (text: string) => void
  onContinue: (text: string) => void
  onCancel: () => void
  loading: boolean
}

export function ChatInput({ onSend, onContinue, onCancel, loading }: ChatInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const trimmed = text.trim()
  const canSend = trimmed.length > 0 && !loading
  const showActions = trimmed.length > 0 || loading

  function handleSend() {
    if (!canSend) return
    onSend(trimmed)
    setText('')
    resetHeight()
  }

  function handleContinue() {
    if (!canSend) return
    onContinue(trimmed)
    setText('')
    resetHeight()
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement
    setText(target.value)
    autoGrow(target)
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    const lineHeight = 20
    const maxHeight = lineHeight * 5
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px'
  }

  function resetHeight() {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  return (
    <div class="flex flex-col p-3 bg-black border-t" style={{ borderColor: 'var(--arctic-border)' }}>
      <textarea
        ref={textareaRef}
        class="w-full resize-none p-2 border text-sm glass-input focus:outline-none transition-all duration-200"
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
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        rows={1}
      />
      {showActions && (
        <div class="flex justify-end gap-1 mt-1" data-testid="action-bar">
          {!loading && (
            <>
              <button
                type="button"
                aria-label="Continue session"
                disabled={!canSend}
                onClick={handleContinue}
                class="px-2 min-h-[44px] text-xs uppercase tracking-wider transition-opacity duration-200 disabled:opacity-30"
                style={{ color: 'var(--arctic-dim)', background: 'transparent', border: 'none' }}
              >
                CONT
              </button>
              <button
                type="button"
                aria-label="Send"
                disabled={!canSend}
                onClick={handleSend}
                class="px-2 min-h-[44px] text-xs uppercase tracking-wider transition-opacity duration-200 disabled:opacity-30"
                style={{ color: 'var(--arctic-cyan)', background: 'transparent', border: 'none' }}
              >
                EXEC
              </button>
            </>
          )}
          {loading && (
            <button
              type="button"
              aria-label="Cancel"
              onClick={onCancel}
              class="px-2 min-h-[44px] text-xs uppercase tracking-wider transition-opacity duration-200"
              style={{ color: 'var(--arctic-error)', background: 'transparent', border: 'none' }}
            >
              STOP
            </button>
          )}
        </div>
      )}
    </div>
  )
}
