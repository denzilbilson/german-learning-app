# Prompt Templates

All Claude prompts live in `server/prompts/`. Each file exports either a constant string (system prompt) or a builder function that returns `{ system, user }` pairs or a single user string. All prompts instruct Claude to return **JSON only** — no prose, no markdown fences.

---

## analyze-text.js

**File:** `server/prompts/analyze-text.js`  
**Export:** `analyzeTextPrompt` (string constant — used as the system prompt)  
**Called by:** `POST /api/analyze`

### Purpose

Given a piece of German text, extract a structured linguistic analysis for a B1→B2 learner: sentence-by-sentence translations, key vocabulary with examples, phrasal idioms, and grammar notes.

### Input shape

```js
// system:
analyzeTextPrompt

// user (built in routes/analyze.js):
"Analyze this German text (source: Der Spiegel):\n\n<german text here>"
```

### Output shape

```json
{
  "translations": [
    { "german": "sentence", "english": "natural English translation" }
  ],
  "vocabulary": [
    {
      "word": "die Vorstellung",
      "literalMeaning": "the imagining / the presenting",
      "intendedMeaning": "idea, concept; also: a performance or show",
      "partOfSpeech": "Noun (f.)",
      "caseExamples": [
        "Ich habe keine Vorstellung davon.",
        "Die Abendvorstellung beginnt um 20 Uhr."
      ],
      "level": "B1"
    }
  ],
  "phrases": [
    { "phrase": "Es kommt darauf an.", "englishMeaning": "It depends.", "level": "B1" }
  ],
  "grammar": [
    { "topic": "da-compounds", "explanation": "da-compounds like 'darauf' replace prepositional phrases..." }
  ]
}
```

### Key guidelines baked into the prompt

- 5–12 vocabulary entries; skip basic A1 words unless in a non-obvious construction
- 3–8 phrases; extract multi-word idioms and fixed collocations, not individual words
- 2–5 grammar points; focus on constructions that confuse B1–B2 learners
- Every sentence in the input must appear in `translations`
- `caseExamples` should be freshly written, not copied verbatim from the input text

---

## generate-practice.js

**File:** `server/prompts/generate-practice.js`  
**Export:** `buildGeneratePrompt(mode, vocabulary, count)` → `{ system: string, user: string }`  
**Called by:** `POST /api/practice/generate`

### Purpose

Generate a set of practice questions in a specific mode, tailored to the learner's current vocabulary.

### Input shape

```js
buildGeneratePrompt('quiz', vocabularyRows, 10)
// vocabularyRows = [{ Word, 'Part of Speech', 'Intended Meaning', Level, ... }, ...]
```

### Output shape (by mode)

**quiz**
```json
{
  "questions": [
    {
      "id": 1,
      "type": "quiz",
      "word": "die Vorstellung",
      "prompt": "What does 'die Vorstellung' mean?",
      "options": ["idea, concept", "to introduce", "the attempt", "the beginning"],
      "correctIndex": 0
    }
  ]
}
```

**fill-blank**
```json
{
  "questions": [
    {
      "id": 1,
      "type": "fill-blank",
      "sentence": "Ich habe keine ___ von diesem Thema.",
      "targetWord": "Vorstellung",
      "hint": "idea, concept",
      "correctAnswer": "Vorstellung",
      "englishTranslation": "I have no idea about this topic."
    }
  ]
}
```

**case-drill**
```json
{
  "questions": [
    {
      "id": 1,
      "type": "case-drill",
      "prompt": "Ich helfe (der Freund).",
      "targetCase": "Dative",
      "targetWord": "der Freund",
      "correctAnswer": "dem Freund",
      "rule": "Verbs like 'helfen' require the dative case for their object.",
      "fullSentence": "Ich helfe dem Freund."
    }
  ]
}
```

**translation**
```json
{
  "questions": [
    {
      "id": 1,
      "type": "translation",
      "englishPrompt": "I have no idea about this topic.",
      "keyWords": ["die Vorstellung"],
      "hint": "Use: die Vorstellung",
      "modelAnswer": "Ich habe keine Vorstellung von diesem Thema."
    }
  ]
}
```

### Notes

- The vocab list is injected verbatim into the system prompt so Claude can generate plausible distractors and contextually appropriate sentences
- Flashcard mode never calls this prompt — it simply shuffles vocabulary rows client-side
- Count is capped at `min(requested, vocab.length * 2, 15)` before the API call

---

## check-answer.js

**File:** `server/prompts/check-answer.js`  
**Exports:** `CHECK_ANSWER_SYSTEM` (string constant), `buildCheckMessage(question, userAnswer, correctAnswer, mode)` → `string`  
**Called by:** `POST /api/practice/check`

