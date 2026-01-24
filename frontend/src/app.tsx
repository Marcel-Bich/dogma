import { useEffect, useMemo } from 'preact/hooks'
import { useState } from 'preact/hooks'
import { createBackend } from './backend'
import { ChatInput } from './components/ChatInput'
import { MessageList } from './components/MessageList'
import { SessionList } from './components/SessionList'
import {
  messages,
  loading,
  error,
  sessionId,
  handleBridgeEvent,
  setLoading,
  setError,
} from './state'
import type { BridgeEvent } from './types'

export function App() {
  const [showSessions, setShowSessions] = useState(false)
  const backend = useMemo(() => createBackend(), [])

  useEffect(() => {
    const unsub = backend.onEvent((event: BridgeEvent) => {
      if (event.type === 'result' && !event.is_error) {
        setLoading(false)
      } else if (event.type === 'result' && event.is_error) {
        setError(event.result || 'Unknown error')
        setLoading(false)
      } else {
        handleBridgeEvent(event)
      }
    })

    return unsub
  }, [backend])

  function handleSend(text: string) {
    setLoading(true)
    setError(null)
    backend.sendPrompt(text)
  }

  function handleContinue(text: string) {
    setLoading(true)
    setError(null)
    backend.continuePrompt(text)
  }

  function handleCancel() {
    backend.cancelPrompt()
  }

  function handleSelectSession(id: string) {
    console.log('Selected session:', id)
  }

  return (
    <div class="flex flex-col h-screen bg-black relative overflow-hidden scanline">
      <div class="relative z-10 flex items-center justify-between px-4 py-2.5 bg-black border-b shadow-md bg-gradient-to-b from-black to-black" style={{ borderColor: '#0e4f5c' }}>
        <span class="text-sm font-semibold tracking-wide select-none" style={{ letterSpacing: '0.15em' }}>
          <span style={{ color: '#22d3ee' }}>[&gt; </span>
          <span data-testid="app-title" style={{ color: '#c8c8d8' }}>DOGMA</span>
        </span>
        <button
          type="button"
          aria-label="Toggle sessions"
          onClick={() => setShowSessions(!showSessions)}
          class="px-3 py-1 text-xs uppercase transition-colors duration-200"
          style={{ color: '#666', letterSpacing: '0.1em' }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#22d3ee' }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#666' }}
        >
          Sessions
        </button>
      </div>
      <div class="flex flex-1 overflow-hidden">
        <div
          data-testid="sessions-panel"
          class={`overflow-y-auto bg-black border-r transition-all duration-200 ease-in-out ${showSessions ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}
          style={{ borderColor: '#0e4f5c' }}
        >
          <SessionList onSelect={handleSelectSession} selectedId={sessionId.value || undefined} listFn={backend.listSessions} />
        </div>
        <div class="flex flex-col flex-1">
          <div class="flex-1 overflow-y-auto">
            <MessageList messages={messages.value} loading={loading.value} />
          </div>
          {error.value && (
            <div data-testid="error-message" class="px-4 py-2 text-sm" style={{ background: 'rgba(127,29,29,0.3)', color: '#f87171' }}>
              {error.value}
            </div>
          )}
          <ChatInput
            onSend={handleSend}
            onContinue={handleContinue}
            onCancel={handleCancel}
            loading={loading.value}
          />
        </div>
      </div>
    </div>
  )
}
