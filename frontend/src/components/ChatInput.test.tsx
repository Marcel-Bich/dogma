import { render, fireEvent, act } from '@testing-library/preact'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChatInput } from './ChatInput'

describe('ChatInput', () => {
  const defaultProps = {
    onSend: vi.fn(),
    onContinue: vi.fn(),
    onCancel: vi.fn(),
    loading: false,
    stoppable: false,
    spellCheck: false,
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

    it('indicator shows \u25b8 symbol when text exists', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      expect(getByTestId('indicator').textContent).toBe('\u25b8')
    })

    it('indicator is dim when not in pending state', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      const indicator = getByTestId('indicator')
      expect(indicator.className).toContain('opacity-40')
    })

    it('indicator is positioned absolutely inside textarea container', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      const indicator = getByTestId('indicator')
      expect(indicator.className).toContain('absolute')
    })

    it('indicator fills full height using h-full and flexbox centering', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      const indicator = getByTestId('indicator')
      expect(indicator.className).toContain('top-0')
      expect(indicator.className).toContain('bottom-0')
      expect(indicator.className).toContain('h-full')
      expect(indicator.className).toContain('flex')
      expect(indicator.className).toContain('items-center')
      expect(indicator.className).toContain('justify-center')
    })

    it('textarea has padding-right for indicator space', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      expect(textarea.style.paddingRight).toBe('3rem')
    })

    it('indicator button is 32px wide and fills full container height', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      const indicator = getByTestId('indicator')
      expect(indicator.className).toContain('w-8')
      expect(indicator.className).toContain('h-full')
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

    it('clicking indicator during pending toggles session mode', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.click(getByTestId('indicator'))
      expect(getByTestId('indicator').textContent).toBe('\u25b8')
      fireEvent.click(getByTestId('indicator'))
      expect(getByTestId('indicator').textContent).toBe('\u25b8\u25b8')
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
    it('first Enter shows \u25b8 indicator (odd count = continue session)', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(getByTestId('indicator').textContent).toBe('\u25b8')
    })

    it('second Enter shows \u25b8\u25b8 indicator (even count = new session)', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(getByTestId('indicator').textContent).toBe('\u25b8\u25b8')
    })

    it('third Enter shows \u25b8 indicator again (odd count = continue session)', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(getByTestId('indicator').textContent).toBe('\u25b8')
    })

    it('even Enter count shows red \u25b8\u25b8 indicator (new session warning)', () => {
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

    it('Escape cancels pending and returns to edit mode', () => {
      const { getByLabelText, getByTestId, queryByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(queryByTestId('shimmer')).toBeTruthy()
      fireEvent.keyDown(textarea, { key: 'Escape' })
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
    it('calls onContinue after 2 seconds with odd enter count (continue session)', () => {
      const { getByLabelText, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test message' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(props.onContinue).not.toHaveBeenCalled()
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(props.onContinue).toHaveBeenCalledWith('test message')
    })

    it('calls onSend after 2 seconds with even enter count (new session)', () => {
      const { getByLabelText, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test message' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(props.onSend).not.toHaveBeenCalled()
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(props.onSend).toHaveBeenCalledWith('test message')
    })

    it('does not send if cancelled before timeout', () => {
      const { getByLabelText, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      fireEvent.keyDown(textarea, { key: 'ArrowUp' })
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(props.onSend).not.toHaveBeenCalled()
    })

    it('timer resets when toggling session mode', () => {
      const { getByLabelText, props } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(1500)
      })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(1500)
      })
      expect(props.onSend).not.toHaveBeenCalled()
      expect(props.onContinue).not.toHaveBeenCalled()
      act(() => {
        vi.advanceTimersByTime(500)
      })
      // After 2x Enter (even count), should call onSend (new session)
      expect(props.onSend).toHaveBeenCalledWith('test')
    })

    it('clears input after auto-send', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.input(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(textarea.value).toBe('')
    })

    it('resets textarea height after auto-send', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      // Simulate multi-line content that would change height
      fireEvent.input(textarea, { target: { value: 'line1\nline2\nline3' } })
      textarea.style.height = '100px'
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(textarea.style.height).toBe('auto')
    })
  })

  describe('loading states', () => {
    it('indicator shows loading animation during loading (not stoppable)', () => {
      const { getByTestId } = setup({ loading: true })
      const indicator = getByTestId('indicator')
      expect(indicator.querySelector('.loading-dots')).toBeTruthy()
      expect(indicator.className).toContain('opacity-40')
    })

    it('indicator shows CSS square when loading AND stoppable', () => {
      const { getByTestId } = setup({ loading: true, stoppable: true })
      const indicator = getByTestId('indicator')
      const stopSquare = indicator.querySelector('.stop-square')
      expect(stopSquare).toBeTruthy()
      expect(stopSquare?.className).toContain('w-3')
      expect(stopSquare?.className).toContain('h-3')
      expect(stopSquare?.className).toContain('bg-current')
    })

    it('stop square indicator is not dim when stoppable', () => {
      const { getByTestId } = setup({ loading: true, stoppable: true })
      const indicator = getByTestId('indicator')
      expect(indicator.className).not.toContain('opacity-40')
    })

    it('clicking stop square calls onCancel', () => {
      const { getByTestId, props } = setup({ loading: true, stoppable: true })
      fireEvent.click(getByTestId('indicator'))
      expect(props.onCancel).toHaveBeenCalledTimes(1)
    })

    it('clicking indicator during loading (not stoppable) does nothing', () => {
      const { getByTestId, props } = setup({ loading: true, stoppable: false })
      fireEvent.click(getByTestId('indicator'))
      expect(props.onCancel).not.toHaveBeenCalled()
      expect(props.onSend).not.toHaveBeenCalled()
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

    it('returns to ready state when loading ends with text', () => {
      const { getByLabelText, getByTestId, rerender, props } = setup({ loading: true })
      // Add text first
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      // Rerender with loading=false
      rerender(<ChatInput {...props} loading={false} />)
      // Should show dim indicator (ready state, not pending)
      const indicator = getByTestId('indicator')
      expect(indicator.className).toContain('opacity-40')
    })

    it('returns to idle state when loading ends without text', () => {
      const { queryByTestId, rerender, props } = setup({ loading: true })
      // No text input
      // Rerender with loading=false
      rerender(<ChatInput {...props} loading={false} />)
      // No indicator when idle without text
      expect(queryByTestId('indicator')).toBeNull()
    })

    it('does not change state when loading=false but not in loading state', () => {
      const { getByLabelText, getByTestId, rerender, props } = setup({ loading: false })
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      // Currently in ready state with text
      expect(getByTestId('indicator').className).toContain('opacity-40')
      // Rerender with loading=false (no change)
      rerender(<ChatInput {...props} loading={false} />)
      // Should remain in ready state
      expect(getByTestId('indicator').className).toContain('opacity-40')
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

    it('ArrowUp outside pending state does nothing', () => {
      const { getByLabelText, getByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'test' } })
      // In ready state, not pending
      fireEvent.keyDown(textarea, { key: 'ArrowUp' })
      // Should still be in ready state with dim indicator
      expect(getByTestId('indicator').className).toContain('opacity-40')
    })
  })

  describe('textarea', () => {
    it('renders textarea with aria-label', () => {
      const { getByLabelText } = setup()
      expect(getByLabelText('Enter your prompt...')).toBeTruthy()
    })

    it('textarea has autoFocus attribute for immediate typing', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      expect(textarea.hasAttribute('autofocus')).toBe(true)
    })

    it('textarea receives async focus after 250ms delay', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      const focusSpy = vi.spyOn(textarea, 'focus')
      act(() => {
        vi.advanceTimersByTime(250)
      })
      expect(focusSpy).toHaveBeenCalled()
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

    it('textarea has max-height of 55vh for autogrow', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      expect(textarea.className).toContain('max-h-[55vh]')
    })

    it('applies accent glow on focus', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.focus(textarea)
      expect(textarea.style.borderColor).toBe('rgba(var(--arctic-accent-rgb), 0.5)')
      expect(textarea.style.boxShadow).toContain('var(--arctic-accent-rgb)')
    })

    it('removes glow on blur', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      fireEvent.focus(textarea)
      fireEvent.blur(textarea)
      expect(textarea.style.borderColor).toBe('rgba(var(--arctic-accent-rgb), 0.2)')
      expect(textarea.style.boxShadow).toBe('none')
    })

    it('clearing text returns state to idle', () => {
      const { getByLabelText, queryByTestId } = setup()
      const textarea = getByLabelText('Enter your prompt...')
      fireEvent.input(textarea, { target: { value: 'hello' } })
      expect(queryByTestId('indicator')).toBeTruthy()
      fireEvent.input(textarea, { target: { value: '' } })
      expect(queryByTestId('indicator')).toBeNull()
    })
  })

  describe('spellCheck prop', () => {
    it('textarea does not have spellcheck=true by default', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      // When spellCheck is false, Preact does not set the attribute (null) or sets it to 'false'
      expect(textarea.getAttribute('spellcheck')).not.toBe('true')
    })

    it('textarea does not have spellcheck=true when prop is false', () => {
      const { getByLabelText } = setup({ spellCheck: false })
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      expect(textarea.getAttribute('spellcheck')).not.toBe('true')
    })

    it('textarea has spellcheck attribute set to true when prop is true', () => {
      const { getByLabelText } = setup({ spellCheck: true })
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      expect(textarea.getAttribute('spellcheck')).toBe('true')
    })
  })

  describe('background color', () => {
    it('wrapper uses var(--bg-color) for background', () => {
      const { container } = setup()
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.background).toBe('var(--bg-color)')
    })

    it('textarea uses var(--bg-color) for background', () => {
      const { getByLabelText } = setup()
      const textarea = getByLabelText('Enter your prompt...') as HTMLTextAreaElement
      expect(textarea.style.background).toBe('var(--bg-color)')
    })
  })
})
