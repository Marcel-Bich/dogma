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
    onSelectPreset: vi.fn(),
    onCustomAccentChange: vi.fn(),
  }

  function setup(overrides = {}) {
    const props = {
      ...defaultProps,
      onClose: vi.fn(),
      onSelectPreset: vi.fn(),
      onCustomAccentChange: vi.fn(),
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
})
