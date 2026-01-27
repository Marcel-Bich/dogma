import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/preact'
import { ContextMenu, ContextMenuItem } from './ContextMenu'

describe('ContextMenu', () => {
  const defaultItems: ContextMenuItem[] = [
    { label: 'Copy text', action: vi.fn() },
    { label: 'Copy markdown', action: vi.fn() },
  ]

  it('renders at specified position', () => {
    const { getByTestId } = render(
      <ContextMenu x={100} y={200} items={defaultItems} onClose={vi.fn()} />
    )
    const menu = getByTestId('context-menu')
    expect(menu.style.left).toBe('100px')
    expect(menu.style.top).toBe('200px')
  })

  it('renders all menu items', () => {
    const { getByText } = render(
      <ContextMenu x={0} y={0} items={defaultItems} onClose={vi.fn()} />
    )
    expect(getByText('Copy text')).toBeTruthy()
    expect(getByText('Copy markdown')).toBeTruthy()
  })

  it('calls action when item is clicked', () => {
    const action = vi.fn()
    const items: ContextMenuItem[] = [{ label: 'Test action', action }]
    const onClose = vi.fn()

    const { getByText } = render(
      <ContextMenu x={0} y={0} items={items} onClose={onClose} />
    )

    fireEvent.click(getByText('Test action'))
    expect(action).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('does not call action for disabled items', () => {
    const action = vi.fn()
    const items: ContextMenuItem[] = [{ label: 'Disabled', action, disabled: true }]

    const { getByText } = render(
      <ContextMenu x={0} y={0} items={items} onClose={vi.fn()} />
    )

    fireEvent.click(getByText('Disabled'))
    expect(action).not.toHaveBeenCalled()
  })

  it('renders separator items', () => {
    const items: ContextMenuItem[] = [
      { label: 'Before', action: vi.fn() },
      { label: '', action: vi.fn(), separator: true },
      { label: 'After', action: vi.fn() },
    ]

    const { container } = render(
      <ContextMenu x={0} y={0} items={items} onClose={vi.fn()} />
    )

    const separators = container.querySelectorAll('.context-menu-separator')
    expect(separators.length).toBe(1)
  })

  it('closes on Escape key', () => {
    const onClose = vi.fn()
    render(<ContextMenu x={0} y={0} items={defaultItems} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on click outside', () => {
    const onClose = vi.fn()
    render(<ContextMenu x={0} y={0} items={defaultItems} onClose={onClose} />)

    fireEvent.mouseDown(document.body)
    expect(onClose).toHaveBeenCalled()
  })

  it('applies disabled class to disabled items', () => {
    const items: ContextMenuItem[] = [{ label: 'Disabled item', action: vi.fn(), disabled: true }]

    const { container } = render(
      <ContextMenu x={0} y={0} items={items} onClose={vi.fn()} />
    )

    const disabledItem = container.querySelector('.context-menu-item.disabled')
    expect(disabledItem).toBeTruthy()
    expect(disabledItem?.textContent).toContain('Disabled item')
  })

  it('renders icon when provided', () => {
    const items: ContextMenuItem[] = [{ label: 'With icon', action: vi.fn(), icon: '📋' }]

    const { container } = render(
      <ContextMenu x={0} y={0} items={items} onClose={vi.fn()} />
    )

    const icon = container.querySelector('.context-menu-icon')
    expect(icon).toBeTruthy()
    expect(icon?.textContent).toBe('📋')
  })
})