### Purpose

Evaluate a learner's free-text answer against a reference answer. Returns a structured verdict with an explanation and (if wrong) the model answer.

### Input shape

```js
// system:
CHECK_ANSWER_SYSTEM

// user (built by buildCheckMessage):
"Mode: fill-blank
Question: Sentence: \"Ich habe keine ___ von diesem Thema.\" — English: \"I have no idea about this topic.\"
Reference answer: Vorstellung
Student's answer: vorstellung

Is the student's answer correct?"
```

### Output shape

```json
{
  "correct": true,
  "explanation": "Correct! 'Vorstellung' fits perfectly here. Capitalisation of nouns is optional in this context.",
  "modelAnswer": "Vorstellung"
}
```

`modelAnswer` is omitted when `correct` is `true`.

### Evaluation rules by mode

| Mode | Strictness |
|------|-----------|
| `fill-blank` | Case-insensitive; spelling must be correct; omitted article acceptable when not required |
| `case-drill` | Declension must be exactly right; wrong case = incorrect |
| `translation` | Accept any grammatically correct German that conveys the meaning; different word order or synonyms are fine |

---

## conjugate-verb.js

**File:** `server/prompts/conjugate-verb.js`  
**Export:** `buildConjugatePrompt(verb)` → `{ system: string, user: string }`  
**Called by:** `POST /api/vocabulary/conjugate`

### Purpose

Conjugate a German verb across four tenses and all persons, returning structured JSON. Results are cached to disk in `data/conjugations/` to avoid repeated API calls.

### Input shape

```js
buildConjugatePrompt('verstehen')
```

### Output shape

```json
{
  "infinitive": "verstehen",
  "isReflexive": false,
  "auxiliary": "haben",
  "tenses": {
    "Präsens":      { "ich": "verstehe", "du": "verstehst", "er/sie/es": "versteht", "wir": "verstehen", "ihr": "versteht", "sie/Sie": "verstehen" },
    "Präteritum":   { "ich": "verstand", "du": "verstandst", "er/sie/es": "verstand", "wir": "verstanden", "ihr": "verstandet", "sie/Sie": "verstanden" },
    "Perfekt":      { "ich": "habe verstanden", "du": "hast verstanden", "er/sie/es": "hat verstanden", "wir": "haben verstanden", "ihr": "habt verstanden", "sie/Sie": "haben verstanden" },
    "Konjunktiv II":{ "ich": "würde verstehen", "du": "würdest verstehen", "er/sie/es": "würde verstehen", "wir": "würden verstehen", "ihr": "würdet verstehen", "sie/Sie": "würden verstehen" }
  }
}
```

### Notes

- Perfekt forms include the auxiliary: `"ich habe verstanden"` not just `"verstanden"`
- `isReflexive: true` for verbs like `sich erinnern`
- `auxiliary` is `"haben"` or `"sein"` (e.g. `gehen` → `"sein"`)
- Cache file: `data/conjugations/{sanitized-verb}.json` (persists indefinitely)

---

## enrich-anki.js

**File:** `server/prompts/enrich-anki.js`  
**Exports:** `ENRICH_ANKI_SYSTEM` (string constant), `buildEnrichMessage(terms)` → `string`  
**Called by:** `POST /api/anki/export` when `enrich: true`

### Purpose

For each German word or phrase in the export list, generate a short monolingual German definition (1–2 sentences at B1–B2 level). The definitions are appended in italics to the Anki card backs, helping learners build German-only mental models.

### Input shape

```js
buildEnrichMessage(['die Vorstellung', 'Es kommt darauf an.', 'die Absicht'])
// →
// "Please write a short German definition for each of the following terms:
//
// 1. die Vorstellung
// 2. Es kommt darauf an.
// 3. die Absicht"
```

### Output shape

```json
[
  {
    "term": "die Vorstellung",
    "definition": "Das Bild oder der Gedanke, den man sich von etwas macht. Auch eine öffentliche Aufführung, zum Beispiel im Theater."
  },
  {
    "term": "Es kommt darauf an.",
    "definition": "Diese Redewendung bedeutet, dass die Antwort von verschiedenen Faktoren abhängt und nicht immer gleich ist."
  },
  {
    "term": "die Absicht",
    "definition": "Ein Plan oder Ziel, das man erreichen möchte. Wenn man etwas absichtlich tut, dann macht man es mit Absicht."
  }
]
```

### Notes

- Definitions are B1–B2 vocabulary level — simple, not academic
- Enrichment is optional (controlled by the `enrich` flag in the export request)
- If the Claude call fails, the export proceeds without definitions (non-fatal)
- The returned array is keyed by `term.toLowerCase()` for fast lookup when building TSV cards
