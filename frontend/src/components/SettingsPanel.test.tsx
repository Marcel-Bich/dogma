import { render, fireEvent } from '@testing-library/preact'
import { describe, it, expect, vi } from 'vitest'
import { SettingsPanel } from './SettingsPanel'
import { PRESETS } from '../themes'

describe('SettingsPanel', () => {
  const defaultProps = {
    open: false,
    onClose: vi.fn(),
    activePresetId: 'arctic-pro',
    customAccent: null as string | null,
    intensity: 50,
    spellCheck: false,
    backgroundColor: '#000000',
    onSelectPreset: vi.fn(),
    onCustomAccentChange: vi.fn(),
    onIntensityChange: vi.fn(),
    onSpellCheckChange: vi.fn(),
    onBackgroundColorChange: vi.fn(),
  }

  function setup(overrides = {}) {
    const props = {
      ...defaultProps,
      onClose: vi.fn(),
      onSelectPreset: vi.fn(),
      onCustomAccentChange: vi.fn(),
      onIntensityChange: vi.fn(),
      onSpellCheckChange: vi.fn(),
      onBackgroundColorChange: vi.fn(),
      ...overrides,
    }
    const result = render(<SettingsPanel {...props} />)
    return { ...result, props }
  }

  describe('visibility', () => {
    it('has translateX(100%) when open is false', () => {
      const { getByTestId } = setup({ open: false })
      const panel = getByTestId('settings-panel')
      expect(panel.style.transform).toBe('translateX(100%)')
    })

    it('has translateX(0) when open is true', () => {
      const { getByTestId } = setup({ open: true })
      const panel = getByTestId('settings-panel')
      expect(panel.style.transform).toBe('translateX(0)')
    })
  })

  describe('close button', () => {
    it('renders close button with aria-label "Close settings"', () => {
      const { getByRole } = setup({ open: true })
      const btn = getByRole('button', { name: 'Close settings' })
      expect(btn).toBeTruthy()
    })

    it('calls onClose when close button is clicked', () => {
      const { getByRole, props } = setup({ open: true })
      const btn = getByRole('button', { name: 'Close settings' })
      fireEvent.click(btn)
      expect(props.onClose).toHaveBeenCalledTimes(1)
    })

    it('close button has minimum 44px dimensions', () => {
      const { getByRole } = setup({ open: true })
      const btn = getByRole('button', { name: 'Close settings' })
      expect(btn.style.minWidth).toBe('44px')
      expect(btn.style.minHeight).toBe('44px')
    })
  })

  describe('theme section', () => {
    it('renders "THEME" section header', () => {
      const { container } = setup({ open: true })
      const headers = container.querySelectorAll('div')
      const themeHeader = Array.from(headers).find(
        (el) => el.textContent === 'Theme' && el.style.textTransform === 'uppercase'
      )
      expect(themeHeader).toBeTruthy()
    })

    it('renders a preset button for each preset', () => {
      const { getByTestId } = setup({ open: true })
      for (const preset of PRESETS) {
        expect(getByTestId(`preset-${preset.id}`)).toBeTruthy()
      }
    })

    it('active preset has ring border styling', () => {
      const { getByTestId } = setup({ open: true, activePresetId: 'arctic-pro', customAccent: null })
      const activeBtn = getByTestId('preset-arctic-pro')
      const circle = activeBtn.querySelector('div')
      expect(circle!.style.border).toContain('2px solid var(--arctic-cyan)')
    })

    it('inactive preset has transparent border', () => {
      const { getByTestId } = setup({ open: true, activePresetId: 'arctic-pro', customAccent: null })
      const inactiveBtn = getByTestId('preset-pulse')
      const circle = inactiveBtn.querySelector('div')
      expect(circle!.style.border).toContain('transparent')
    })

    it('custom accent disables preset ring on all presets', () => {
      const { getByTestId } = setup({ open: true, activePresetId: 'arctic-pro', customAccent: '#ff0000' })
      const btn = getByTestId('preset-arctic-pro')
      const circle = btn.querySelector('div')
      expect(circle!.style.border).toContain('transparent')
    })

    it('clicking a preset calls onSelectPreset with correct id', () => {
      const { getByTestId, props } = setup({ open: true })
      fireEvent.click(getByTestId('preset-pulse'))
      expect(props.onSelectPreset).toHaveBeenCalledWith('pulse')
    })

    it('each preset button has minimum 44px touch target', () => {
      const { getByTestId } = setup({ open: true })
      for (const preset of PRESETS) {
        const btn = getByTestId(`preset-${preset.id}`)
        expect(btn.style.minWidth).toBe('44px')
        expect(btn.style.minHeight).toBe('44px')
      }
    })
  })

  describe('custom section', () => {
    it('renders "CUSTOM" section header', () => {
      const { container } = setup({ open: true })
      const headers = container.querySelectorAll('div')
      const customHeader = Array.from(headers).find(
        (el) => el.textContent === 'Custom' && el.style.textTransform === 'uppercase'
      )
      expect(customHeader).toBeTruthy()
    })

    it('renders color input with type="color"', () => {
      const { getByLabelText } = setup({ open: true })
      const input = getByLabelText('Custom accent color') as HTMLInputElement
      expect(input.type).toBe('color')
    })

    it('color input shows customAccent when provided', () => {
      const { getByLabelText } = setup({ open: true, customAccent: '#ff5500' })
      const input = getByLabelText('Custom accent color') as HTMLInputElement
      expect(input.value).toBe('#ff5500')
    })

    it('color input shows active preset accent when no customAccent', () => {
      const expectedAccent = PRESETS.find((p) => p.id === 'pulse')!.colors.accent
      const { getByLabelText } = setup({ open: true, activePresetId: 'pulse', customAccent: null })
      const input = getByLabelText('Custom accent color') as HTMLInputElement
      expect(input.value).toBe(expectedAccent)
    })

    it('color input falls back to default accent when preset not found', () => {
      const { getByLabelText } = setup({ open: true, activePresetId: 'nonexistent', customAccent: null })
      const input = getByLabelText('Custom accent color') as HTMLInputElement
      expect(input.value).toBe('#22d3ee')
    })

    it('changing color input calls onCustomAccentChange', () => {
      const { getByLabelText, props } = setup({ open: true })
      const input = getByLabelText('Custom accent color') as HTMLInputElement
      fireEvent.input(input, { target: { value: '#abcdef' } })
      expect(props.onCustomAccentChange).toHaveBeenCalledWith('#abcdef')
    })
  })

  describe('intensity section', () => {
    it('renders "INTENSITY" section header', () => {
      const { container } = setup({ open: true })
      const headers = container.querySelectorAll('div')
      const intensityHeader = Array.from(headers).find(
        (el) => el.textContent === 'Intensity' && el.style.textTransform === 'uppercase'
      )
      expect(intensityHeader).toBeTruthy()
    })

    it('renders range input with aria-label "Intensity"', () => {
      const { getByLabelText } = setup({ open: true })
      const input = getByLabelText('Intensity') as HTMLInputElement
      expect(input.type).toBe('range')
    })

    it('range input has min=30', () => {
      const { getByLabelText } = setup({ open: true })
      const input = getByLabelText('Intensity') as HTMLInputElement
      expect(input.min).toBe('30')
    })

    it('range input has max=90', () => {
      const { getByLabelText } = setup({ open: true })
      const input = getByLabelText('Intensity') as HTMLInputElement
      expect(input.max).toBe('90')
    })

    it('range input has step=5', () => {
      const { getByLabelText } = setup({ open: true })
      const input = getByLabelText('Intensity') as HTMLInputElement
      expect(input.step).toBe('5')
    })

    it('range input reflects intensity prop value', () => {
      const { getByLabelText } = setup({ open: true, intensity: 70 })
      const input = getByLabelText('Intensity') as HTMLInputElement
      expect(input.value).toBe('70')
    })

    it('changing range input calls onIntensityChange with number', () => {
      const { getByLabelText, props } = setup({ open: true, intensity: 50 })
      const input = getByLabelText('Intensity') as HTMLInputElement
      fireEvent.input(input, { target: { value: '65' } })
      expect(props.onIntensityChange).toHaveBeenCalledWith(65)
    })

    it('intensity slider wrapper has minimum 44px height for touch target', () => {
      const { getByLabelText } = setup({ open: true })
      const input = getByLabelText('Intensity') as HTMLInputElement
      const wrapper = input.parentElement!
      expect(wrapper.style.minHeight).toBe('44px')
    })
  })

  describe('panel dimensions', () => {
    it('panel has 280px width', () => {
      const { getByTestId } = setup({ open: true })
      const panel = getByTestId('settings-panel')
      expect(panel.style.width).toBe('280px')
    })

    it('panel has transition style for transform', () => {
      const { getByTestId } = setup({ open: true })
      const panel = getByTestId('settings-panel')
      expect(panel.style.transition).toBe('transform 200ms ease-in-out')
    })

    it('panel has z-index 40', () => {
      const { getByTestId } = setup({ open: true })
      const panel = getByTestId('settings-panel')
      expect(panel.style.zIndex).toBe('40')
    })
  })

  describe('spell check section', () => {
    it('renders "INPUT" section header', () => {
      const { container } = setup({ open: true })
      const headers = container.querySelectorAll('div')
      const inputHeader = Array.from(headers).find(
        (el) => el.textContent === 'Input' && el.style.textTransform === 'uppercase'
      )
      expect(inputHeader).toBeTruthy()
    })

    it('renders spell check toggle with aria-label', () => {
      const { getByLabelText } = setup({ open: true })
      const toggle = getByLabelText('Spell check') as HTMLInputElement
      expect(toggle.type).toBe('checkbox')
    })

    it('spell check toggle reflects spellCheck prop when false', () => {
      const { getByLabelText } = setup({ open: true, spellCheck: false })
      const toggle = getByLabelText('Spell check') as HTMLInputElement
      expect(toggle.checked).toBe(false)
    })

    it('spell check toggle reflects spellCheck prop when true', () => {
      const { getByLabelText } = setup({ open: true, spellCheck: true })
      const toggle = getByLabelText('Spell check') as HTMLInputElement
      expect(toggle.checked).toBe(true)
    })

    it('changing spell check toggle calls onSpellCheckChange', () => {
      const { getByLabelText, props } = setup({ open: true, spellCheck: false })
      const toggle = getByLabelText('Spell check') as HTMLInputElement
      fireEvent.click(toggle)
      expect(props.onSpellCheckChange).toHaveBeenCalledWith(true)
    })

    it('spell check toggle has minimum 44px touch target', () => {
      const { getByLabelText } = setup({ open: true })
      const toggle = getByLabelText('Spell check') as HTMLInputElement
      const wrapper = toggle.closest('label')!
      expect(wrapper.style.minHeight).toBe('44px')
    })
  })

  describe('background color section', () => {
    it('renders "BACKGROUND" section header', () => {
      const { container } = setup({ open: true })
      const headers = container.querySelectorAll('div')
      const bgHeader = Array.from(headers).find(
        (el) => el.textContent === 'Background' && el.style.textTransform === 'uppercase'
      )
      expect(bgHeader).toBeTruthy()
    })

    it('renders background color picker with aria-label', () => {
      const { getByLabelText } = setup({ open: true })
      const input = getByLabelText('Background color') as HTMLInputElement
      expect(input.type).toBe('color')
    })

    it('background color picker shows backgroundColor prop value', () => {
      const { getByLabelText } = setup({ open: true, backgroundColor: '#112233' })
      const input = getByLabelText('Background color') as HTMLInputElement
      expect(input.value).toBe('#112233')
    })

    it('changing background color calls onBackgroundColorChange', () => {
      const { getByLabelText, props } = setup({ open: true })
      const input = getByLabelText('Background color') as HTMLInputElement
      fireEvent.input(input, { target: { value: '#ff0000' } })
      expect(props.onBackgroundColorChange).toHaveBeenCalledWith('#ff0000')
    })

    it('background color picker has minimum 44px dimensions', () => {
      const { getByLabelText } = setup({ open: true })
      const input = getByLabelText('Background color') as HTMLInputElement
      expect(input.style.width).toBe('44px')
      expect(input.style.height).toBe('44px')
    })
  })

  describe('panel background', () => {
    it('panel uses var(--bg-color) for background', () => {
      const { getByTestId } = setup({ open: true })
      const panel = getByTestId('settings-panel')
      expect(panel.style.background).toBe('var(--bg-color)')
    })

    it('panel has no border-left when closed', () => {
      const { getByTestId } = setup({ open: false })
      const panel = getByTestId('settings-panel')
      // jsdom interprets borderLeft: 'none' as setting borderLeftStyle to 'none'
      expect(panel.style.borderLeftStyle).toBe('none')
    })

    it('panel has border-left when open', () => {
      const { getByTestId } = setup({ open: true })
      const panel = getByTestId('settings-panel')
      expect(panel.style.borderLeft).toContain('var(--arctic-border)')
    })
  })
})
