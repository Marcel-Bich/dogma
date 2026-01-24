import { useEffect, useMemo } from 'preact/hooks'
import { useState } from 'preact/hooks'
import { createBackend } from './backend'
import { ChatInput } from './components/ChatInput'
import { Menu } from './components/Menu'
import { MessageList } from './components/MessageList'
import { SessionList } from './components/SessionList'
import { SettingsPanel } from './components/SettingsPanel'
import {
  messages,
  loading,
  error,
  sessionId,
  settingsOpen,
  activeThemeId,
  customAccent,
  intensity,
  handleBridgeEvent,
  setLoading,
  setError,
  setSettingsOpen,
  setActiveTheme,
  setCustomAccent,
  setIntensity,
} from './state'
import { loadTheme, getThemeColors, applyTheme, applyIntensity, saveTheme } from './themes'
import type { BridgeEvent } from './types'

export function App() {
  const [showSessions, setShowSessions] = useState(false)
  const backend = useMemo(() => createBackend(), [])

  useEffect(() => {
    const stored = loadTheme()
    setActiveTheme(stored.presetId)
    setCustomAccent(stored.customAccent)
    setIntensity(stored.intensity)
    const colors = getThemeColors(stored.presetId, stored.customAccent)
    applyTheme(colors)
    const accent = stored.customAccent || colors.accent
    applyIntensity(stored.intensity, accent)
  }, [])

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

  function handleOpenSettings() {
    setSettingsOpen(true)
  }

  function handleSelectPreset(id: string) {
    setActiveTheme(id)
    setCustomAccent(null)
    const colors = getThemeColors(id, null)
    applyTheme(colors)
    applyIntensity(intensity.value, colors.accent)
    saveTheme(id, null, intensity.value)
  }

  function handleCustomAccent(hex: string) {
    setCustomAccent(hex)
    const colors = getThemeColors(activeThemeId.value, hex)
    applyTheme(colors)
    applyIntensity(intensity.value, hex)
    saveTheme(activeThemeId.value, hex, intensity.value)
  }

  function handleIntensity(val: number) {
    setIntensity(val)
    const accent = customAccent.value || getThemeColors(activeThemeId.value, null).accent
    applyIntensity(val, accent)
    saveTheme(activeThemeId.value, customAccent.value, val)
  }

  function handleSelectSession(id: string) {
    console.log('Selected session:', id)
  }

  return (
    <div class="flex flex-col h-screen bg-black relative overflow-hidden scanline">
      <div class="relative z-10 flex items-center justify-end px-4 py-1 bg-black border-b shadow-md bg-gradient-to-b from-black to-black" style={{ borderColor: 'var(--arctic-border)' }}>
        <Menu
          showSessions={showSessions}
          onToggleSessions={() => setShowSessions(!showSessions)}
          onOpenSettings={handleOpenSettings}
        />
      </div>
      <div class="flex flex-1 overflow-hidden">
        <div
          data-testid="sessions-panel"
          class={`overflow-y-auto bg-black border-r transition-all duration-200 ease-in-out ${showSessions ? 'absolute sm:relative inset-y-0 left-0 sm:inset-auto w-[85vw] sm:w-64 z-20 sm:z-auto opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}
          style={{ borderColor: 'var(--arctic-border)' }}
        >
          <SessionList onSelect={handleSelectSession} selectedId={sessionId.value || undefined} listFn={backend.listSessions} />
        </div>
        <div data-testid="main-content" class="flex flex-col flex-1" onClick={() => { if (showSessions) setShowSessions(false) }}>
          <div class="flex-1 overflow-y-auto">
            <MessageList messages={messages.value} loading={loading.value} />
          </div>
          {error.value && (
            <div data-testid="error-message" class="px-4 py-2 text-sm" style={{ background: 'rgba(127,29,29,0.3)', color: 'var(--arctic-error)' }}>
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
      {settingsOpen.value && (
        <div
          data-testid="settings-backdrop"
          class="fixed inset-0 z-30"
          onClick={() => setSettingsOpen(false)}
        />
      )}
      <SettingsPanel
        open={settingsOpen.value}
        onClose={() => setSettingsOpen(false)}
        activePresetId={activeThemeId.value}
        customAccent={customAccent.value}
        intensity={intensity.value}
        onSelectPreset={handleSelectPreset}
        onCustomAccentChange={handleCustomAccent}
        onIntensityChange={handleIntensity}
      />
    </div>
  )
}
