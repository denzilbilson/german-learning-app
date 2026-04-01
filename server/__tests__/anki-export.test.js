/**
 * Tests for anki-export.js
 */
import { describe, it, expect } from 'vitest'
import { generateTSV } from '../services/anki-export.js'

const HEADER = '#separator:tab\n#html:true\nFront\tBack\tTags'

describe('generateTSV()', () => {
  it('always starts with the required header lines', () => {
    const tsv = generateTSV([], [])
    expect(tsv.startsWith('#separator:tab\n#html:true\nFront\tBack\tTags')).toBe(true)
  })

  it('vocabulary entries produce correct TSV with tab separation', () => {
    const vocab = [{
      Word: 'Vorstellung',
      'Literal Meaning': 'presentation',
      'Intended Meaning': 'idea, concept',
      'Part of Speech': 'die Nomen (f.)',
      'Case Examples': '',
      Level: 'B1',
    }]
    const tsv = generateTSV(vocab, [])
    const lines = tsv.split('\n')
    // Should have header (3 lines) + 1 data row
    expect(lines).toHaveLength(4)
    const dataLine = lines[3]
    const parts = dataLine.split('\t')
    expect(parts[0]).toBe('Vorstellung')
    expect(parts[1]).toContain('Literal: presentation')
    expect(parts[1]).toContain('Meaning: idea, concept')
    expect(parts[2]).toBe('B1::vocabulary')
  })

  it('phrase entries produce correct TSV', () => {
    const phrases = [{
      Phrase: 'Wie geht es Ihnen?',
      'English Meaning': 'How are you?',
      Level: 'A1',
      Source: 'Textbook',
    }]
    const tsv = generateTSV([], phrases)
    const lines = tsv.split('\n')
    expect(lines).toHaveLength(4)
    const dataLine = lines[3]
    const parts = dataLine.split('\t')
    expect(parts[0]).toBe('Wie geht es Ihnen?')
    expect(parts[1]).toContain('How are you?')
    expect(parts[2]).toBe('A1::phrases')
  })

  it('HTML <br> tags are preserved in Case Examples output', () => {
    const vocab = [{
      Word: 'Haus',
      'Literal Meaning': 'house',
      'Intended Meaning': 'house',
      'Part of Speech': 'das Nomen (n.)',
      'Case Examples': 'Das Haus ist groß<br>Ich sehe das Haus',
      Level: 'B1',
    }]
    const tsv = generateTSV(vocab, [])
    expect(tsv).toContain('Das Haus ist groß<br>Ich sehe das Haus')
  })

  it('German umlauts survive encoding without corruption', () => {
    const vocab = [{
      Word: 'Mädchen',
      'Literal Meaning': 'girl',
      'Intended Meaning': 'girl',
      'Part of Speech': 'das Nomen (n.)',
      'Case Examples': 'Das Mädchen läuft',
      Level: 'A1',
    }]
    const tsv = generateTSV(vocab, [])
    expect(tsv).toContain('Mädchen')
    expect(tsv).toContain('läuft')
  })

  it('empty input produces only header lines', () => {
    const tsv = generateTSV([], [])
    expect(tsv).toBe(HEADER)
  })

  it('tabs in data are escaped as spaces', () => {
    const vocab = [{
      Word: 'Test\tWord',
      'Literal Meaning': 'tab\there',
      'Intended Meaning': 'meaning',
      'Part of Speech': 'Nomen',
      'Case Examples': '',
      Level: 'A1',
    }]
    const tsv = generateTSV(vocab, [])
    // Each data line should have exactly 2 tabs (separating 3 columns)
    const dataLine = tsv.split('\n')[3]
    const tabCount = (dataLine.match(/\t/g) || []).length
    expect(tabCount).toBe(2)
  })

  it('tag format is Level::vocabulary for vocab and Level::phrases for phrases', () => {
    const vocab = [{ Word: 'Test', 'Literal Meaning': '', 'Intended Meaning': 'test', 'Part of Speech': '', 'Case Examples': '', Level: 'C1' }]
    const phrases = [{ Phrase: 'Ein Test', 'English Meaning': 'a test', Level: 'C1', Source: '' }]
    const tsv = generateTSV(vocab, phrases)
    expect(tsv).toContain('C1::vocabulary')
    expect(tsv).toContain('C1::phrases')
  })

  it('entry with no level gets just "vocabulary" tag (no "::")', () => {
    const vocab = [{
      Word: 'Wort',
      'Literal Meaning': '',
      'Intended Meaning': 'word',
      'Part of Speech': '',
      'Case Examples': '',
      Level: '',
    }]
    const tsv = generateTSV(vocab, [])
    const dataLine = tsv.split('\n')[3]
    const tag = dataLine.split('\t')[2]
    expect(tag).toBe('vocabulary')
    expect(tag).not.toContain('::')
  })

  it('mixed vocabulary + phrases produces combined TSV', () => {
    const vocab = [{ Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1' }]
    const phrases = [{ Phrase: 'Guten Tag', 'English Meaning': 'Good day', Level: 'A1', Source: '' }]
    const tsv = generateTSV(vocab, phrases)
    const lines = tsv.split('\n')
    expect(lines).toHaveLength(5) // 3 header + 1 vocab + 1 phrase
    expect(lines[3]).toContain('Hund')
    expect(lines[4]).toContain('Guten Tag')
  })

  it('escapes formula-injection characters at cell start', () => {
    const vocab = [
      { Word: '=SUM(A1)', 'Literal Meaning': '+danger', 'Intended Meaning': '-risk', 'Part of Speech': '@here', 'Case Examples': '', Level: 'A1' },
    ]
    const tsv = generateTSV(vocab, [])
    const dataLine = tsv.split('\n')[3]
    // Front field starts with = → must be prefixed with '
    expect(dataLine.startsWith("'=SUM(A1)")).toBe(true)
    // Back field parts that start with + or - should also be prefixed
    expect(dataLine).toContain("'+danger")
    expect(dataLine).toContain("'-risk")
    expect(dataLine).toContain("'@here")
  })

  it('camelCase keys (from Claude output) are also supported', () => {
    const vocab = [{
      word: 'lernen',
      literalMeaning: 'to learn',
      intendedMeaning: 'to learn',
      partOfSpeech: 'Verb',
      caseExamples: 'Ich lerne Deutsch',
      level: 'A1',
    }]
    const tsv = generateTSV(vocab, [])
    expect(tsv).toContain('lernen')
    expect(tsv).toContain('Literal: to learn')
  })
})
