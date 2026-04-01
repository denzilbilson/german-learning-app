/**
 * Tests for GlobalSearch component.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import GlobalSearch from '../components/GlobalSearch.jsx'

// Mock the api module
vi.mock('../services/api.js', () => ({
  api: {
    search: vi.fn(),
  },
}))

import { api } from '../services/api.js'

const MOCK_RESULTS = {
  query: 'hund',
  total: 1,
  results: {
    vocabulary: [{ type: 'vocabulary', title: 'Hund', snippet: 'dog', meta: 'A1', score: 3 }],
    phrases: [],
    grammar: [],
    analysis: [],
  },
}

function renderSearch(isOpen = true, onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <GlobalSearch isOpen={isOpen} onClose={onClose} />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.runAllTimers()
  vi.useRealTimers()
})

describe('GlobalSearch', () => {
  it('renders nothing when isOpen=false', () => {
    renderSearch(false)
    expect(screen.queryByPlaceholderText(/Search vocabulary/i)).toBeNull()
  })

  it('renders the search input when isOpen=true', () => {
    renderSearch(true)
    expect(screen.getByPlaceholderText(/Search vocabulary/i)).toBeTruthy()
  })

  it('pressing Escape calls onClose', async () => {
    const onClose = vi.fn()
    renderSearch(true, onClose)

    const input = screen.getByPlaceholderText(/Search vocabulary/i)
    fireEvent.keyDown(input.closest('[onKeyDown]') || document.querySelector('[class*="modal"], [class*="relative"]'), { key: 'Escape' })

    // The keyDown handler is on the modal div
    const modal = document.querySelector('[onkeydown]')
    if (modal) fireEvent.keyDown(modal, { key: 'Escape' })
    else {
      // Try on the container
      const container = screen.getByPlaceholderText(/Search vocabulary/i).closest('div[class]')
      fireEvent.keyDown(container, { key: 'Escape' })
    }
    expect(onClose).toHaveBeenCalled()
  })

  it('typing triggers a debounced search after 300ms', async () => {
    api.search.mockResolvedValue(MOCK_RESULTS)
    renderSearch(true)

    const input = screen.getByPlaceholderText(/Search vocabulary/i)
    fireEvent.change(input, { target: { value: 'hund' } })

    // Before debounce fires, search should not have been called
    expect(api.search).not.toHaveBeenCalled()

    // Advance timers past debounce delay
    await act(async () => {
      vi.advanceTimersByTime(350)
    })

    expect(api.search).toHaveBeenCalledWith('hund')
  })

  it('search results are displayed after API response', async () => {
    api.search.mockResolvedValue(MOCK_RESULTS)
    renderSearch(true)

    const input = screen.getByPlaceholderText(/Search vocabulary/i)
    fireEvent.change(input, { target: { value: 'hund' } })

    await act(async () => {
      vi.advanceTimersByTime(350)
      // Let promises settle
      await Promise.resolve()
    })

    expect(screen.getByText('Hund')).toBeTruthy()
  })

  it('matching text is highlighted in results', async () => {
    api.search.mockResolvedValue(MOCK_RESULTS)
    renderSearch(true)

    const input = screen.getByPlaceholderText(/Search vocabulary/i)
    fireEvent.change(input, { target: { value: 'hund' } })

    await act(async () => {
      vi.advanceTimersByTime(350)
      await Promise.resolve()
    })

    // 'Hund' should appear, and 'hund' (query) should be highlighted in a <mark>
    const marks = document.querySelectorAll('mark')
    expect(marks.length).toBeGreaterThan(0)
  })
})
