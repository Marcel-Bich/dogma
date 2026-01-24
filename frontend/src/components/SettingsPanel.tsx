import { PRESETS } from '../themes'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  activePresetId: string
  customAccent: string | null
  intensity: number
  onSelectPreset: (id: string) => void
  onCustomAccentChange: (hex: string) => void
  onIntensityChange: (val: number) => void
}

export function SettingsPanel({
  open,
  onClose,
  activePresetId,
  customAccent,
  intensity,
  onSelectPreset,
  onCustomAccentChange,
  onIntensityChange,
}: SettingsPanelProps) {
  const currentAccent =
    customAccent || PRESETS.find((p) => p.id === activePresetId)?.colors.accent || '#22d3ee'

  return (
    <div
      data-testid="settings-panel"
      class="fixed top-0 right-0 bottom-0 overflow-y-auto"
      style={{
        width: '280px',
        background: '#000',
        borderLeft: '1px solid var(--arctic-border)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 200ms ease-in-out',
        zIndex: 40,
        padding: '16px',
      }}
    >
      <div class="flex justify-end mb-6">
        <button
          type="button"
          aria-label="Close settings"
          onClick={onClose}
          class="flex items-center justify-center"
          style={{
            minWidth: '44px',
            minHeight: '44px',
            color: 'var(--arctic-dim)',
          }}
        >
          x
        </button>
      </div>

      <div class="mb-6">
        <div
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--arctic-dim)',
            marginBottom: '12px',
          }}
        >
          Theme
        </div>
        <div class="flex gap-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              data-testid={`preset-${preset.id}`}
              aria-label={`Select ${preset.name} theme`}
              onClick={() => onSelectPreset(preset.id)}
              class="flex flex-col items-center"
              style={{ minWidth: '44px', minHeight: '44px', padding: '4px' }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: preset.colors.accent,
                  border:
                    preset.id === activePresetId && !customAccent
                      ? '2px solid var(--arctic-cyan)'
                      : '2px solid transparent',
                  boxShadow:
                    preset.id === activePresetId && !customAccent
                      ? '0 0 8px ' + preset.colors.accent
                      : 'none',
                }}
              />
              <span
                style={{ fontSize: '10px', color: 'var(--arctic-dim)', marginTop: '4px' }}
              >
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div class="mb-6">
        <div
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--arctic-dim)',
            marginBottom: '12px',
          }}
        >
          Custom
        </div>
        <div class="flex items-center gap-3">
          <span style={{ fontSize: '12px', color: 'var(--arctic-dim)' }}>Accent</span>
          <input
            type="color"
            aria-label="Custom accent color"
            value={currentAccent}
            onInput={(e) => onCustomAccentChange((e.target as HTMLInputElement).value)}
            style={{
              width: '44px',
              height: '44px',
              border: '1px solid var(--arctic-border)',
              borderRadius: '2px',
              cursor: 'pointer',
              background: 'none',
              padding: '2px',
            }}
          />
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--arctic-dim)',
            marginBottom: '12px',
          }}
        >
          Intensity
        </div>
        <div
          class="flex items-center"
          style={{ minHeight: '44px' }}
        >
          <input
            type="range"
            aria-label="Intensity"
            min="30"
            max="90"
            step="5"
            value={intensity}
            onInput={(e) => onIntensityChange(Number((e.target as HTMLInputElement).value))}
            style={{
              width: '100%',
              accentColor: currentAccent,
            }}
          />
        </div>
      </div>
    </div>
  )
}
