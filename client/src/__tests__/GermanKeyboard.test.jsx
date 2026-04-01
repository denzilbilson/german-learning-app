/**
 * Tests for GermanKeyboard component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GermanKeyboard from '../components/GermanKeyboard.jsx'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value) }),
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})

describe('GermanKeyboard', () => {
  it('renders all 7 special characters: ä ö ü ß Ä Ö Ü', () => {
    render(<GermanKeyboard />)
    // Each char should be present as a button title
    const chars = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü']
    for (const char of chars) {
      const btn = screen.getByTitle(`Insert ${char}`)
      expect(btn).toBeTruthy()
      expect(btn.textContent).toBe(char)
    }
  })

  it('toggle button hides the keyboard when clicked', async () => {
    const user = userEvent.setup()
    render(<GermanKeyboard />)

    // Initially visible (default)
    expect(screen.getByTitle('Insert ä')).toBeTruthy()

    // Click toggle button (shows 'äöü ×' when visible)
    const toggleBtn = screen.getByTitle('Hide German keyboard')
    await user.click(toggleBtn)

    // Now hidden
    expect(screen.queryByTitle('Insert ä')).toBeNull()
  })

  it('toggle button shows the keyboard when clicked again', async () => {
    const user = userEvent.setup()
    render(<GermanKeyboard />)

    const toggleBtn = screen.getByTitle('Hide German keyboard')
    await user.click(toggleBtn) // hide
    // Now show toggle button has different title
    const showBtn = screen.getByTitle('Show German keyboard')
    await user.click(showBtn) // show again

    expect(screen.getByTitle('Insert ä')).toBeTruthy()
  })
})
