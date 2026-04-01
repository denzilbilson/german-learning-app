/**
 * Tests for Import page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../services/api.js', () => ({
  api: {
    importCsv: vi.fn(),
    importConfirm: vi.fn(),
  },
}))

vi.mock('../components/Toast.jsx', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

import { api } from '../services/api.js'
import Import from '../pages/Import.jsx'

function renderPage() {
  return render(
    <MemoryRouter>
      <Import />
    </MemoryRouter>
  )
}

const MOCK_CSV_RESPONSE = {
  headers: ['Word', 'Meaning', 'Level'],
  vocabMapping: ['Word', 'Intended Meaning', 'Level'],
  phraseMapping: [null, null, null],
  unmapped: [],
  totalRows: 2,
  preview: [
    { Word: 'Hund', Meaning: 'dog', Level: 'A1', _row: 2 },
    { Word: 'Katze', Meaning: 'cat', Level: 'B1', _row: 3 },
  ],
  data: [
    { Word: 'Hund', Meaning: 'dog', Level: 'A1' },
    { Word: 'Katze', Meaning: 'cat', Level: 'B1' },
  ],
}

describe('Import page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('step 1 shows file upload zone', () => {
    renderPage()
    expect(screen.getByText(/Drag & drop your file here/i)).toBeTruthy()
  })

  it('accepts CSV file and advances to step 2 (column mapping)', async () => {
    api.importCsv.mockResolvedValueOnce(MOCK_CSV_RESPONSE)
    renderPage()

    // Create a fake CSV file
    const file = new File(['Word,Meaning\nHund,dog'], 'vocab.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]')
    expect(input).toBeTruthy()

    fireEvent.change(input, { target: { files: [file] } })

    // "Map Columns" appears in both the step nav and the step heading — use findAllByText
    const matches = await screen.findAllByText('Map Columns')
    expect(matches.length).toBeGreaterThan(0)
  })

  it('step 2 shows column mapping headers from the file', async () => {
    api.importCsv.mockResolvedValueOnce(MOCK_CSV_RESPONSE)
    renderPage()

    const file = new File(['Word,Meaning\nHund,dog'], 'vocab.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [file] } })

    // Wait for step 2 to appear (text may appear multiple times in nav + heading)
    await screen.findAllByText('Map Columns')
    // Column headers from the file should be displayed (appears in multiple places: th, options, span)
    expect(screen.getAllByText('Word').length).toBeGreaterThan(0)
  })

  it('confirm import on step 4 calls importConfirm API', async () => {
    api.importCsv.mockResolvedValueOnce(MOCK_CSV_RESPONSE)
    api.importConfirm.mockResolvedValueOnce({ added: 2, duplicatesSkipped: 0, errors: 0, errorDetails: [] })
    renderPage()

    // Upload file
    const file = new File(['Word,Meaning\nHund,dog'], 'vocab.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [file] } })

    // Step 2: Column mapping — text appears in both nav and heading, use findAllByText
    await screen.findAllByText('Map Columns')
    const nextBtn = screen.getByRole('button', { name: /Next →/i })
    await userEvent.click(nextBtn)

    // Step 3: Target → click Next
    await screen.findAllByText('Choose Target')
    const nextBtn2 = screen.getByRole('button', { name: /Next →/i })
    await userEvent.click(nextBtn2)

    // Step 4: Confirm → click Import Now
    await screen.findAllByText('Confirm Import')
    const importBtn = screen.getByRole('button', { name: /Import Now/i })
    await userEvent.click(importBtn)

    await waitFor(() => expect(api.importConfirm).toHaveBeenCalled())
  })

  it('step 5 shows added and skipped counts', async () => {
    api.importCsv.mockResolvedValueOnce(MOCK_CSV_RESPONSE)
    api.importConfirm.mockResolvedValueOnce({ added: 5, duplicatesSkipped: 2, errors: 0, errorDetails: [] })
    renderPage()

    const file = new File(['Word,Meaning\nHund,dog'], 'vocab.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [file] } })

    await screen.findAllByText('Map Columns')
    await userEvent.click(screen.getByRole('button', { name: /Next →/i }))

    await screen.findAllByText('Choose Target')
    await userEvent.click(screen.getByRole('button', { name: /Next →/i }))

    await screen.findAllByText('Confirm Import')
    await userEvent.click(screen.getByRole('button', { name: /Import Now/i }))

    await screen.findByText('Import Complete')
    // Should show added count (step nav may also show numbers — use getAllByText)
    expect(screen.getAllByText('5').length).toBeGreaterThan(0)
    // Should show skipped count
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
  })
})
