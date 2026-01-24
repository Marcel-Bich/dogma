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
    <div class="flex items-end gap-2 p-3 bg-gray-800 border-t border-gray-700">
      <textarea
        class="flex-1 resize-none rounded-lg bg-gray-900 text-white placeholder-gray-400 p-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
        placeholder="Enter your prompt..."
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
        rows={3}
      />
      <div class="flex flex-col gap-1">
        <button
          type="button"
          aria-label="Send"
          disabled={!canSend}
          onClick={handleSend}
          class="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
        >
          Send
        </button>
        <button
          type="button"
          aria-label="Continue session"
          disabled={!canSend}
          onClick={handleContinue}
          class="px-4 py-2 rounded-lg bg-green-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-500 transition-colors"
        >
          Continue
        </button>
        {loading && (
          <button
            type="button"
            aria-label="Cancel"
            onClick={onCancel}
            class="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
