import { useState, useRef, useEffect } from 'preact/hooks'

interface ChatInputProps {
  onSend: (text: string) => void
  onContinue: (text: string) => void
  onCancel: () => void
  loading: boolean
  stoppable?: boolean
  spellCheck?: boolean
}

type InputState = 'idle' | 'ready' | 'pending' | 'loading'

export function ChatInput({ onSend, onContinue, onCancel, loading, stoppable = false, spellCheck = false }: ChatInputProps) {
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

  // Async focus after 250ms for reliable focus after page reload
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 250)
    return () => clearTimeout(focusTimer)
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
    // Odd count (1, 3, 5...) = continue current session
    // Even count (2, 4, 6...) = start new session
    const isNewSession = enterCountRef.current % 2 === 0
    if (isNewSession) {
      onSend(trimmed)
    } else {
      onContinue(trimmed)
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

    if ((e.key === 'ArrowUp' || e.key === 'Escape') && state === 'pending') {
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
    // Max-height is set via CSS class (max-h-[55vh])
    // Just set the height to scrollHeight, CSS will cap it
    el.style.height = el.scrollHeight + 'px'
  }

  function resetHeight() {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function renderIndicatorContent() {
    // Loading + stoppable: CSS square (stop button)
    if (loading && stoppable) {
      return <span class="stop-square w-3 h-3 bg-current inline-block" />
    }
    // Loading (not stoppable): animated dots
    if (loading) {
      return (
        <span class="loading-dots flex gap-0.5">
          <span class="w-1 h-1 bg-current rounded-full animate-loading-dot" style={{ animationDelay: '0ms' }} />
          <span class="w-1 h-1 bg-current rounded-full animate-loading-dot" style={{ animationDelay: '150ms' }} />
          <span class="w-1 h-1 bg-current rounded-full animate-loading-dot" style={{ animationDelay: '300ms' }} />
        </span>
      )
    }
    // Pending with even count: double play
    if (state === 'pending' && enterCount % 2 === 0) return '\u25b8\u25b8'
    // Default: single play
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
      <div class="relative flex-1 flex items-stretch">
        <textarea
          ref={textareaRef}
          autoFocus
          class="w-full resize-none p-2 border text-sm glass-input focus:outline-none transition-all duration-200 min-h-[44px] max-h-[55vh]"
          style={{
            background: '#000',
            color: 'var(--arctic-message)',
            borderColor: 'rgba(var(--arctic-accent-rgb), 0.2)',
            borderRadius: '2px',
            paddingRight: '3rem',
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
          spellCheck={spellCheck}
        />
        {showIndicator && (
          <button
            type="button"
            data-testid="indicator"
            onClick={handleIndicatorClick}
            class={`absolute right-1 top-0 bottom-0 flex items-center justify-center w-8 h-full text-lg font-mono transition-all duration-200 border-none bg-transparent cursor-pointer hover:bg-white/10 rounded ${isIndicatorDim() ? 'opacity-40' : ''}`}
            style={{ color: getIndicatorColor() }}
            aria-label={loading && stoppable ? 'Stop' : 'Send'}
          >
            {renderIndicatorContent()}
          </button>
        )}
      </div>
    </div>
  )
}
