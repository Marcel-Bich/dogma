import { useState, useRef, useEffect } from 'preact/hooks'

interface ChatInputProps {
  onSend: (text: string) => void
  onContinue: (text: string) => void
  onCancel: () => void
  loading: boolean
  stoppable?: boolean
}

type InputState = 'idle' | 'ready' | 'pending' | 'loading'

export function ChatInput({ onSend, onContinue, onCancel, loading, stoppable = false }: ChatInputProps) {
  const [text, setText] = useState('')
  const [state, setState] = useState<InputState>('idle')
  const [enterCount, setEnterCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enterCountRef = useRef(0)

  const trimmed = text.trim()
  const hasText = trimmed.length > 0
  const showIndicator = hasText || loading

  // Sync external loading state
  useEffect(() => {
    if (loading) {
      setState('loading')
      cancelPending()
    } else if (state === 'loading') {
      setState(hasText ? 'ready' : 'idle')
    }
  }, [loading])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  function cancelPending() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setEnterCount(0)
    enterCountRef.current = 0
  }

  function startPending() {
    setState('pending')
    setEnterCount(1)
    enterCountRef.current = 1
    startTimer()
  }

  function toggleSession() {
    const newCount = enterCountRef.current + 1
    setEnterCount(newCount)
    enterCountRef.current = newCount
    startTimer()
  }

  function startTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      executeAction()
    }, 2000)
  }

  function executeAction() {
    const isNewSession = enterCountRef.current % 2 === 0
    if (isNewSession) {
      onContinue(trimmed)
    } else {
      onSend(trimmed)
    }
    setText('')
    setState('idle')
    setEnterCount(0)
    enterCountRef.current = 0
    resetHeight()
  }

  function cancelAndEdit() {
    cancelPending()
    setState('ready')
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (loading) return

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!hasText) return

      if (state === 'ready' || state === 'idle') {
        startPending()
      } else if (state === 'pending') {
        toggleSession()
      }
    }

    if (e.key === 'ArrowUp' && state === 'pending') {
      cancelAndEdit()
    }
  }

  function handleIndicatorClick() {
    if (loading && stoppable) {
      onCancel()
      return
    }

    if (loading || !hasText) return

    if (state === 'ready' || state === 'idle') {
      startPending()
    } else if (state === 'pending') {
      toggleSession()
    }
  }

  function handleShimmerClick() {
    cancelAndEdit()
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement
    setText(target.value)
    if (target.value.trim().length > 0 && state === 'idle') {
      setState('ready')
    } else if (target.value.trim().length === 0) {
      setState('idle')
    }
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

  function getIndicatorContent(): string {
    if (loading && stoppable) return '#'
    if (state === 'pending' && enterCount % 2 === 0) return '\u25b8\u25b8'
    return '\u25b8'
  }

  function getIndicatorColor(): string {
    if (state === 'pending' && enterCount % 2 === 0) {
      return 'var(--arctic-error)'
    }
    return 'var(--arctic-cyan)'
  }

  function isIndicatorDim(): boolean {
    if (loading && stoppable) return false
    if (loading) return true
    return state !== 'pending'
  }

  const isPending = state === 'pending'

  return (
    <div class="relative flex items-center p-3 bg-black border-t" style={{ borderColor: 'var(--arctic-border)' }}>
      {isPending && (
        <button
          type="button"
          data-testid="shimmer"
          onClick={handleShimmerClick}
          class="absolute inset-0 z-10 cursor-pointer bg-transparent border-none shimmer-overlay"
          aria-label="Cancel pending"
        />
      )}
      <div class="relative flex-1">
        <textarea
          ref={textareaRef}
          autoFocus
          class="w-full resize-none p-2 border text-sm glass-input focus:outline-none transition-all duration-200 min-h-[44px]"
          style={{
            background: '#000',
            color: 'var(--arctic-message)',
            borderColor: 'rgba(var(--arctic-accent-rgb), 0.2)',
            borderRadius: '2px',
            paddingRight: '2.5rem',
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
          readOnly={isPending}
          disabled={loading}
        />
        {showIndicator && (
          <button
            type="button"
            data-testid="indicator"
            onClick={handleIndicatorClick}
            class={`absolute right-1 inset-y-0 flex items-center justify-center px-1 min-h-[44px] min-w-[44px] text-lg font-mono transition-all duration-200 border-none bg-transparent cursor-pointer hover:bg-white/10 rounded ${isIndicatorDim() ? 'opacity-40' : ''}`}
            style={{ color: getIndicatorColor() }}
            aria-label={loading && stoppable ? 'Stop' : 'Send'}
          >
            {getIndicatorContent()}
          </button>
        )}
      </div>
    </div>
  )
}
