import { useEffect } from 'preact/hooks'
import { EventsOn } from '../wailsjs/runtime/runtime'
import { SendPrompt, ContinuePrompt, CancelPrompt } from '../wailsjs/go/main/App'
import { ChatInput } from './components/ChatInput'
import { MessageList } from './components/MessageList'
import {
  messages,
  loading,
  error,
  handleBridgeEvent,
  setLoading,
  setError,
} from './state'
import type { BridgeEvent } from './types'

export function App() {
  useEffect(() => {
    const unsubEvent = EventsOn('claude:event', (event: BridgeEvent) => {
      handleBridgeEvent(event)
    })

    const unsubDone = EventsOn('claude:done', () => {
      setLoading(false)
    })

    const unsubError = EventsOn('claude:error', (msg: string) => {
      setError(msg)
      setLoading(false)
    })

    return () => {
      unsubEvent()
      unsubDone()
      unsubError()
    }
  }, [])

  function handleSend(text: string) {
    setLoading(true)
    setError(null)
    SendPrompt(text)
  }

  function handleContinue(text: string) {
    setLoading(true)
    setError(null)
    ContinuePrompt(text)
  }

  function handleCancel() {
    CancelPrompt()
  }

  return (
    <div class="flex flex-col h-screen bg-gray-900">
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
  )
}
