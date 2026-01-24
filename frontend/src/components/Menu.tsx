import { useState, useEffect, useRef } from 'preact/hooks'

interface MenuProps {
  showSessions: boolean
  onToggleSessions: () => void
  onOpenSettings: () => void
}

export function Menu({ showSessions, onToggleSessions, onOpenSettings }: MenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleToggleSessions() {
    setOpen(false)
    onToggleSessions()
  }

  function handleOpenSettings() {
    setOpen(false)
    onOpenSettings()
  }

  return (
    <div class="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Menu"
        onClick={() => setOpen(!open)}
        class="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-[4px] transition-colors duration-200"
        style={{ color: 'var(--arctic-dim)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--arctic-cyan)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--arctic-dim)' }}
      >
        <span class="block rounded-full" style={{ width: '3px', height: '3px', background: 'currentColor' }} />
        <span class="block rounded-full" style={{ width: '3px', height: '3px', background: 'currentColor' }} />
        <span class="block rounded-full" style={{ width: '3px', height: '3px', background: 'currentColor' }} />
      </button>

      {open && (
        <div
          data-testid="menu-dropdown"
          class="absolute right-0 top-full mt-1 z-50"
          style={{
            background: '#000',
            border: '1px solid var(--arctic-border)',
            minWidth: '160px',
            maxWidth: 'calc(100vw - 32px)',
          }}
        >
          <button
            type="button"
            onClick={handleToggleSessions}
            class="w-full text-left py-3 px-4 text-xs uppercase transition-colors duration-150"
            style={{
              letterSpacing: '0.1em',
              color: showSessions ? 'var(--arctic-text)' : 'var(--arctic-dim)',
              borderLeft: showSessions ? '2px solid var(--arctic-cyan)' : '',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--arctic-text)' }}
            onMouseLeave={(e) => { if (!showSessions) (e.currentTarget as HTMLElement).style.color = 'var(--arctic-dim)' }}
          >
            Sessions
          </button>
          <button
            type="button"
            onClick={handleOpenSettings}
            class="w-full text-left py-3 px-4 text-xs uppercase transition-colors duration-150"
            style={{
              letterSpacing: '0.1em',
              color: 'var(--arctic-dim)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--arctic-text)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--arctic-dim)' }}
          >
            Settings
          </button>
        </div>
      )}
    </div>
  )
}
