import { render, fireEvent } from '@testing-library/preact'
import { describe, it, expect, vi } from 'vitest'
import { ChatInput } from './ChatInput'

describe('ChatInput', () => {
  const defaultProps = {
    onSend: vi.fn(),
    onContinue: vi.fn(),
    onCancel: vi.fn(),
    loading: false,
  }

  function setup(overrides = {}) {
    const props = { ...defaultProps, onSend: vi.fn(), onContinue: vi.fn(), onCancel: vi.fn(), ...overrides }
    const result = render(<ChatInput {...props} />)
    return { ...result, props }
  }

  describe('textarea', () => {
    it('renders textarea with aria-label', () => {
      const { getByLabelText } = setup()
      expect(getByLabelText('Enter your prompt...')).toBeTruthy()
    })

    it('textarea has rows=1 for compact mobile layout', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      expect(textarea.rows).toBe(1)
    })

    it('applies accent glow on focus using CSS variable', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.focus(textarea)
      expect(textarea.style.borderColor).toBe('rgba(var(--arctic-accent-rgb), 0.5)')
      expect(textarea.style.boxShadow).toContain('var(--arctic-accent-rgb)')
    })

    it('removes glow on blur using CSS variable', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.focus(textarea)
      fireEvent.blur(textarea)
      expect(textarea.style.borderColor).toBe('rgba(var(--arctic-accent-rgb), 0.2)')
      expect(textarea.style.boxShadow).toBe('none')
    })
  })

  describe('action bar visibility', () => {
    it('action bar is hidden when textarea is empty', () => {
      const { queryByTestId } = setup()
      expect(queryByTestId('action-bar')).toBeNull()
    })

    it('action bar appears when text is entered', () => {
      const { getByLabelText, queryByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'hello' } })
      expect(queryByTestId('action-bar')).toBeTruthy()
    })

    it('action bar shows during loading even with empty text', () => {
      const { queryByTestId } = setup({ loading: true })
      expect(queryByTestId('action-bar')).toBeTruthy()
    })

    it('EXEC and CONT visible when text exists and not loading', () => {
      const { getByLabelText, getByRole } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      expect(getByRole('button', { name: /send/i })).toBeTruthy()
      expect(getByRole('button', { name: /continue session/i })).toBeTruthy()
    })

    it('EXEC and CONT hidden during loading, STOP shown', () => {
      const { queryByRole, getByRole } = setup({ loading: true })
      expect(queryByRole('button', { name: /send/i })).toBeNull()
      expect(queryByRole('button', { name: /continue session/i })).toBeNull()
      expect(getByRole('button', { name: /cancel/i })).toBeTruthy()
    })

    it('action buttons have no border styling', () => {
      const { getByLabelText, getByRole } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      const execBtn = getByRole('button', { name: /send/i }) as HTMLButtonElement
      expect(execBtn.style.borderStyle).toBe('none')
    })

    it('action buttons have min-height 44px for touch targets', () => {
      const { getByLabelText, getByRole } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      const execBtn = getByRole('button', { name: /send/i }) as HTMLButtonElement
      expect(execBtn.className).toContain('min-h-[44px]')
    })
  })

  describe('send action', () => {
    it('onSend fires with trimmed text when EXEC clicked', () => {
      const { getByLabelText, getByRole, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: '  hello world  ' } })
      fireEvent.click(getByRole('button', { name: /send/i }))
      expect(props.onSend).toHaveBeenCalledWith('hello world')
    })

    it('input clears after send', () => {
      const { getByLabelText, getByRole } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.input(textarea, { target: { value: 'hello' } })
      fireEvent.click(getByRole('button', { name: /send/i }))
      expect(textarea.value).toBe('')
    })

    it('Enter key triggers send', () => {
      const { getByLabelText, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'enter test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(props.onSend).toHaveBeenCalledWith('enter test')
    })

    it('Shift+Enter does NOT trigger send', () => {
      const { getByLabelText, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'multiline' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
      expect(props.onSend).not.toHaveBeenCalled()
    })

    it('Enter on empty input does not trigger send', () => {
      const { getByLabelText, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(props.onSend).not.toHaveBeenCalled()
    })

    it('send does not fire when loading', () => {
      const { getByLabelText, props } = setup({ loading: true })
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(props.onSend).not.toHaveBeenCalled()
    })
  })

  describe('continue action', () => {
    it('onContinue fires with trimmed text when CONT clicked', () => {
      const { getByLabelText, getByRole, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: '  resume  ' } })
      fireEvent.click(getByRole('button', { name: /continue session/i }))
      expect(props.onContinue).toHaveBeenCalledWith('resume')
    })

    it('input clears after continue', () => {
      const { getByLabelText, getByRole } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.input(textarea, { target: { value: 'cont' } })
      fireEvent.click(getByRole('button', { name: /continue session/i }))
      expect(textarea.value).toBe('')
    })
  })

  describe('cancel action', () => {
    it('onCancel fires when STOP clicked', () => {
      const { getByRole, props } = setup({ loading: true })
      fireEvent.click(getByRole('button', { name: /cancel/i }))
      expect(props.onCancel).toHaveBeenCalledTimes(1)
    })
  })
})
