import { render, fireEvent, waitFor } from '@testing-library/preact'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChatInput } from './ChatInput'

describe('ChatInput', () => {
  const defaultProps = {
    onSend: vi.fn(),
    onContinue: vi.fn(),
    onCancel: vi.fn(),
    loading: false,
    stoppable: false,
  }

  function setup(overrides = {}) {
    const props = { ...defaultProps, onSend: vi.fn(), onContinue: vi.fn(), onCancel: vi.fn(), ...overrides }
    const result = render(<ChatInput {...props} />)
    return { ...result, props }
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('indicator visibility', () => {
    it('indicator is hidden when textarea is empty', () => {
      const { queryByTestId } = setup()
      expect(queryByTestId('indicator')).toBeNull()
    })

    it('indicator appears when text is entered', () => {
      const { getByLabelText, queryByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'hello' } })
      expect(queryByTestId('indicator')).toBeTruthy()
    })

    it('indicator shows > symbol when text exists', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      expect(getByTestId('indicator').textContent).toBe('>')
    })

    it('indicator is dim when not in pending state', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      const indicator = getByTestId('indicator')
      expect(indicator.className).toContain('opacity-40')
    })
  })

  describe('indicator hover state', () => {
    it('indicator has button-look on hover', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      const indicator = getByTestId('indicator')
      expect(indicator.className).toContain('hover:bg-')
    })

    it('indicator is clickable (has button role)', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      const indicator = getByTestId('indicator')
      expect(indicator.tagName.toLowerCase()).toBe('button')
    })
  })

  describe('pending state', () => {
    it('Enter triggers pending state', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      const indicator = getByTestId('indicator')
      expect(indicator.className).not.toContain('opacity-40')
    })

    it('clicking indicator triggers pending state', () => {
      const { getByLabelText, getByTestId, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.click(getByTestId('indicator'))
      expect(props.onSend).not.toHaveBeenCalled()
      const indicator = getByTestId('indicator')
      expect(indicator.className).not.toContain('opacity-40')
    })

    it('shimmer animation appears during pending', () => {
      const { getByLabelText, queryByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(queryByTestId('shimmer')).toBeTruthy()
    })

    it('textarea becomes readonly during pending', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(textarea.readOnly).toBe(true)
    })

    it('textarea is NOT disabled during pending (preserves focus)', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(textarea.disabled).toBe(false)
    })
  })

  describe('session toggle', () => {
    it('first Enter shows > indicator (odd count)', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(getByTestId('indicator').textContent).toBe('>')
    })

    it('second Enter shows >> indicator (even count)', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(getByTestId('indicator').textContent).toBe('>>')
    })

    it('third Enter shows > indicator again (odd count)', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(getByTestId('indicator').textContent).toBe('>')
    })

    it('even Enter count shows red >> indicator', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      const indicator = getByTestId('indicator')
      expect(indicator.style.color).toContain('error')
    })
  })

  describe('cancel pending', () => {
    it('ArrowUp cancels pending and returns to edit mode', () => {
      const { getByLabelText, getByTestId, queryByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(queryByTestId('shimmer')).toBeTruthy()
      fireEvent.keyDown(textarea, { key: 'ArrowUp' })
      expect(queryByTestId('shimmer')).toBeNull()
      expect(textarea.readOnly).toBe(false)
      expect(getByTestId('indicator').className).toContain('opacity-40')
    })

    it('clicking shimmer cancels pending and returns to edit mode', () => {
      const { getByLabelText, getByTestId, queryByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.click(getByTestId('shimmer'))
      expect(queryByTestId('shimmer')).toBeNull()
      expect(textarea.readOnly).toBe(false)
      expect(getByTestId('indicator').className).toContain('opacity-40')
    })
  })

  describe('auto-send after timeout', () => {
    it('calls onSend after 2 seconds with odd enter count', async () => {
      const { getByLabelText, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test message' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(props.onSend).not.toHaveBeenCalled()
      vi.advanceTimersByTime(2000)
      await waitFor(() => {
        expect(props.onSend).toHaveBeenCalledWith('test message')
      })
    })

    it('calls onContinue after 2 seconds with even enter count', async () => {
      const { getByLabelText, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test message' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(props.onContinue).not.toHaveBeenCalled()
      vi.advanceTimersByTime(2000)
      await waitFor(() => {
        expect(props.onContinue).toHaveBeenCalledWith('test message')
      })
    })

    it('does not send if cancelled before timeout', async () => {
      const { getByLabelText, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      vi.advanceTimersByTime(1000)
      fireEvent.keyDown(textarea, { key: 'ArrowUp' })
      vi.advanceTimersByTime(2000)
      expect(props.onSend).not.toHaveBeenCalled()
    })

    it('timer resets when toggling session mode', async () => {
      const { getByLabelText, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      vi.advanceTimersByTime(1500)
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      vi.advanceTimersByTime(1500)
      expect(props.onSend).not.toHaveBeenCalled()
      expect(props.onContinue).not.toHaveBeenCalled()
      vi.advanceTimersByTime(500)
      await waitFor(() => {
        expect(props.onContinue).toHaveBeenCalledWith('test')
      })
    })

    it('clears input after auto-send', async () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      vi.advanceTimersByTime(2000)
      await waitFor(() => {
        expect(textarea.value).toBe('')
      })
    })
  })

  describe('loading states', () => {
    it('indicator shows > dim during loading', () => {
      const { getByTestId } = setup({ loading: true })
      const indicator = getByTestId('indicator')
      expect(indicator.textContent).toBe('>')
      expect(indicator.className).toContain('opacity-40')
    })

    it('indicator shows # when loading AND stoppable', () => {
      const { getByTestId } = setup({ loading: true, stoppable: true })
      const indicator = getByTestId('indicator')
      expect(indicator.textContent).toBe('#')
    })

    it('# indicator is not dim when stoppable', () => {
      const { getByTestId } = setup({ loading: true, stoppable: true })
      const indicator = getByTestId('indicator')
      expect(indicator.className).not.toContain('opacity-40')
    })

    it('clicking # calls onCancel', () => {
      const { getByTestId, props } = setup({ loading: true, stoppable: true })
      fireEvent.click(getByTestId('indicator'))
      expect(props.onCancel).toHaveBeenCalledTimes(1)
    })

    it('textarea is disabled during loading', () => {
      const { getByLabelText } = setup({ loading: true })
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      expect(textarea.disabled).toBe(true)
    })

    it('indicator visible during loading even with empty text', () => {
      const { queryByTestId } = setup({ loading: true })
      expect(queryByTestId('indicator')).toBeTruthy()
    })
  })

  describe('keyboard behavior', () => {
    it('Shift+Enter does NOT trigger pending (allows newline)', () => {
      const { getByLabelText, queryByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
      expect(queryByTestId('shimmer')).toBeNull()
    })

    it('Enter on empty input does nothing', () => {
      const { getByLabelText, props, queryByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(queryByTestId('shimmer')).toBeNull()
      expect(props.onSend).not.toHaveBeenCalled()
    })

    it('Enter during loading does nothing', () => {
      const { getByLabelText, props, queryByTestId } = setup({ loading: true })
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(queryByTestId('shimmer')).toBeNull()
      expect(props.onSend).not.toHaveBeenCalled()
    })
  })

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

    it('textarea minimum height is 44px for touch target', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      expect(textarea.className).toContain('min-h-[44px]')
    })
  })
})
