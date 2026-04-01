/**
 * Tests for Practice page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../services/api.js', () => ({
  api: {
    generatePractice: vi.fn(),
    checkAnswer: vi.fn(),
    getVocabulary: vi.fn(),
    logProgress: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('../components/Toast.jsx', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

// Mock PracticeCard to control question/answer flow
vi.mock('../components/PracticeCard.jsx', () => ({
  default: ({ question, onComplete }) => (
    <div data-testid="practice-card">
      <p>{question?.front || question?.question || 'Question'}</p>
      <button
        onClick={() => onComplete({ correct: true, word: question?.front || 'word', userAnswer: 'test' })}
        data-testid="answer-btn"
      >
        Answer
      </button>
    </div>
  ),
}))

vi.mock('../components/SpeakButton.jsx', () => ({
  default: () => null,
}))

import { api } from '../services/api.js'
import Practice from '../pages/Practice.jsx'

function renderPage() {
  return render(
    <MemoryRouter>
      <Practice />
    </MemoryRouter>
  )
}

const MOCK_QUESTIONS = {
  questions: [
    { id: 0, type: 'flashcard', front: 'Hund', back: 'dog', partOfSpeech: 'Nomen', level: 'A1' },
    { id: 1, type: 'flashcard', front: 'Katze', back: 'cat', partOfSpeech: 'Nomen', level: 'A1' },
    { id: 2, type: 'flashcard', front: 'Haus', back: 'house', partOfSpeech: 'Nomen', level: 'B1' },
  ],
}

describe('Practice page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders 6 mode cards on the initial selection screen', () => {
    renderPage()
    // Should show all 6 modes
    expect(screen.getByText('Flashcard')).toBeTruthy()
    expect(screen.getByText('Quiz')).toBeTruthy()
    expect(screen.getByText('Fill in the Blank')).toBeTruthy()
    expect(screen.getByText('Case Drill')).toBeTruthy()
    expect(screen.getByText('Translation')).toBeTruthy()
    expect(screen.getByText('Article Drill')).toBeTruthy()
  })

  it('selecting a mode calls generatePractice API', async () => {
    const user = userEvent.setup()
    api.generatePractice.mockResolvedValueOnce(MOCK_QUESTIONS)
    renderPage()

    await user.click(screen.getByText('Flashcard'))
    expect(api.generatePractice).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'flashcard' })
    )
  })

  it('question renders after generation', async () => {
    const user = userEvent.setup()
    api.generatePractice.mockResolvedValueOnce(MOCK_QUESTIONS)
    renderPage()

    await user.click(screen.getByText('Flashcard'))

    // Wait for the session to start
    await screen.findByTestId('practice-card')
    expect(screen.getByTestId('practice-card')).toBeTruthy()
  })

  it('shows progress indicator with question count', async () => {
    const user = userEvent.setup()
    api.generatePractice.mockResolvedValueOnce(MOCK_QUESTIONS)
    renderPage()

    await user.click(screen.getByText('Flashcard'))
    await screen.findByTestId('practice-card')

    // Should show "1 / 3" or similar progress
    expect(screen.getByText(/1/)).toBeTruthy()
    expect(screen.getByText(/3/)).toBeTruthy()
  })

  it('advancing through questions shows progress', async () => {
    const user = userEvent.setup()
    api.generatePractice.mockResolvedValueOnce(MOCK_QUESTIONS)
    renderPage()

    await user.click(screen.getByText('Flashcard'))
    await screen.findByTestId('practice-card')

    // Answer first question
    await user.click(screen.getByTestId('answer-btn'))

    // Should now be on question 2
    expect(screen.getByText(/2/)).toBeTruthy()
  })

  it('session summary shows after all questions answered', async () => {
    const user = userEvent.setup()
    api.generatePractice.mockResolvedValueOnce(MOCK_QUESTIONS)
    renderPage()

    await user.click(screen.getByText('Flashcard'))
    await screen.findByTestId('practice-card')

    // Answer all 3 questions
    for (let i = 0; i < 3; i++) {
      const btn = screen.getByTestId('answer-btn')
      await user.click(btn)
    }

    // Summary should show (e.g. "Session complete" or a score percentage)
    await screen.findByText(/Session complete/i)
  })
})
