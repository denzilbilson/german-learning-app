/**
 * Tests for PracticeCard component.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../services/api.js', () => ({
  api: { checkAnswer: vi.fn() },
}))
vi.mock('../components/SpeakButton.jsx', () => ({ default: () => null }))
vi.mock('../components/GenderBadge.jsx', () => ({ default: () => null }))

import PracticeCard from '../components/PracticeCard.jsx'

describe('PracticeCard – flashcard mode', () => {
  it('renders front of card', () => {
    render(<PracticeCard question={{ type: 'flashcard', front: 'lernen', back: 'to learn' }} onComplete={vi.fn()} />)
    expect(screen.getByText('lernen')).toBeInTheDocument()
  })

  it('reveals back on click', () => {
    render(<PracticeCard question={{ type: 'flashcard', front: 'lernen', back: 'to learn' }} onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('lernen').closest('div[style]') || screen.getByText('tap to reveal').closest('div'))
    expect(screen.getByText('to learn')).toBeInTheDocument()
  })

  it('renders caseExamples as plain text (no dangerouslySetInnerHTML / XSS risk)', () => {
    const xss = '<img src=x onerror=alert(1)>'
    render(
      <PracticeCard
        question={{ type: 'flashcard', front: 'Haus', back: 'house', caseExamples: xss }}
        onComplete={vi.fn()}
      />
    )
    // Flip the card first
    fireEvent.click(screen.getByText('tap to reveal').closest('div'))
    // The raw string should appear as text, not be parsed as HTML
    expect(screen.getByText(xss)).toBeInTheDocument()
    // No <img> element should exist in the DOM
    expect(document.querySelector('img[src="x"]')).toBeNull()
  })

  it('splits caseExamples on <br> into separate paragraphs', () => {
    render(
      <PracticeCard
        question={{ type: 'flashcard', front: 'Haus', back: 'house', caseExamples: 'Das Haus<br>Ein Haus' }}
        onComplete={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('tap to reveal').closest('div'))
    expect(screen.getByText('Das Haus')).toBeInTheDocument()
    expect(screen.getByText('Ein Haus')).toBeInTheDocument()
  })
})

describe('PracticeCard – quiz mode', () => {
  it('marks correct answer green after selection', () => {
    const onComplete = vi.fn()
    render(
      <PracticeCard
        question={{
          type: 'quiz',
          prompt: 'What is Haus?',
          options: ['house', 'car', 'tree'],
          correctIndex: 0,
        }}
        onComplete={onComplete}
      />
    )
    fireEvent.click(screen.getByText('house'))
    expect(screen.getByText(/Correct/)).toBeInTheDocument()
  })

  it('calls onComplete after Continue click', () => {
    const onComplete = vi.fn()
    render(
      <PracticeCard
        question={{
          type: 'quiz',
          prompt: 'What is Haus?',
          options: ['house', 'car', 'tree'],
          correctIndex: 0,
        }}
        onComplete={onComplete}
      />
    )
    fireEvent.click(screen.getByText('house'))
    fireEvent.click(screen.getByText('Continue →'))
    expect(onComplete).toHaveBeenCalledWith({ correct: true, word: '' })
  })
})
