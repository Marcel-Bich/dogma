import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/preact'
import { Menu } from './Menu'

describe('Menu', () => {
  const defaultProps = {
    showSessions: false,
    onToggleSessions: vi.fn(),
    onOpenSettings: vi.fn(),
  }

  function setup(overrides = {}) {
    const props = { ...defaultProps, onToggleSessions: vi.fn(), onOpenSettings: vi.fn(), ...overrides }
    const result = render(<Menu {...props} />)
    return { ...result, props }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders kebab button with aria-label="Menu"', () => {
    const { getByRole } = setup()
    const button = getByRole('button', { name: 'Menu' })
    expect(button).toBeTruthy()
  })

  it('kebab button has min 44x44px dimensions', () => {
    const { getByRole } = setup()
    const button = getByRole('button', { name: 'Menu' })
    expect(button.className).toContain('min-w-[44px]')
    expect(button.className).toContain('min-h-[44px]')
  })

  it('dropdown is hidden by default', () => {
    const { container } = setup()
    const dropdown = container.querySelector('[data-testid="menu-dropdown"]')
    expect(dropdown).toBeNull()
  })

  it('clicking button shows dropdown', () => {
    const { getByRole, container } = setup()
    const button = getByRole('button', { name: 'Menu' })
    fireEvent.click(button)
    const dropdown = container.querySelector('[data-testid="menu-dropdown"]')
    expect(dropdown).toBeTruthy()
  })

  it('dropdown contains "Sessions" item', () => {
    const { getByRole, getByText } = setup()
    const button = getByRole('button', { name: 'Menu' })
    fireEvent.click(button)
    expect(getByText('Sessions')).toBeTruthy()
  })

  it('dropdown contains "Settings" item', () => {
    const { getByRole, getByText } = setup()
    const button = getByRole('button', { name: 'Menu' })
    fireEvent.click(button)
    expect(getByText('Settings')).toBeTruthy()
  })

  it('clicking "Sessions" calls onToggleSessions and closes dropdown', () => {
    const { getByRole, getByText, container, props } = setup()
    const button = getByRole('button', { name: 'Menu' })
    fireEvent.click(button)
    const sessionsItem = getByText('Sessions')
    fireEvent.click(sessionsItem)
    expect(props.onToggleSessions).toHaveBeenCalledTimes(1)
    const dropdown = container.querySelector('[data-testid="menu-dropdown"]')
    expect(dropdown).toBeNull()
  })

  it('clicking "Settings" calls onOpenSettings and closes dropdown', () => {
    const { getByRole, getByText, container, props } = setup()
    const button = getByRole('button', { name: 'Menu' })
    fireEvent.click(button)
    const settingsItem = getByText('Settings')
    fireEvent.click(settingsItem)
    expect(props.onOpenSettings).toHaveBeenCalledTimes(1)
    const dropdown = container.querySelector('[data-testid="menu-dropdown"]')
    expect(dropdown).toBeNull()
  })

  it('"Sessions" item shows active state when showSessions=true', () => {
    const { getByRole, getByText } = setup({ showSessions: true })
    const button = getByRole('button', { name: 'Menu' })
    fireEvent.click(button)
    const sessionsItem = getByText('Sessions')
    expect(sessionsItem.style.borderLeft).toContain('2px')
  })

  it('"Sessions" item does not show active state when showSessions=false', () => {
    const { getByRole, getByText } = setup({ showSessions: false })
    const button = getByRole('button', { name: 'Menu' })
    fireEvent.click(button)
    const sessionsItem = getByText('Sessions')
    expect(sessionsItem.style.borderLeft).toBe('')
  })

  it('click outside closes dropdown', () => {
    const { getByRole, container } = setup()
    const button = getByRole('button', { name: 'Menu' })
    fireEvent.click(button)
    expect(container.querySelector('[data-testid="menu-dropdown"]')).toBeTruthy()
    // Click outside
    fireEvent.mouseDown(document.body)
    expect(container.querySelector('[data-testid="menu-dropdown"]')).toBeNull()
  })

  it('ESC key closes dropdown', () => {
    const { getByRole, container } = setup()
    const button = getByRole('button', { name: 'Menu' })
    fireEvent.click(button)
    expect(container.querySelector('[data-testid="menu-dropdown"]')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(container.querySelector('[data-testid="menu-dropdown"]')).toBeNull()
  })

  it('kebab button renders three dots', () => {
    const { getByRole } = setup()
    const button = getByRole('button', { name: 'Menu' })
    const dots = button.querySelectorAll('span')
    expect(dots.length).toBe(3)
  })

  it('kebab button highlights on hover', () => {
    const { getByRole } = setup()
    const button = getByRole('button', { name: 'Menu' })
    fireEvent.mouseEnter(button)
    expect(button.style.color).toBe('var(--arctic-cyan)')
    fireEvent.mouseLeave(button)
    expect(button.style.color).toBe('var(--arctic-dim)')
  })

  it('Sessions item highlights on hover', () => {
    const { getByRole, getByText } = setup()
    fireEvent.click(getByRole('button', { name: 'Menu' }))
    const item = getByText('Sessions')
    fireEvent.mouseEnter(item)
    expect(item.style.color).toBe('var(--arctic-text)')
    fireEvent.mouseLeave(item)
    expect(item.style.color).toBe('var(--arctic-dim)')
  })

  it('Sessions item keeps highlight on hover when active', () => {
    const { getByRole, getByText } = setup({ showSessions: true })
    fireEvent.click(getByRole('button', { name: 'Menu' }))
    const item = getByText('Sessions')
    fireEvent.mouseEnter(item)
    expect(item.style.color).toBe('var(--arctic-text)')
    fireEvent.mouseLeave(item)
    // When active, color stays as arctic-text (not reset to dim)
    expect(item.style.color).toBe('var(--arctic-text)')
  })

  it('Settings item highlights on hover', () => {
    const { getByRole, getByText } = setup()
    fireEvent.click(getByRole('button', { name: 'Menu' }))
    const item = getByText('Settings')
    fireEvent.mouseEnter(item)
    expect(item.style.color).toBe('var(--arctic-text)')
    fireEvent.mouseLeave(item)
    expect(item.style.color).toBe('var(--arctic-dim)')
  })

  it('clicking button toggles dropdown closed', () => {
    const { getByRole, container } = setup()
    const button = getByRole('button', { name: 'Menu' })
    fireEvent.click(button)
    expect(container.querySelector('[data-testid="menu-dropdown"]')).toBeTruthy()
    fireEvent.click(button)
    expect(container.querySelector('[data-testid="menu-dropdown"]')).toBeNull()
  })
})
