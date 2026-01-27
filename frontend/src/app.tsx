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
  stoppable,
  error,
  sessionId,
  settingsOpen,
  activeThemeId,
  customAccent,
  intensity,
  spellCheck,
  backgroundColor,
  handleBridgeEvent,
  addMessage,
  generateId,
  setLoading,
  setStoppable,
  setError,
  setSettingsOpen,
  setActiveTheme,
  setCustomAccent,
  setIntensity,
  setSpellCheck,
  setBackgroundColor,
} from './state'
import { loadTheme, getThemeColors, applyTheme, applyIntensity, applyBackgroundColor, saveTheme } from './themes'
import type { BridgeEvent, ChatMessage } from './types'

export function App() {
  const [showSessions, setShowSessions] = useState(false)
  const backend = useMemo(() => createBackend(), [])

  useEffect(() => {
    const stored = loadTheme()
    setActiveTheme(stored.presetId)
    setCustomAccent(stored.customAccent)
    setIntensity(stored.intensity)
    setSpellCheck(stored.spellCheck)
    setBackgroundColor(stored.backgroundColor)
    const colors = getThemeColors(stored.presetId, stored.customAccent)
    applyTheme(colors)
    const accent = stored.customAccent || colors.accent
    applyIntensity(stored.intensity, accent)
    applyBackgroundColor(stored.backgroundColor)
  }, [])

  useEffect(() => {
    const unsub = backend.onEvent((event: BridgeEvent) => {
      // Debug: Log all incoming events
      console.log('[BRIDGE] Event received:', event.type, event)

      if (event.type === 'result' && !event.is_error) {
        console.log('[BRIDGE] Result (success):', event.result)
        setLoading(false)
        setStoppable(false)
      } else if (event.type === 'result' && event.is_error) {
        console.error('[BRIDGE] Result (error):', event.result)
        // Add error block to chat history (permanent) AND set error signal (temporary banner)
        handleBridgeEvent(event)
        setError(event.result || 'Unknown error')
        setLoading(false)
        setStoppable(false)
      } else {
        console.log('[BRIDGE] Handling event:', event.type)
        handleBridgeEvent(event)
      }
    })

    return unsub
  }, [backend])

  function handleSend(text: string) {
    // Start a completely new session
    const trimmed = text.trim()
    console.log('[APP] handleSend - new session, prompt:', trimmed.substring(0, 100) + (trimmed.length > 100 ? '...' : ''))
    sessionId.value = null
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      blocks: [{ type: 'text', content: trimmed }],
      timestamp: Date.now(),
    }
    addMessage(userMessage)
    setLoading(true)
    setStoppable(true)
    setError(null)
    backend.sendPrompt(trimmed)
  }

  function handleContinue(text: string) {
    // Continue current session if one exists, otherwise start new
    const trimmed = text.trim()
    console.log('[APP] handleContinue - sessionId:', sessionId.value, ', prompt:', trimmed.substring(0, 100) + (trimmed.length > 100 ? '...' : ''))
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      blocks: [{ type: 'text', content: trimmed }],
      timestamp: Date.now(),
    }
    addMessage(userMessage)
    setLoading(true)
    setStoppable(true)
    setError(null)
    if (sessionId.value) {
      console.log('[APP] Continuing existing session:', sessionId.value)
      backend.sendPromptWithSession(trimmed, sessionId.value)
    } else {
      console.log('[APP] No existing session, starting new')
      backend.sendPrompt(trimmed)
    }
  }

  function handleCancel() {
    console.log('[APP] handleCancel - stopping current prompt')
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
    saveTheme(id, null, intensity.value, spellCheck.value, backgroundColor.value)
  }

  function handleCustomAccent(hex: string) {
    setCustomAccent(hex)
    const colors = getThemeColors(activeThemeId.value, hex)
    applyTheme(colors)
    applyIntensity(intensity.value, hex)
    saveTheme(activeThemeId.value, hex, intensity.value, spellCheck.value, backgroundColor.value)
  }

  function handleIntensity(val: number) {
    setIntensity(val)
    const accent = customAccent.value || getThemeColors(activeThemeId.value, null).accent
    applyIntensity(val, accent)
    saveTheme(activeThemeId.value, customAccent.value, val, spellCheck.value, backgroundColor.value)
  }

  function handleSpellCheck(val: boolean) {
    setSpellCheck(val)
    saveTheme(activeThemeId.value, customAccent.value, intensity.value, val, backgroundColor.value)
  }

  function handleBackgroundColor(hex: string) {
    setBackgroundColor(hex)
    applyBackgroundColor(hex)
    saveTheme(activeThemeId.value, customAccent.value, intensity.value, spellCheck.value, hex)
  }

  function handleSelectSession(id: string) {
    console.log('Selected session:', id)
  }

  return (
    <div class="flex flex-col h-screen relative overflow-hidden scanline" style={{ background: 'var(--bg-color)' }}>
      <div class="relative z-10 flex items-center justify-end px-4 py-1 border-b shadow-md" style={{ background: 'var(--bg-color)', borderColor: 'var(--arctic-border)' }}>
        <Menu
          showSessions={showSessions}
          onToggleSessions={() => setShowSessions(!showSessions)}
          onOpenSettings={handleOpenSettings}
        />
      </div>
      <div class="flex flex-1 overflow-hidden">
        <div
          data-testid="sessions-panel"
          class={`overflow-y-auto transition-all duration-200 ease-in-out ${showSessions ? 'absolute sm:relative inset-y-0 left-0 sm:inset-auto w-[85vw] sm:w-64 z-20 sm:z-auto opacity-100 border-r' : 'w-0 opacity-0 overflow-hidden border-r-0'}`}
          style={{ background: 'var(--bg-color)', borderColor: 'var(--arctic-border)' }}
        >
          {showSessions && (
            <SessionList onSelect={handleSelectSession} selectedId={sessionId.value || undefined} listFn={backend.listSessions} />
          )}
        </div>
        <div data-testid="main-content" class="flex flex-col flex-1" onClick={() => { if (showSessions) setShowSessions(false) }}>
          <div class="flex-1 overflow-y-auto">
            <MessageList messages={messages.value} loading={loading.value} stoppable={stoppable.value} />
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
            stoppable={stoppable.value}
            spellCheck={spellCheck.value}
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
        spellCheck={spellCheck.value}
        backgroundColor={backgroundColor.value}
        onSelectPreset={handleSelectPreset}
        onCustomAccentChange={handleCustomAccent}
        onIntensityChange={handleIntensity}
        onSpellCheckChange={handleSpellCheck}
        onBackgroundColorChange={handleBackgroundColor}
      />
    </div>
  )
}
