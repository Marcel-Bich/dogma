export interface ThemeColors {
  accent: string
  accentDark: string
  accentLight: string
  border: string
  text: string
  dim: string
  message: string
  thinking: string
  error: string
  black: string
}

export interface ThemePreset {
  id: string
  name: string
  colors: ThemeColors
}

export function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) {
    return [0, 0, Math.round(l * 100)]
  }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h: number
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6
  } else {
    h = ((r - g) / d + 4) / 6
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100
  const lNorm = l / 100

  if (sNorm === 0) {
    const val = Math.round(lNorm * 255)
    const hexVal = val.toString(16).padStart(2, '0')
    return `#${hexVal}${hexVal}${hexVal}`
  }

  const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm
  const p = 2 * lNorm - q
  const hNorm = h / 360

  const r = Math.round(hueToRgb(p, q, hNorm + 1 / 3) * 255)
  const g = Math.round(hueToRgb(p, q, hNorm) * 255)
  const b = Math.round(hueToRgb(p, q, hNorm - 1 / 3) * 255)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function deriveThemeColors(accent: string): ThemeColors {
  const [h, s, l] = hexToHsl(accent)

  return {
    accent,
    accentDark: hslToHex(h, s, Math.max(10, l - 15)),
    accentLight: hslToHex(h, s, Math.min(90, l + 15)),
    border: hslToHex(h, Math.max(10, s - 30), 20),
    text: '#c8c8d8',
    dim: hslToHex(h, 20, 40),
    message: '#e0f0ff',
    thinking: hslToHex(h, 30, 45),
    error: '#f87171',
    black: '#000000',
  }
}

export const PRESETS: ThemePreset[] = [
  {
    id: 'arctic-pro',
    name: 'Arctic Pro',
    colors: deriveThemeColors('#22d3ee'),
  },
  {
    id: 'pulse',
    name: 'Pulse',
    colors: deriveThemeColors('#a78bfa'),
  },
  {
    id: 'ember',
    name: 'Ember',
    colors: deriveThemeColors('#f59e0b'),
  },
]

const STORAGE_KEY = 'dogma-theme'
const DEFAULT_PRESET_ID = 'arctic-pro'

export function saveTheme(presetId: string, customAccent: string | null, intensity: number, spellCheck: boolean, backgroundColor: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ presetId, customAccent, intensity, spellCheck, backgroundColor }))
}

export function loadTheme(): { presetId: string; customAccent: string | null; intensity: number; spellCheck: boolean; backgroundColor: string } {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return { presetId: DEFAULT_PRESET_ID, customAccent: null, intensity: 50, spellCheck: false, backgroundColor: '#000000' }
  }
  try {
    const parsed = JSON.parse(stored)
    return {
      presetId: parsed.presetId,
      customAccent: parsed.customAccent,
      intensity: parsed.intensity ?? 50,
      spellCheck: parsed.spellCheck ?? false,
      backgroundColor: parsed.backgroundColor ?? '#000000',
    }
  } catch {
    return { presetId: DEFAULT_PRESET_ID, customAccent: null, intensity: 50, spellCheck: false, backgroundColor: '#000000' }
  }
}

export function getThemeColors(presetId: string, customAccent: string | null): ThemeColors {
  if (customAccent) {
    return deriveThemeColors(customAccent)
  }
  const preset = PRESETS.find((p) => p.id === presetId)
  if (preset) {
    return preset.colors
  }
  return PRESETS.find((p) => p.id === DEFAULT_PRESET_ID)!.colors
}

export function applyTheme(colors: ThemeColors): void {
  const style = document.documentElement.style
  style.setProperty('--arctic-cyan', colors.accent)
  style.setProperty('--arctic-cyan-dark', colors.accentDark)
  style.setProperty('--arctic-cyan-light', colors.accentLight)
  style.setProperty('--arctic-accent-rgb', hexToRgb(colors.accent))
  style.setProperty('--arctic-border', colors.border)
  style.setProperty('--arctic-text', colors.text)
  style.setProperty('--arctic-dim', colors.dim)
  style.setProperty('--arctic-message', colors.message)
  style.setProperty('--arctic-thinking', colors.thinking)
  style.setProperty('--arctic-error', colors.error)
  style.setProperty('--arctic-black', colors.black)
}

export function applyIntensity(intensityVal: number, accent: string): void {
  const [h] = hexToHsl(accent)
  const dimColor = hslToHex(h, 20, intensityVal)
  const style = document.documentElement.style
  style.setProperty('--arctic-dim', dimColor)

  // Brand opacity: linear scale from 0.4 (at 30) to 0.9 (at 90)
  const opacity = ((intensityVal - 30) / 60) * 0.5 + 0.4
  style.setProperty('--arctic-brand-opacity', opacity.toFixed(2).replace(/0$/, ''))
}
