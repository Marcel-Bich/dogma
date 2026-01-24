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

  it('renders textarea and send button', () => {
    const { getByLabelText, getByRole } = setup()
    expect(getByLabelText('Enter your prompt...')).toBeTruthy()
    expect(getByRole('button', { name: /send/i })).toBeTruthy()
  })

  it('send button is disabled when input is empty', () => {
    const { getByRole } = setup()
    const button = getByRole('button', { name: /send/i })
    expect(button).toHaveProperty('disabled', true)
  })

  it('send button is disabled when loading is true', () => {
    const { getByRole, getByLabelText } = setup({ loading: true })
    const textarea = getByLabelText('Enter your prompt...')
    fireEvent.input(textarea, { target: { value: 'some text' } })
    const button = getByRole('button', { name: /send/i })
    expect(button).toHaveProperty('disabled', true)
  })

  it('cancel button appears only when loading is true', () => {
    const { queryByRole, rerender } = setup({ loading: false })
    expect(queryByRole('button', { name: /cancel/i })).toBeNull()

    rerender(<ChatInput onSend={vi.fn()} onContinue={vi.fn()} onCancel={vi.fn()} loading={true} />)
    expect(queryByRole('button', { name: /cancel/i })).toBeTruthy()
  })

  it('onSend callback fires with trimmed input text when send clicked', () => {
    const { getByLabelText, getByRole, props } = setup()
    const textarea = getByLabelText('Enter your prompt...')
    fireEvent.input(textarea, { target: { value: '  hello world  ' } })
    const button = getByRole('button', { name: /send/i })
    fireEvent.click(button)
    expect(props.onSend).toHaveBeenCalledWith('hello world')
  })

  it('onCancel callback fires when cancel clicked', () => {
    const { getByRole, props } = setup({ loading: true })
    const button = getByRole('button', { name: /cancel/i })
    fireEvent.click(button)
    expect(props.onCancel).toHaveBeenCalledTimes(1)
  })

  it('input clears after successful send', () => {
    const { getByLabelText, getByRole } = setup()
    const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
    fireEvent.input(textarea, { target: { value: 'hello' } })
    const button = getByRole('button', { name: /send/i })
    fireEvent.click(button)
    expect(textarea.value).toBe('')
  })

  it('Enter key without Shift triggers send', () => {
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

  describe('textarea focus effects', () => {
    it('applies accent glow on focus using CSS variable', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.focus(textarea)
      expect(textarea.style.borderColor).toBe('rgba(var(--arctic-accent-rgb), 0.5)')
      expect(textarea.style.boxShadow).toContain('8px')
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

  describe('continue button', () => {
    it('renders continue button with correct aria-label', () => {
      const { getByRole } = setup()
      expect(getByRole('button', { name: /continue session/i })).toBeTruthy()
    })

    it('continue button is disabled when input is empty', () => {
      const { getByRole } = setup()
      const button = getByRole('button', { name: /continue session/i })
      expect(button).toHaveProperty('disabled', true)
    })

    it('continue button is disabled when loading is true', () => {
      const { getByRole, getByLabelText } = setup({ loading: true })
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'some text' } })
      const button = getByRole('button', { name: /continue session/i })
      expect(button).toHaveProperty('disabled', true)
    })

    it('onContinue callback fires with trimmed text when continue clicked', () => {
      const { getByLabelText, getByRole, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: '  resume work  ' } })
      const button = getByRole('button', { name: /continue session/i })
      fireEvent.click(button)
      expect(props.onContinue).toHaveBeenCalledWith('resume work')
    })

    it('input clears after continue is clicked', () => {
      const { getByLabelText, getByRole } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.input(textarea, { target: { value: 'continue' } })
      const button = getByRole('button', { name: /continue session/i })
      fireEvent.click(button)
      expect(textarea.value).toBe('')
    })

    it('continue does not fire when input is empty', () => {
      const { getByRole, props } = setup()
      const button = getByRole('button', { name: /continue session/i })
      fireEvent.click(button)
      expect(props.onContinue).not.toHaveBeenCalled()
    })
  })
})
