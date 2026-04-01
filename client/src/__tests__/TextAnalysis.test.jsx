/**
 * Tests for TextAnalysis page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Mock api
vi.mock('../services/api.js', () => ({
  api: {
    analyzeText: vi.fn(),
    addFromAnalysis: vi.fn(),
  },
}))

// Mock Toast to avoid context issues
vi.mock('../components/Toast.jsx', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}))

// Mock AnalysisReader to simplify
vi.mock('../components/AnalysisReader.jsx', () => ({
  default: ({ analysis }) => (
    <div data-testid="analysis-reader">
      <span>{analysis?.vocabulary?.length} words</span>
    </div>
  ),
}))

// Mock AnkiExportModal
vi.mock('../components/AnkiExportModal.jsx', () => ({
  default: ({ onClose }) => <div data-testid="anki-modal"><button onClick={onClose}>Close</button></div>,
}))

// Mock GermanKeyboard
vi.mock('../components/GermanKeyboard.jsx', () => ({
  default: () => <div data-testid="german-keyboard" />,
}))

import { api } from '../services/api.js'
import TextAnalysis from '../pages/TextAnalysis.jsx'

function renderPage() {
  return render(
    <MemoryRouter>
      <TextAnalysis />
    </MemoryRouter>
  )
}

const MOCK_ANALYSIS = {
  vocabulary: [{ word: 'Hund', literalMeaning: 'dog', intendedMeaning: 'dog', partOfSpeech: 'Nomen', caseExamples: [], level: 'A1' }],
  phrases: [{ phrase: 'Guten Tag', englishMeaning: 'Good day', level: 'A1' }],
  grammar: [],
  translation: 'Hello World',
  originalText: 'Hallo Welt',
  source: null,
  savedAt: new Date().toISOString(),
  filename: 'analysis-test.json',
}

describe('TextAnalysis page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a textarea for input', () => {
    renderPage()
    expect(screen.getByPlaceholderText(/Deutschen Text hier einfügen/i)).toBeTruthy()
  })

  it('Analyze button is disabled when textarea is empty', () => {
    renderPage()
    const button = screen.getByRole('button', { name: /Analyze with Claude/i })
    expect(button).toBeDisabled()
  })

  it('Analyze button is enabled when textarea has text', async () => {
    const user = userEvent.setup()
    renderPage()
    const textarea = screen.getByPlaceholderText(/Deutschen Text hier einfügen/i)
    await user.type(textarea, 'Hallo Welt')
    const button = screen.getByRole('button', { name: /Analyze with Claude/i })
    expect(button).not.toBeDisabled()
  })

  it('loading spinner appears after Analyze is clicked', async () => {
    const user = userEvent.setup()
    // Make the API call hang
    api.analyzeText.mockImplementation(() => new Promise(() => {}))
    renderPage()

    const textarea = screen.getByPlaceholderText(/Deutschen Text hier einfügen/i)
    await user.type(textarea, 'Hallo Welt')
    await user.click(screen.getByRole('button', { name: /Analyze with Claude/i }))

    // Should show loading state
    expect(screen.getByText(/Analyzing with Claude/i)).toBeTruthy()
  })

  it('results render when API returns analysis', async () => {
    const user = userEvent.setup()
    api.analyzeText.mockResolvedValueOnce(MOCK_ANALYSIS)
    renderPage()

    const textarea = screen.getByPlaceholderText(/Deutschen Text hier einfügen/i)
    await user.type(textarea, 'Hallo Welt')
    await user.click(screen.getByRole('button', { name: /Analyze with Claude/i }))

    // Wait for results
    await screen.findByTestId('analysis-reader')
    expect(screen.getByTestId('analysis-reader')).toBeTruthy()
  })

  it('"Add All to Databases" button calls addFromAnalysis', async () => {
    const user = userEvent.setup()
    api.analyzeText.mockResolvedValueOnce(MOCK_ANALYSIS)
    api.addFromAnalysis.mockResolvedValueOnce({
      added: { vocabulary: 1, phrases: 1 },
      skipped: { vocabulary: 0, phrases: 0 },
    })
    renderPage()

    const textarea = screen.getByPlaceholderText(/Deutschen Text hier einfügen/i)
    await user.type(textarea, 'Hallo Welt')
    await user.click(screen.getByRole('button', { name: /Analyze with Claude/i }))

    await screen.findByText('Add All to Databases')
    await user.click(screen.getByText('Add All to Databases'))

    expect(api.addFromAnalysis).toHaveBeenCalled()
  })
})
