import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  hexToHsl,
  hexToRgb,
  hslToHex,
  deriveThemeColors,
  PRESETS,
  saveTheme,
  loadTheme,
  getThemeColors,
  applyTheme,
  type ThemeColors,
} from './themes'

describe('themes', () => {
  describe('hexToHsl', () => {
    it('converts pure red #ff0000 to [0, 100, 50]', () => {
      expect(hexToHsl('#ff0000')).toEqual([0, 100, 50])
    })

    it('converts #22d3ee to approximately [188, 86, 53]', () => {
      const [h, s, l] = hexToHsl('#22d3ee')
      expect(h).toBe(188)
      expect(s).toBe(86)
      expect(l).toBe(53)
    })

    it('converts pure white #ffffff to [0, 0, 100]', () => {
      expect(hexToHsl('#ffffff')).toEqual([0, 0, 100])
    })

    it('converts pure black #000000 to [0, 0, 0]', () => {
      expect(hexToHsl('#000000')).toEqual([0, 0, 0])
    })

    it('converts pure green #00ff00 to [120, 100, 50]', () => {
      expect(hexToHsl('#00ff00')).toEqual([120, 100, 50])
    })

    it('converts pure blue #0000ff to [240, 100, 50]', () => {
      expect(hexToHsl('#0000ff')).toEqual([240, 100, 50])
    })
  })

  describe('hexToRgb', () => {
    it('converts #22d3ee to "34, 211, 238"', () => {
      expect(hexToRgb('#22d3ee')).toBe('34, 211, 238')
    })

    it('converts #ff0000 to "255, 0, 0"', () => {
      expect(hexToRgb('#ff0000')).toBe('255, 0, 0')
    })

    it('converts #00ff00 to "0, 255, 0"', () => {
      expect(hexToRgb('#00ff00')).toBe('0, 255, 0')
    })

    it('converts #0000ff to "0, 0, 255"', () => {
      expect(hexToRgb('#0000ff')).toBe('0, 0, 255')
    })

    it('converts #000000 to "0, 0, 0"', () => {
      expect(hexToRgb('#000000')).toBe('0, 0, 0')
    })

    it('converts #ffffff to "255, 255, 255"', () => {
      expect(hexToRgb('#ffffff')).toBe('255, 255, 255')
    })

    it('converts #a78bfa to "167, 139, 250"', () => {
      expect(hexToRgb('#a78bfa')).toBe('167, 139, 250')
    })
  })

  describe('hslToHex', () => {
    it('converts (0, 100, 50) to #ff0000', () => {
      expect(hslToHex(0, 100, 50)).toBe('#ff0000')
    })

    it('converts (187, 85, 53) to close to #22d3ee', () => {
      const hex = hslToHex(187, 85, 53)
      // Convert back to verify round-trip accuracy
      const [h, s, l] = hexToHsl(hex)
      expect(h).toBeCloseTo(187, 0)
      expect(s).toBeCloseTo(85, 0)
      expect(l).toBeCloseTo(53, 0)
    })

    it('converts (120, 100, 50) to #00ff00', () => {
      expect(hslToHex(120, 100, 50)).toBe('#00ff00')
    })

    it('converts (0, 0, 100) to #ffffff', () => {
      expect(hslToHex(0, 0, 100)).toBe('#ffffff')
    })

    it('converts (0, 0, 0) to #000000', () => {
      expect(hslToHex(0, 0, 0)).toBe('#000000')
    })
  })

  describe('round-trip conversion', () => {
    it('hexToHsl(hslToHex(h,s,l)) returns same values within rounding tolerance', () => {
      const cases: [number, number, number][] = [
        [0, 100, 50],
        [120, 80, 40],
        [240, 60, 70],
        [300, 50, 25],
        [60, 90, 60],
      ]
      for (const [h, s, l] of cases) {
        const hex = hslToHex(h, s, l)
        const [rh, rs, rl] = hexToHsl(hex)
        // Allow +/- 1 due to 8-bit RGB quantization
        expect(Math.abs(rh - h)).toBeLessThanOrEqual(1)
        expect(Math.abs(rs - s)).toBeLessThanOrEqual(1)
        expect(Math.abs(rl - l)).toBeLessThanOrEqual(1)
      }
    })

    it('hslToHex(hexToHsl(hex)) returns same hex', () => {
      const cases = ['#ff0000', '#00ff00', '#0000ff']
      for (const hex of cases) {
        const [h, s, l] = hexToHsl(hex)
        expect(hslToHex(h, s, l)).toBe(hex)
      }
    })
  })

  describe('deriveThemeColors', () => {
    it('returns a correct ThemeColors object from #22d3ee', () => {
      const colors = deriveThemeColors('#22d3ee')
      expect(colors.accent).toBe('#22d3ee')
      expect(colors.text).toBe('#c8c8d8')
      expect(colors.message).toBe('#e0f0ff')
      expect(colors.error).toBe('#f87171')
      expect(colors.black).toBe('#000000')
    })

    it('keeps text, message, error, black fixed regardless of accent', () => {
      const colors1 = deriveThemeColors('#ff0000')
      const colors2 = deriveThemeColors('#00ff00')
      const colors3 = deriveThemeColors('#0000ff')

      for (const colors of [colors1, colors2, colors3]) {
        expect(colors.text).toBe('#c8c8d8')
        expect(colors.message).toBe('#e0f0ff')
        expect(colors.error).toBe('#f87171')
        expect(colors.black).toBe('#000000')
      }
    })

    it('derives border from accent hue with reduced saturation and lightness 20', () => {
      const colors = deriveThemeColors('#22d3ee')
      const [h, s] = hexToHsl('#22d3ee')
      const [bh, bs, bl] = hexToHsl(colors.border)
      expect(Math.abs(bh - h)).toBeLessThanOrEqual(1)
      // border sat = max(10, accentSat - 30), allow rounding tolerance
      expect(Math.abs(bs - Math.max(10, s - 30))).toBeLessThanOrEqual(1)
      expect(Math.abs(bl - 20)).toBeLessThanOrEqual(1)
    })

    it('derives dim from accent hue with saturation 20 and lightness 40', () => {
      const colors = deriveThemeColors('#22d3ee')
      const [h] = hexToHsl('#22d3ee')
      const [dh, ds, dl] = hexToHsl(colors.dim)
      expect(dh).toBeCloseTo(h, 0)
      expect(ds).toBeCloseTo(20, 0)
      expect(dl).toBeCloseTo(40, 0)
    })

    it('derives thinking from accent hue with saturation 30 and lightness 45', () => {
      const colors = deriveThemeColors('#22d3ee')
      const [h] = hexToHsl('#22d3ee')
      const [th, ts, tl] = hexToHsl(colors.thinking)
      expect(th).toBeCloseTo(h, 0)
      expect(ts).toBeCloseTo(30, 0)
      expect(tl).toBeCloseTo(45, 0)
    })

    it('accentDark is darker than accent', () => {
      const colors = deriveThemeColors('#22d3ee')
      const [, , accentL] = hexToHsl(colors.accent)
      const [, , darkL] = hexToHsl(colors.accentDark)
      expect(darkL).toBeLessThan(accentL)
    })

    it('accentLight is lighter than accent', () => {
      const colors = deriveThemeColors('#22d3ee')
      const [, , accentL] = hexToHsl(colors.accent)
      const [, , lightL] = hexToHsl(colors.accentLight)
      expect(lightL).toBeGreaterThan(accentL)
    })

    it('accentDark has lightness - 15 from accent (min 10)', () => {
      const colors = deriveThemeColors('#22d3ee')
      const [, , accentL] = hexToHsl(colors.accent)
      const [, , darkL] = hexToHsl(colors.accentDark)
      expect(darkL).toBeCloseTo(Math.max(10, accentL - 15), 0)
    })

    it('accentLight has lightness + 15 from accent (max 90)', () => {
      const colors = deriveThemeColors('#22d3ee')
      const [, , accentL] = hexToHsl(colors.accent)
      const [, , lightL] = hexToHsl(colors.accentLight)
      expect(lightL).toBeCloseTo(Math.min(90, accentL + 15), 0)
    })

    it('clamps accentDark lightness to min 10 for very dark accents', () => {
      // Use a very dark color (lightness ~10)
      const darkHex = hslToHex(200, 80, 12)
      const colors = deriveThemeColors(darkHex)
      const [, , darkL] = hexToHsl(colors.accentDark)
      expect(darkL).toBeGreaterThanOrEqual(9) // allow rounding
    })

    it('clamps accentLight lightness to max 90 for very light accents', () => {
      // Use a very light color (lightness ~85)
      const lightHex = hslToHex(200, 80, 85)
      const colors = deriveThemeColors(lightHex)
      const [, , lightL] = hexToHsl(colors.accentLight)
      expect(lightL).toBeLessThanOrEqual(91) // allow rounding
    })

    it('clamps border saturation to min 10', () => {
      // Use a color with low saturation (< 40) so that sat - 30 would go below 10
      const lowSatHex = hslToHex(200, 20, 50)
      const colors = deriveThemeColors(lowSatHex)
      const [, bs] = hexToHsl(colors.border)
      expect(bs).toBeGreaterThanOrEqual(9) // allow rounding
    })
  })

  describe('PRESETS', () => {
    it('has 3 entries', () => {
      expect(PRESETS).toHaveLength(3)
    })

    it('each preset has id, name, and colors with all required fields', () => {
      const requiredColorKeys: (keyof ThemeColors)[] = [
        'accent',
        'accentDark',
        'accentLight',
        'border',
        'text',
        'dim',
        'message',
        'thinking',
        'error',
        'black',
      ]
      for (const preset of PRESETS) {
        expect(preset.id).toBeDefined()
        expect(typeof preset.id).toBe('string')
        expect(preset.name).toBeDefined()
        expect(typeof preset.name).toBe('string')
        expect(preset.colors).toBeDefined()
        for (const key of requiredColorKeys) {
          expect(preset.colors[key]).toBeDefined()
          expect(typeof preset.colors[key]).toBe('string')
        }
      }
    })

    it('arctic-pro preset has accent #22d3ee', () => {
      const arctic = PRESETS.find((p) => p.id === 'arctic-pro')
      expect(arctic).toBeDefined()
      expect(arctic!.colors.accent).toBe('#22d3ee')
    })

    it('pulse preset has accent #a78bfa', () => {
      const pulse = PRESETS.find((p) => p.id === 'pulse')
      expect(pulse).toBeDefined()
      expect(pulse!.colors.accent).toBe('#a78bfa')
    })

    it('ember preset has accent #f59e0b', () => {
      const ember = PRESETS.find((p) => p.id === 'ember')
      expect(ember).toBeDefined()
      expect(ember!.colors.accent).toBe('#f59e0b')
    })

    it('preset colors match deriveThemeColors output', () => {
      for (const preset of PRESETS) {
        const derived = deriveThemeColors(preset.colors.accent)
        expect(preset.colors).toEqual(derived)
      }
    })
  })

  describe('localStorage persistence', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    describe('loadTheme', () => {
      it('returns default when localStorage is empty', () => {
        const result = loadTheme()
        expect(result).toEqual({ presetId: 'arctic-pro', customAccent: null })
      })

      it('parses valid stored JSON', () => {
        localStorage.setItem(
          'dogma-theme',
          JSON.stringify({ presetId: 'pulse', customAccent: '#ff0000' })
        )
        const result = loadTheme()
        expect(result).toEqual({ presetId: 'pulse', customAccent: '#ff0000' })
      })

      it('returns default on malformed JSON', () => {
        localStorage.setItem('dogma-theme', 'not valid json{{{')
        const result = loadTheme()
        expect(result).toEqual({ presetId: 'arctic-pro', customAccent: null })
      })
    })

    describe('saveTheme', () => {
      it('stores correct JSON with key dogma-theme', () => {
        saveTheme('ember', '#abcdef')
        const stored = localStorage.getItem('dogma-theme')
        expect(stored).not.toBeNull()
        expect(JSON.parse(stored!)).toEqual({
          presetId: 'ember',
          customAccent: '#abcdef',
        })
      })

      it('stores null customAccent correctly', () => {
        saveTheme('arctic-pro', null)
        const stored = localStorage.getItem('dogma-theme')
        expect(JSON.parse(stored!)).toEqual({
          presetId: 'arctic-pro',
          customAccent: null,
        })
      })
    })
  })

  describe('getThemeColors', () => {
    it('returns arctic-pro preset colors when presetId is arctic-pro and no custom accent', () => {
      const colors = getThemeColors('arctic-pro', null)
      const arcticPreset = PRESETS.find((p) => p.id === 'arctic-pro')!
      expect(colors).toEqual(arcticPreset.colors)
    })

    it('returns pulse preset colors when presetId is pulse and no custom accent', () => {
      const colors = getThemeColors('pulse', null)
      const pulsePreset = PRESETS.find((p) => p.id === 'pulse')!
      expect(colors).toEqual(pulsePreset.colors)
    })

    it('returns derived colors from custom accent (ignores preset)', () => {
      const colors = getThemeColors('arctic-pro', '#ff0000')
      const derived = deriveThemeColors('#ff0000')
      expect(colors).toEqual(derived)
    })

    it('returns arctic-pro colors as fallback for unknown preset id', () => {
      const colors = getThemeColors('unknown-id', null)
      const arcticPreset = PRESETS.find((p) => p.id === 'arctic-pro')!
      expect(colors).toEqual(arcticPreset.colors)
    })
  })

  describe('applyTheme', () => {
    it('sets all CSS variables on document.documentElement', () => {
      const colors = deriveThemeColors('#22d3ee')
      applyTheme(colors)

      const style = document.documentElement.style
      expect(style.getPropertyValue('--arctic-cyan')).toBe(colors.accent)
      expect(style.getPropertyValue('--arctic-cyan-dark')).toBe(colors.accentDark)
      expect(style.getPropertyValue('--arctic-cyan-light')).toBe(colors.accentLight)
      expect(style.getPropertyValue('--arctic-border')).toBe(colors.border)
      expect(style.getPropertyValue('--arctic-text')).toBe(colors.text)
      expect(style.getPropertyValue('--arctic-dim')).toBe(colors.dim)
      expect(style.getPropertyValue('--arctic-message')).toBe(colors.message)
      expect(style.getPropertyValue('--arctic-thinking')).toBe(colors.thinking)
      expect(style.getPropertyValue('--arctic-error')).toBe(colors.error)
      expect(style.getPropertyValue('--arctic-black')).toBe(colors.black)
    })

    it('sets --arctic-accent-rgb from accent color', () => {
      const colors = deriveThemeColors('#22d3ee')
      applyTheme(colors)

      const style = document.documentElement.style
      expect(style.getPropertyValue('--arctic-accent-rgb')).toBe('34, 211, 238')
    })

    it('sets --arctic-accent-rgb correctly for non-default accent', () => {
      const colors = deriveThemeColors('#a78bfa')
      applyTheme(colors)

      const style = document.documentElement.style
      expect(style.getPropertyValue('--arctic-accent-rgb')).toBe('167, 139, 250')
    })

    it('overwrites previously applied theme', () => {
      const colors1 = deriveThemeColors('#ff0000')
      const colors2 = deriveThemeColors('#00ff00')

      applyTheme(colors1)
      applyTheme(colors2)

      const style = document.documentElement.style
      expect(style.getPropertyValue('--arctic-cyan')).toBe(colors2.accent)
      expect(style.getPropertyValue('--arctic-cyan-dark')).toBe(colors2.accentDark)
      expect(style.getPropertyValue('--arctic-accent-rgb')).toBe('0, 255, 0')
    })
  })
})
