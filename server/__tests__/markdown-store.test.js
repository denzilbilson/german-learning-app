/**
 * Tests for markdown-store.js
 * Uses real file I/O with temp directories.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

// We import the actual store functions, but override the file paths
import * as store from '../services/markdown-store.js'

let tmpDir
let vocabFile
let phrasesFile

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'markdown-store-test-'))
  vocabFile = join(tmpDir, 'vocabulary.md')
  phrasesFile = join(tmpDir, 'phrases.md')
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

// Helper to create a vocabulary table file
async function seedVocab(rows = []) {
  const headers = ['Word', 'Literal Meaning', 'Intended Meaning', 'Part of Speech', 'Case Examples', 'Level', 'Source', 'Date Added']
  const hRow = '| ' + headers.join(' | ') + ' |'
  const sep = '|' + headers.map(h => '-'.repeat(h.length + 2)).join('|') + '|'
  const dRows = rows.map(r =>
    '| ' + headers.map(h => (r[h] || '')).join(' | ') + ' |'
  )
  await writeFile(vocabFile, [hRow, sep, ...dRows].join('\n') + '\n', 'utf-8')
}

// Helper to create a phrases table file
async function seedPhrases(rows = []) {
  const headers = ['Phrase', 'English Meaning', 'Level', 'Source', 'Date Added']
  const hRow = '| ' + headers.join(' | ') + ' |'
  const sep = '|' + headers.map(h => '-'.repeat(h.length + 2)).join('|') + '|'
  const dRows = rows.map(r =>
    '| ' + headers.map(h => (r[h] || '')).join(' | ') + ' |'
  )
  await writeFile(phrasesFile, [hRow, sep, ...dRows].join('\n') + '\n', 'utf-8')
}

describe('getAll - vocabulary', () => {
  it('parses vocabulary table and returns correct JSON with all 8 fields', async () => {
    await seedVocab([{
      Word: 'Vorstellung',
      'Literal Meaning': 'presentation',
      'Intended Meaning': 'idea, concept',
      'Part of Speech': 'die Nomen (f.)',
      'Case Examples': 'Ich habe eine Vorstellung',
      Level: 'B1',
      Source: 'Test',
      'Date Added': '2024-01-01',
    }])
    const rows = await store.getAll(vocabFile)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      Word: 'Vorstellung',
      'Literal Meaning': 'presentation',
      'Intended Meaning': 'idea, concept',
      'Part of Speech': 'die Nomen (f.)',
      'Case Examples': 'Ich habe eine Vorstellung',
      Level: 'B1',
      Source: 'Test',
      'Date Added': '2024-01-01',
    })
  })

  it('parses phrases table and returns correct JSON with all 5 fields', async () => {
    await seedPhrases([{
      Phrase: 'Wie geht es Ihnen?',
      'English Meaning': 'How are you?',
      Level: 'A1',
      Source: 'Textbook',
      'Date Added': '2024-02-01',
    }])
    const rows = await store.getAll(phrasesFile)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      Phrase: 'Wie geht es Ihnen?',
      'English Meaning': 'How are you?',
      Level: 'A1',
      Source: 'Textbook',
      'Date Added': '2024-02-01',
    })
  })

  it('returns empty array for headers-only table', async () => {
    await seedVocab([])
    const rows = await store.getAll(vocabFile)
    expect(rows).toEqual([])
  })

  it('creates file with correct headers and returns [] if file is missing', async () => {
    const missingFile = join(tmpDir, 'missing.md')
    const rows = await store.getAll(missingFile)
    expect(rows).toEqual([])
    // File should have been created
    const content = await readFile(missingFile, 'utf-8')
    expect(content).toContain('| Item | Value |')
  })

  it('skips malformed rows (wrong column count) and continues', async () => {
    const headers = ['Word', 'Literal Meaning', 'Intended Meaning', 'Part of Speech', 'Case Examples', 'Level', 'Source', 'Date Added']
    const hRow = '| ' + headers.join(' | ') + ' |'
    const sep = '|' + headers.map(h => '-'.repeat(h.length + 2)).join('|') + '|'
    // Good row
    const goodRow = '| Hund | dog | dog | Nomen | Hund ist groß | A1 | Test | 2024-01-01 |'
    // Bad row (missing columns)
    const badRow = '| Katze | cat |'
    await writeFile(vocabFile, [hRow, sep, goodRow, badRow].join('\n') + '\n', 'utf-8')
    const rows = await store.getAll(vocabFile)
    expect(rows).toHaveLength(1)
    expect(rows[0].Word).toBe('Hund')
  })

  it('German umlauts (ä ö ü ß) survive a round-trip', async () => {
    await seedVocab([{
      Word: 'Mädchen',
      'Literal Meaning': 'girl',
      'Intended Meaning': 'girl',
      'Part of Speech': 'das Nomen (n.)',
      'Case Examples': 'Das Mädchen läuft',
      Level: 'A1',
      Source: 'Test',
      'Date Added': '2024-01-01',
    }])
    await store.add(vocabFile, [{
      Word: 'Straße',
      'Literal Meaning': 'street',
      'Intended Meaning': 'street',
      'Part of Speech': 'die Nomen (f.)',
      'Case Examples': 'Die Straße ist breit',
      Level: 'A1',
      Source: 'Test',
    }])
    const rows = await store.getAll(vocabFile)
    expect(rows.find(r => r.Word === 'Mädchen')).toBeTruthy()
    expect(rows.find(r => r.Word === 'Straße')).toBeTruthy()
    const strasseRow = rows.find(r => r.Word === 'Straße')
    expect(strasseRow['Case Examples']).toBe('Die Straße ist breit')
  })

  it('<br> tags in Case Examples survive round-trip', async () => {
    await seedVocab([{
      Word: 'Haus',
      'Literal Meaning': 'house',
      'Intended Meaning': 'house',
      'Part of Speech': 'das Nomen (n.)',
      'Case Examples': 'Das Haus ist groß<br>Ich sehe das Haus',
      Level: 'B1',
      Source: 'Test',
      'Date Added': '2024-01-01',
    }])
    const rows = await store.getAll(vocabFile)
    expect(rows[0]['Case Examples']).toContain('<br>')
    expect(rows[0]['Case Examples']).toBe('Das Haus ist groß<br>Ich sehe das Haus')
  })

  it('level filter returns only rows matching that level', async () => {
    await seedVocab([
      { Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
      { Word: 'Haus', 'Literal Meaning': 'house', 'Intended Meaning': 'house', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'B1', Source: '', 'Date Added': '2024-01-01' },
      { Word: 'Katze', 'Literal Meaning': 'cat', 'Intended Meaning': 'cat', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
    ])
    const rows = await store.getAll(vocabFile, { level: 'A1' })
    expect(rows).toHaveLength(2)
    expect(rows.every(r => r.Level === 'A1')).toBe(true)
  })

  it('search filter returns rows matching the query (case-insensitive)', async () => {
    await seedVocab([
      { Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
      { Word: 'Haus', 'Literal Meaning': 'house', 'Intended Meaning': 'house', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'B1', Source: '', 'Date Added': '2024-01-01' },
    ])
    const rows = await store.getAll(vocabFile, { search: 'HUND' })
    expect(rows).toHaveLength(1)
    expect(rows[0].Word).toBe('Hund')
  })
})

describe('add()', () => {
  it('appends entry to end of table', async () => {
    await seedVocab([{ Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: 'Test', 'Date Added': '2024-01-01' }])
    await store.add(vocabFile, [{
      Word: 'Katze',
      'Literal Meaning': 'cat',
      'Intended Meaning': 'cat',
      'Part of Speech': 'Nomen',
      'Case Examples': '',
      Level: 'A1',
      Source: 'Test',
    }])
    const rows = await store.getAll(vocabFile)
    expect(rows).toHaveLength(2)
    expect(rows[1].Word).toBe('Katze')
  })

  it('auto-fills Date Added if not provided', async () => {
    await seedVocab([])
    await store.add(vocabFile, [{
      Word: 'Schule',
      'Literal Meaning': 'school',
      'Intended Meaning': 'school',
      'Part of Speech': 'Nomen',
      'Case Examples': '',
      Level: 'A1',
      Source: 'Test',
    }])
    const rows = await store.getAll(vocabFile)
    expect(rows[0]['Date Added']).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('stores and retrieves empty string fields correctly', async () => {
    await seedVocab([])
    await store.add(vocabFile, [{
      Word: 'Wort',
      'Literal Meaning': '',
      'Intended Meaning': 'word',
      'Part of Speech': '',
      'Case Examples': '',
      Level: '',
      Source: '',
    }])
    const rows = await store.getAll(vocabFile)
    expect(rows[0]['Literal Meaning']).toBe('')
    expect(rows[0]['Part of Speech']).toBe('')
  })
})

describe('update()', () => {
  it('updates a row by index, leaving other rows untouched', async () => {
    await seedVocab([
      { Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: 'Test', 'Date Added': '2024-01-01' },
      { Word: 'Katze', 'Literal Meaning': 'cat', 'Intended Meaning': 'cat', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: 'Test', 'Date Added': '2024-01-01' },
    ])
    await store.update(vocabFile, 0, { Level: 'B1' })
    const rows = await store.getAll(vocabFile)
    expect(rows[0].Level).toBe('B1')
    expect(rows[1].Level).toBe('A1') // unchanged
    expect(rows[1].Word).toBe('Katze') // unchanged
  })

  it('throws descriptive error for out-of-bounds index', async () => {
    await seedVocab([{ Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: 'Test', 'Date Added': '2024-01-01' }])
    await expect(store.update(vocabFile, 99, { Level: 'B1' })).rejects.toThrow(/out of range/)
  })
})

describe('remove()', () => {
  it('deletes a row by index, others shift correctly', async () => {
    await seedVocab([
      { Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: 'Test', 'Date Added': '2024-01-01' },
      { Word: 'Katze', 'Literal Meaning': 'cat', 'Intended Meaning': 'cat', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: 'Test', 'Date Added': '2024-01-01' },
      { Word: 'Maus', 'Literal Meaning': 'mouse', 'Intended Meaning': 'mouse', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: 'Test', 'Date Added': '2024-01-01' },
    ])
    const removed = await store.remove(vocabFile, 1)
    expect(removed.Word).toBe('Katze')
    const rows = await store.getAll(vocabFile)
    expect(rows).toHaveLength(2)
    expect(rows[0].Word).toBe('Hund')
    expect(rows[1].Word).toBe('Maus')
  })

  it('throws descriptive error for out-of-bounds delete', async () => {
    await seedVocab([{ Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: 'Test', 'Date Added': '2024-01-01' }])
    await expect(store.remove(vocabFile, 5)).rejects.toThrow(/out of range/)
  })
})

describe('round-trip', () => {
  it('read → write → read yields identical data', async () => {
    const original = [
      { Word: 'Zukunft', 'Literal Meaning': 'future', 'Intended Meaning': 'future', 'Part of Speech': 'die Nomen (f.)', 'Case Examples': 'Die Zukunft ist offen', Level: 'B2', Source: 'Test', 'Date Added': '2024-03-15' },
      { Word: 'Vergangenheit', 'Literal Meaning': 'past', 'Intended Meaning': 'past', 'Part of Speech': 'die Nomen (f.)', 'Case Examples': 'Die Vergangenheit ist vergessen', Level: 'B2', Source: 'Test', 'Date Added': '2024-03-15' },
    ]
    await seedVocab(original)
    const first = await store.getAll(vocabFile)
    // Write one more, delete it, then compare
    await store.add(vocabFile, [{ Word: 'Temp', 'Literal Meaning': '', 'Intended Meaning': '', 'Part of Speech': '', 'Case Examples': '', Level: '', Source: '' }])
    await store.remove(vocabFile, 2)
    const second = await store.getAll(vocabFile)
    expect(second.map(r => r.Word)).toEqual(first.map(r => r.Word))
  })

  it('handles very long cell content (500+ chars)', async () => {
    const longText = 'a'.repeat(500)
    await seedVocab([])
    await store.add(vocabFile, [{
      Word: 'Test',
      'Literal Meaning': longText,
      'Intended Meaning': 'test',
      'Part of Speech': 'Nomen',
      'Case Examples': '',
      Level: 'A1',
      Source: '',
    }])
    const rows = await store.getAll(vocabFile)
    expect(rows[0]['Literal Meaning']).toBe(longText)
  })
})
