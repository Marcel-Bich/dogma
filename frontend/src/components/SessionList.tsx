import { useEffect } from 'preact/hooks'
import { sessions, sessionsLoading, sessionsError, loadSessions } from '../state'
import type { SessionInfo } from '../types'

export function formatRelativeTime(isoTimestamp: string): string {
  const then = new Date(isoTimestamp).getTime()
  const now = Date.now()
  const diffMs = now - then

  if (isNaN(then)) return isoTimestamp

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (hours < 24) return `${hours} hours ago`
  if (days < 7) return `${days} days ago`
  return isoTimestamp.slice(0, 10)
}

interface SessionListProps {
  onSelect: (sessionId: string) => void
  selectedId?: string
  listFn: () => Promise<SessionInfo[]>
}

export function SessionList({ onSelect, selectedId, listFn }: SessionListProps) {
  useEffect(() => {
    loadSessions(listFn)
  }, [])

  if (sessionsLoading.value) {
    return (
      <div data-testid="sessions-loading" class="p-4 text-gray-400 text-sm">
        Loading sessions...
      </div>
    )
  }

  if (sessionsError.value) {
    return (
      <div data-testid="sessions-error" class="p-4 text-red-400 text-sm">
        {sessionsError.value}
      </div>
    )
  }

  if (sessions.value.length === 0) {
    return (
      <div data-testid="sessions-empty" class="p-4 text-gray-500 text-sm">
        No sessions found
      </div>
    )
  }

  return (
    <div data-testid="sessions-list" class="flex flex-col gap-1 p-2">
      {sessions.value.map((session: SessionInfo) => {
        const isSelected = session.id === selectedId
        const displayText = session.summary || session.first_message || session.id
        return (
          <button
            key={session.id}
            type="button"
            data-testid={`session-item-${session.id}`}
            onClick={() => onSelect(session.id)}
            class={`text-left p-2 rounded-lg border transition-colors truncate ${
              isSelected
                ? 'border-blue-500 bg-blue-900/30 text-white'
                : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
            }`}
          >
            <div class="text-sm font-medium truncate">{displayText}</div>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs text-gray-500">{formatRelativeTime(session.timestamp)}</span>
              {session.model && (
                <span class="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">{session.model}</span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
