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
    <div class="flex flex-col h-screen bg-gray-900">
      <div class="flex items-center px-3 py-2 bg-gray-800 border-b border-gray-700">
        <button
          type="button"
          aria-label="Toggle sessions"
          onClick={() => setShowSessions(!showSessions)}
          class="px-3 py-1 rounded text-sm text-gray-300 hover:bg-gray-700 transition-colors"
        >
          Sessions
        </button>
      </div>
      <div class="flex flex-1 overflow-hidden">
        {showSessions && (
          <div data-testid="sessions-panel" class="w-64 border-r border-gray-700 overflow-y-auto bg-gray-850">
            <SessionList onSelect={handleSelectSession} selectedId={sessionId.value || undefined} listFn={backend.listSessions} />
          </div>
        )}
        <div class="flex flex-col flex-1">
          <div class="flex-1 overflow-y-auto">
            <MessageList messages={messages.value} loading={loading.value} />
          </div>
          {error.value && (
            <div data-testid="error-message" class="px-4 py-2 bg-red-900 text-red-200 text-sm">
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
