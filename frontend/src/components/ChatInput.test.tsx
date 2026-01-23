import { render, fireEvent } from '@testing-library/preact'
import { describe, it, expect, vi } from 'vitest'
import { ChatInput } from './ChatInput'

describe('ChatInput', () => {
  const defaultProps = {
    onSend: vi.fn(),
    onCancel: vi.fn(),
    loading: false,
  }

  function setup(overrides = {}) {
    const props = { ...defaultProps, onSend: vi.fn(), onCancel: vi.fn(), ...overrides }
    const result = render(<ChatInput {...props} />)
    return { ...result, props }
  }

  it('renders textarea and send button', () => {
    const { getByPlaceholderText, getByRole } = setup()
    expect(getByPlaceholderText('Enter your prompt...')).toBeTruthy()
    expect(getByRole('button', { name: /send/i })).toBeTruthy()
  })

  it('send button is disabled when input is empty', () => {
    const { getByRole } = setup()
    const button = getByRole('button', { name: /send/i })
    expect(button).toHaveProperty('disabled', true)
  })

  it('send button is disabled when loading is true', () => {
    const { getByRole, getByPlaceholderText } = setup({ loading: true })
    const textarea = getByPlaceholderText('Enter your prompt...')
    fireEvent.input(textarea, { target: { value: 'some text' } })
    const button = getByRole('button', { name: /send/i })
    expect(button).toHaveProperty('disabled', true)
  })

  it('cancel button appears only when loading is true', () => {
    const { queryByRole, rerender } = setup({ loading: false })
    expect(queryByRole('button', { name: /cancel/i })).toBeNull()

    rerender(<ChatInput onSend={vi.fn()} onCancel={vi.fn()} loading={true} />)
    expect(queryByRole('button', { name: /cancel/i })).toBeTruthy()
  })

  it('onSend callback fires with trimmed input text when send clicked', () => {
    const { getByPlaceholderText, getByRole, props } = setup()
    const textarea = getByPlaceholderText('Enter your prompt...')
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
    const { getByPlaceholderText, getByRole } = setup()
    const textarea = getByPlaceholderText('Enter your prompt...') as HTMLTextAreaElement
    fireEvent.input(textarea, { target: { value: 'hello' } })
    const button = getByRole('button', { name: /send/i })
    fireEvent.click(button)
    expect(textarea.value).toBe('')
  })

  it('Enter key without Shift triggers send', () => {
    const { getByPlaceholderText, props } = setup()
    const textarea = getByPlaceholderText('Enter your prompt...')
    fireEvent.input(textarea, { target: { value: 'enter test' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(props.onSend).toHaveBeenCalledWith('enter test')
  })

  it('Shift+Enter does NOT trigger send', () => {
    const { getByPlaceholderText, props } = setup()
    const textarea = getByPlaceholderText('Enter your prompt...')
    fireEvent.input(textarea, { target: { value: 'multiline' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(props.onSend).not.toHaveBeenCalled()
  })
})
