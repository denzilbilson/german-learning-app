/**
 * Tests for GenderBadge component and detectGender() helper.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import GenderBadge, { detectGender } from '../components/GenderBadge.jsx'

describe('detectGender()', () => {
  it('returns masculine for "der Tisch"', () => {
    expect(detectGender('der Tisch')).toBe('masculine')
  })

  it('returns feminine for "die Frau"', () => {
    expect(detectGender('die Frau')).toBe('feminine')
  })

  it('returns neuter for "das Kind"', () => {
    expect(detectGender('das Kind')).toBe('neuter')
  })

  it('returns plural for "pl."', () => {
    expect(detectGender('Nomen pl.')).toBe('plural')
  })

  it('returns masculine for "(m.)"', () => {
    expect(detectGender('Nomen (m.)')).toBe('masculine')
  })

  it('returns feminine for "(f.)"', () => {
    expect(detectGender('Nomen (f.)')).toBe('feminine')
  })

  it('returns neuter for "(n.)"', () => {
    expect(detectGender('Nomen (n.)')).toBe('neuter')
  })

  it('returns null for ambiguous/non-noun parts of speech', () => {
    expect(detectGender('Verb')).toBeNull()
    expect(detectGender('Adverb')).toBeNull()
    expect(detectGender('')).toBeNull()
  })

  it('returns masculine for "maskulin"', () => {
    expect(detectGender('Nomen maskulin')).toBe('masculine')
  })

  it('returns feminine for "feminin"', () => {
    expect(detectGender('feminin Nomen')).toBe('feminine')
  })
})

describe('GenderBadge component', () => {
  it('renders blue badge for masculine (der)', () => {
    const { container } = render(<GenderBadge pos="der Tisch" />)
    const badge = container.querySelector('span')
    expect(badge).toBeTruthy()
    expect(badge.textContent).toBe('der')
    // jsdom normalizes hex colors to rgb() format
    expect(badge.style.color).toBe('rgb(74, 144, 217)')
  })

  it('renders red badge for feminine (die)', () => {
    const { container } = render(<GenderBadge pos="die Frau" />)
    const badge = container.querySelector('span')
    expect(badge).toBeTruthy()
    expect(badge.textContent).toBe('die')
    expect(badge.style.color).toBe('rgb(217, 74, 107)')
  })

  it('renders green badge for neuter (das)', () => {
    const { container } = render(<GenderBadge pos="das Kind" />)
    const badge = container.querySelector('span')
    expect(badge).toBeTruthy()
    expect(badge.textContent).toBe('das')
    expect(badge.style.color).toBe('rgb(74, 217, 122)')
  })

  it('renders purple badge for plural', () => {
    const { container } = render(<GenderBadge pos="Nomen pl." />)
    const badge = container.querySelector('span')
    expect(badge).toBeTruthy()
    expect(badge.textContent).toContain('pl.')
    expect(badge.style.color).toBe('rgb(155, 89, 182)')
  })

  it('renders nothing when gender cannot be detected', () => {
    const { container } = render(<GenderBadge pos="Verb" />)
    expect(container.firstChild).toBeNull()
  })
})
