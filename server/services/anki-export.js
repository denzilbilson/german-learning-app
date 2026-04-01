/**
 * Generates Anki-compatible TSV from vocabulary and/or phrase entries.
 * Handles both Title Case keys (from markdown store) and camelCase keys
 * (from Claude analysis responses).
 *
 * TSV format: Front  Back  Tags
 * HTML is allowed in Back field.
 */

function get(entry, titleKey, camelKey) {
  return entry[titleKey] ?? entry[camelKey] ?? ''
}

function escapeField(str) {
  // Tabs and newlines break TSV — replace with spaces
  return (str || '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ')
}

function vocabCard(entry) {
  const word = escapeField(get(entry, 'Word', 'word'))
  if (!word) return null

  const literal  = get(entry, 'Literal Meaning',  'literalMeaning')
  const meaning  = get(entry, 'Intended Meaning', 'intendedMeaning')
  const pos      = get(entry, 'Part of Speech',   'partOfSpeech')
  const examples = get(entry, 'Case Examples',    'caseExamples')
  const def      = entry.germanDefinition || ''

  const parts = []
  if (literal)  parts.push(`Literal: ${escapeField(literal)}`)
  if (meaning)  parts.push(`Meaning: ${escapeField(meaning)}`)
  if (pos)      parts.push(`<b>${escapeField(pos)}</b>`)

  // Case Examples can be a string with <br> separators or an array
  if (examples) {
    const exStr = Array.isArray(examples) ? examples.join('<br>') : String(examples)
    parts.push(exStr)
  }

  if (def) parts.push(`<br><i>${escapeField(def)}</i>`)

  const back  = parts.join('<br>')
  const level = (get(entry, 'Level', 'level') || '').trim()
  const tag   = level ? `${level}::vocabulary` : 'vocabulary'

  return `${word}\t${back}\t${tag}`
}

function phraseCard(entry) {
  const phrase = escapeField(get(entry, 'Phrase', 'phrase'))
  if (!phrase) return null

  const engMeaning = get(entry, 'English Meaning', 'englishMeaning')
  const src        = get(entry, 'Source', 'source')
  const def        = entry.germanDefinition || ''

  const parts = []
  if (engMeaning) parts.push(escapeField(engMeaning))
  if (src)        parts.push(`<i>Source: ${escapeField(src)}</i>`)
  if (def)        parts.push(`<br><i>${escapeField(def)}</i>`)

  const back  = parts.join('<br>')
  const level = (get(entry, 'Level', 'level') || '').trim()
  const tag   = level ? `${level}::phrases` : 'phrases'

  return `${phrase}\t${back}\t${tag}`
}

/**
 * @param {object[]} vocabEntries
 * @param {object[]} phraseEntries
 * @returns {string} TSV content ready for Anki import
 */
export function generateTSV(vocabEntries = [], phraseEntries = []) {
  const lines = [
    '#separator:tab',
    '#html:true',
    'Front\tBack\tTags',
  ]

  for (const entry of vocabEntries) {
    const line = vocabCard(entry)
    if (line) lines.push(line)
  }

  for (const entry of phraseEntries) {
    const line = phraseCard(entry)
    if (line) lines.push(line)
  }

  return lines.join('\n')
}
