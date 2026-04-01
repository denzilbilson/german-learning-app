/**
 * Build a system + user prompt pair for generating practice questions.
 *
 * @param {'quiz'|'fill-blank'|'case-drill'|'translation'} mode
 * @param {object[]} vocabulary  – rows from vocabulary.md
 * @param {number}   count       – number of questions to generate
 * @returns {{ system: string, user: string }}
 */
export function buildGeneratePrompt(mode, vocabulary, count) {
  const vocabList = vocabulary
    .map(w => `- ${w.Word} (${w['Part of Speech'] || 'n/a'}) — ${w['Intended Meaning'] || ''} [${w.Level || ''}]`)
    .join('\n')

  const base = `You are generating German language practice exercises for a learner at B1–B2 level.

The learner's vocabulary:
${vocabList}

Return ONLY a valid JSON object — no markdown fences, no prose. Match the exact schema shown.`

  if (mode === 'quiz') {
    return {
      system: `${base}

Schema:
{
  "questions": [
    {
      "id": 1,
      "type": "quiz",
      "word": "the German word or phrase being tested",
      "prompt": "Full question text, e.g. 'What does \"die Vorstellung\" mean?'",
      "options": ["correct answer", "distractor", "distractor", "distractor"],
      "correctIndex": 0
    }
  ]
}

Rules:
- Generate exactly ${count} questions.
- Shuffle the options so correctIndex is not always 0.
- All four distractors must come from elsewhere in the vocabulary list — not fabricated.
- Mix German→English ("What does X mean?") and English→German ("Which word means Y?") questions.
- For English→German questions, the options should be German words from the list.`,
      user: `Generate ${count} quiz questions using the vocabulary above.`,
    }
  }

  if (mode === 'fill-blank') {
    return {
      system: `${base}

Schema:
{
  "questions": [
    {
      "id": 1,
      "type": "fill-blank",
      "sentence": "German sentence with ___ in place of the target word",
      "targetWord": "the exact word removed (base form, no article for nouns)",
      "hint": "English meaning of the missing word",
      "correctAnswer": "exact form that fills the blank (with article if needed)",
      "englishTranslation": "Full English translation of the sentence"
    }
  ]
}

Rules:
- Generate exactly ${count} questions.
- Each sentence must be natural, everyday German.
- The blank replaces one word (or article + noun as one unit, e.g. "die Vorstellung").
- The hint gives the English meaning without revealing the German word.
- Vary the target words across questions.`,
      user: `Generate ${count} fill-in-the-blank exercises using the vocabulary above.`,
    }
  }

  if (mode === 'case-drill') {
    return {
      system: `${base}

Schema:
{
  "questions": [
    {
      "id": 1,
      "type": "case-drill",
      "prompt": "German sentence with (BaseForm) in parentheses where the student supplies the declined form",
      "targetCase": "Nominative | Accusative | Dative | Genitive",
      "targetWord": "base form of the word to decline",
      "correctAnswer": "fully declined form the student must write",
      "rule": "One-sentence grammar rule explaining why this case/form is used",
      "fullSentence": "Complete correct German sentence for reference"
    }
  ]
}

Rules:
- Generate exactly ${count} questions.
- Cover all four cases across the set (not just accusative).
- Include noun + article declension, pronoun forms, and adjective endings.
- Use vocabulary words from the list where possible as the target words.
- Prompt example: "Ich helfe (der Freund)." → correctAnswer: "dem Freund"`,
      user: `Generate ${count} case drill exercises. Spread across Nominative, Accusative, Dative, and Genitive.`,
    }
  }

  if (mode === 'translation') {
    return {
      system: `${base}

Schema:
{
  "questions": [
    {
      "id": 1,
      "type": "translation",
      "englishPrompt": "English sentence the student must translate into German",
      "keyWords": ["GermanWord1", "GermanWord2"],
      "hint": "Use: GermanWord1, GermanWord2",
      "modelAnswer": "Natural, idiomatic German translation"
    }
  ]
}

Rules:
- Generate exactly ${count} questions.
- Each sentence uses 1–2 words from the vocabulary list.
- Sentences should be B1–B2 level — meaningful, not trivial.
- keyWords contains the vocabulary-list words the student should incorporate.
- modelAnswer must be natural German, not a word-for-word literal translation.`,
      user: `Generate ${count} translation exercises using vocabulary from the list above.`,
    }
  }

  throw new Error(`Unknown practice mode: ${mode}`)
}
