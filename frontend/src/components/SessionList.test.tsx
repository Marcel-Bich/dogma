import { render, fireEvent } from '@testing-library/preact'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SessionList, formatRelativeTime } from './SessionList'
import * as state from '../state'
import type { SessionInfo } from '../types'

vi.mock('../../wailsjs/go/main/App', () => ({
  ListSessions: vi.fn().mockResolvedValue([]),
}))

// Mock loadSessions to prevent useEffect from changing state in display tests
const mockLoadSessions = vi.spyOn(state, 'loadSessions').mockResolvedValue(undefined)

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-24T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for less than 1 minute', () => {
    expect(formatRelativeTime('2026-01-24T11:59:30Z')).toBe('just now')
  })

  it('returns "X min ago" for less than 60 minutes', () => {
    expect(formatRelativeTime('2026-01-24T11:45:00Z')).toBe('15 min ago')
  })

  it('returns "X hours ago" for less than 24 hours', () => {
    expect(formatRelativeTime('2026-01-24T09:00:00Z')).toBe('3 hours ago')
  })

  it('returns "X days ago" for less than 7 days', () => {
    expect(formatRelativeTime('2026-01-21T12:00:00Z')).toBe('3 days ago')
  })

  it('returns date string for 7+ days', () => {
    expect(formatRelativeTime('2026-01-10T12:00:00Z')).toBe('2026-01-10')
  })

  it('returns original string for invalid date', () => {
    expect(formatRelativeTime('not-a-date')).toBe('not-a-date')
  })

  it('returns "1 min ago" for exactly 60 seconds', () => {
    expect(formatRelativeTime('2026-01-24T11:59:00Z')).toBe('1 min ago')
  })

  it('returns "1 hours ago" for exactly 60 minutes', () => {
    expect(formatRelativeTime('2026-01-24T11:00:00Z')).toBe('1 hours ago')
  })

  it('returns "1 days ago" for exactly 24 hours', () => {
    expect(formatRelativeTime('2026-01-23T12:00:00Z')).toBe('1 days ago')
  })
})

describe('SessionList', () => {
  const mockSessions: SessionInfo[] = [
    { id: 's1', summary: 'Database migration', first_message: 'help me migrate', timestamp: '2026-01-24T10:00:00Z', model: 'opus' },
    { id: 's2', summary: '', first_message: 'Build a feature', timestamp: '2026-01-24T09:00:00Z', model: 'sonnet' },
    { id: 's3', summary: 'Code review', first_message: 'review this', timestamp: '2026-01-20T08:00:00Z', model: '' },
  ]

  beforeEach(() => {
    state.resetState()
    mockLoadSessions.mockClear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-24T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders loading state', () => {
    state.sessionsLoading.value = true
    const { getByTestId } = render(<SessionList onSelect={vi.fn()} listFn={vi.fn()} />)
    expect(getByTestId('sessions-loading').textContent).toBe('Loading sessions...')
  })

  it('renders error state', () => {
    state.sessionsError.value = 'Failed to load'
    const { getByTestId } = render(<SessionList onSelect={vi.fn()} listFn={vi.fn()} />)
    expect(getByTestId('sessions-error').textContent).toBe('Failed to load')
  })

  it('renders empty state', () => {
    state.sessions.value = []
    const { getByTestId } = render(<SessionList onSelect={vi.fn()} listFn={vi.fn()} />)
    expect(getByTestId('sessions-empty').textContent).toBe('No sessions found')
  })

  it('renders session list with metadata', () => {
    state.sessions.value = mockSessions
    const { getByTestId } = render(<SessionList onSelect={vi.fn()} listFn={vi.fn()} />)
    expect(getByTestId('sessions-list')).toBeTruthy()
    expect(getByTestId('session-item-s1')).toBeTruthy()
    expect(getByTestId('session-item-s2')).toBeTruthy()
    expect(getByTestId('session-item-s3')).toBeTruthy()
  })

  it('shows summary text when available', () => {
    state.sessions.value = mockSessions
    const { getByTestId } = render(<SessionList onSelect={vi.fn()} listFn={vi.fn()} />)
    expect(getByTestId('session-item-s1').textContent).toContain('Database migration')
  })

  it('shows first_message when no summary', () => {
    state.sessions.value = mockSessions
    const { getByTestId } = render(<SessionList onSelect={vi.fn()} listFn={vi.fn()} />)
    expect(getByTestId('session-item-s2').textContent).toContain('Build a feature')
  })

  it('shows relative timestamp', () => {
    state.sessions.value = mockSessions
    const { getByTestId } = render(<SessionList onSelect={vi.fn()} listFn={vi.fn()} />)
    expect(getByTestId('session-item-s1').textContent).toContain('2 hours ago')
  })

  it('shows model badge', () => {
    state.sessions.value = mockSessions
    const { getByTestId } = render(<SessionList onSelect={vi.fn()} listFn={vi.fn()} />)
    expect(getByTestId('session-item-s1').textContent).toContain('opus')
    expect(getByTestId('session-item-s2').textContent).toContain('sonnet')
  })

  it('calls onSelect with session ID on click', () => {
    state.sessions.value = mockSessions
    const onSelect = vi.fn()
    const { getByTestId } = render(<SessionList onSelect={onSelect} listFn={vi.fn()} />)

    fireEvent.click(getByTestId('session-item-s2'))
    expect(onSelect).toHaveBeenCalledWith('s2')
  })

  it('highlights selected session', () => {
    state.sessions.value = mockSessions
    const { getByTestId } = render(<SessionList onSelect={vi.fn()} selectedId="s1" listFn={vi.fn()} />)
    const selected = getByTestId('session-item-s1')
    expect(selected.className).toContain('border-blue-500')
    expect(selected.className).toContain('bg-blue-900')
  })

  it('non-selected sessions have default styling', () => {
    state.sessions.value = mockSessions
    const { getByTestId } = render(<SessionList onSelect={vi.fn()} selectedId="s1" listFn={vi.fn()} />)
    const notSelected = getByTestId('session-item-s2')
    expect(notSelected.className).toContain('border-gray-700')
    expect(notSelected.className).not.toContain('border-blue-500')
  })

  it('calls loadSessions on mount with listFn', async () => {
    const mockListFn = vi.fn().mockResolvedValue([])
    render(<SessionList onSelect={vi.fn()} listFn={mockListFn} />)
    expect(mockLoadSessions).toHaveBeenCalledWith(mockListFn)
  })

  it('shows session id as fallback when no summary or first_message', () => {
    state.sessions.value = [{ id: 'fallback-id', summary: '', first_message: '', timestamp: '2026-01-24T10:00:00Z', model: 'opus' }]
    const { getByTestId } = render(<SessionList onSelect={vi.fn()} listFn={vi.fn()} />)
    expect(getByTestId('session-item-fallback-id').textContent).toContain('fallback-id')
  })
})
