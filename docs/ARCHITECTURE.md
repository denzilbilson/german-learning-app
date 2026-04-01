# Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (http://localhost:5173)                                 │
│                                                                  │
│  React 18 + React Router + Tailwind CSS                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │Dashboard │  │Vocabulary│  │ Practice │  │Analysis  │  ...   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│        │              │              │              │            │
│        └──────────────┴──────────────┴──────────────┘           │
│                          services/api.js                         │
│                    (fetch wrapper, 30s timeout)                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │  HTTP /api/*  (Vite proxy in dev)
┌──────────────────────────────▼──────────────────────────────────┐
│  Express.js (http://localhost:3001)                              │
│                                                                  │
│  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ vocabulary │ │ analyze  │ │ practice │ │ search/sessions  │ │
│  │ phrases    │ │ anki     │ │ progress │ │ import/grammar   │ │
│  └─────┬──────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘ │
│        │              │              │              │             │
│  ┌─────▼──────────────▼──────────────▼──────────────▼─────────┐ │
│  │               server/services/                               │ │
│  │   markdown-store.js    claude-service.js    anki-export.js  │ │
│  └──────────┬─────────────────────┬────────────────────────────┘ │
└─────────────┼─────────────────────┼──────────────────────────────┘
              │                     │
   ┌──────────▼──────────┐  ┌───────▼───────────────┐
   │  ./data/  (disk)     │  │  Anthropic Claude API  │
   │  vocabulary.md       │  │  claude-sonnet-4-...   │
   │  phrases.md          │  │  (HTTPS, 120s timeout) │
   │  grammar/rules.md    │  └───────────────────────┘
   │  analysis/*.json     │
   │  progress/log.md     │
   │  progress/sessions/  │
   │  conjugations/*.json │
   └──────────────────────┘
```

---

## Data Flow: Text Analysis

```
1. User pastes German text in TextAnalysis.jsx
2. POST /api/analyze  { text, source? }
3. Express builds userMessage, calls callClaude(analyzeTextPrompt, userMessage)
4. Claude returns JSON: { translations[], vocabulary[], phrases[], grammar[] }
5. Express saves JSON to data/analysis/analysis-{ISO}.json
6. Frontend shows AnalysisReader with checkboxes
7. User selects items → POST /api/analyze/add  { vocabulary[], phrases[], source }
8. Express deduplicates against existing entries (case-insensitive primary key)
9. Appends new rows to vocabulary.md and/or phrases.md
10. Returns { added: { vocabulary, phrases }, skipped: { vocabulary, phrases } }
11. Frontend shows toast notification
```

## Data Flow: Practice Session

```
1. User picks a mode in Practice.jsx (flashcard/quiz/fill-blank/case-drill/translation)
2. POST /api/practice/generate  { mode, count, level? }
3. Express reads vocabulary.md (filtered by level if provided)
   - Flashcard: shuffle and return directly (no Claude call)
   - Other modes: POST to Claude with buildGeneratePrompt(mode, vocab, count)
4. Claude returns { questions: [...] }
5. Frontend shows PracticeCard for each question in turn
6. For text-input modes (fill-blank, case-drill, translation):
   - User types answer → POST /api/practice/check { question, userAnswer, correctAnswer, mode }
   - Express calls Claude with CHECK_ANSWER_SYSTEM prompt
   - Claude returns { correct, explanation, modelAnswer? }
7. For quiz/article-drill: evaluated client-side (no API call)
8. Session ends → POST /api/progress { mode, score, total, durationMs, questions[], weakWords[] }
9. Express writes data/progress/sessions/{id}.json (full detail)
         and appends summary row to data/progress/log.md
```

## Data Flow: Anki Export

```
1. User selects vocab/phrases and opens AnkiExportModal
2. POST /api/anki/export  { vocabulary[], phrases[], enrich: boolean }
3. If enrich=true:
   a. Extract all terms into a list
   b. callClaude(ENRICH_ANKI_SYSTEM, buildEnrichMessage(terms))
   c. Claude returns [{ term, definition }, ...] in German (B1-B2 level)
   d. Build lookup map: term.toLowerCase() → definition
   e. Attach germanDefinition field to each entry
4. generateTSV(vocabEntries, phraseEntries) builds TSV lines:
   - Header: #separator:tab / #html:true / Front\tBack\tTags
   - Vocab:  word \t Literal:…<br>Meaning:…<br><b>POS</b><br>examples \t Level::vocabulary
   - Phrase: phrase \t meaning<br>Source:… \t Level::phrases
5. Response headers set Content-Disposition: attachment; filename="anki-export-{date}.tsv"
6. Browser downloads file; user imports into Anki desktop
```

## Data Flow: CSV/Notion Import

```
1. User uploads a .csv / .tsv file in Import.jsx (3-step wizard)
2. POST /api/import/csv  (multipart/form-data, max 5 MB)
3. Express reads file buffer, detects delimiter (tab > comma > semicolon)
4. csv-parse produces records[]
5. Headers are mapped to schema keys via VOCAB_ALIASES / PHRASE_ALIASES fuzzy tables
6. Response: { headers, vocabMapping, phraseMapping, unmapped, totalRows, preview[10], data }
7. User confirms mapping and selects target (vocabulary or phrases)
8. POST /api/import/confirm  { data, mapping[], target }
9. Express loads existing entries, builds Set of lowercase primary keys
10. For each row: sanitise fields, normalise date, skip duplicates, collect errors
11. store.add(file, toAdd) writes all valid rows in one pass
12. Returns { added, duplicatesSkipped, errors, errorDetails }
```

## Data Flow: Global Search

```
1. User opens Cmd+K dialog (GlobalSearch.jsx)
2. Input debounced 300ms → GET /api/search?q=…&type=all
3. Express fans out to 4 async search functions in parallel:
   - searchVocabulary: getAll + matchScore across Word/Meaning/Examples fields
   - searchPhrases:    getAll + matchScore across Phrase/EnglishMeaning fields
   - searchGrammar:    readFile(rules.md) + matchScore across Topic/Explanation
   - searchAnalyses:   readdir(analysis/) + matchScore across originalText/source
4. Scoring: exact=3, starts-with=2, contains=1
   German chars normalised: ä→ae, ö→oe, ü→ue, ß→ss for comparison
5. Each type returns top 20 by score; response: { query, total, results: { vocabulary, phrases, grammar, analysis } }
6. Frontend groups results by type, highlights query match, navigates on Enter/click
```

---

## Error Handling Approach

### Backend

- All route handlers are wrapped in `try/catch`; errors return `{ error: string }` with appropriate HTTP status
- `markdown-store.js` auto-creates missing files; `ENOENT` on read is handled gracefully
- `claude-service.js` retries:
  - **Rate limit (429):** exponential backoff 2s → 4s → 8s, up to 3 extra attempts
  - **Malformed JSON:** immediate retry up to `maxRetries` (default 2) times
  - **Auth failure (401):** throws immediately with user-friendly message
  - **Network / timeout:** throws with descriptive message, no retry
- Global Express error handler catches anything that escapes route handlers
- `uncaughtException` / `unhandledRejection` log and `process.exit(1)`

### Frontend

- `ErrorBoundary` wraps all routes; catches render errors and shows a "Try Again" button
- `api.js` retries `5xx` responses once after 2 seconds; rejects on second failure
- Loading states shown for all async operations; errors surface via toast notifications
- Practice answer checking degrades gracefully if Claude is unavailable

---

## Design System

### Colour Palette (Tailwind custom tokens)

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-gold` | `#D4A843` | Primary accent, CTA buttons, active state |
| `accent-red` | `#C4453C` | Destructive actions, errors, German flag accent |
| `accent-blue` | `#4A90D9` | Masculine noun gender badge |
| `accent-green` | `#4AD97A` | Success, correct answers, neuter gender badge |
| `accent-purple` | `#9B59B6` | Plural gender badge |
| `warm-*` | 50–950 scale | Background layers and text hierarchy |

Dark backgrounds stack in three layers:
- `bg-primary` (`#0F1117`) — page background
- `bg-secondary` (`#1A1D27`) — cards, panels
- `bg-tertiary` (`#252836`) — input fields, hover states

### Typography

- **Display / headings:** Playfair Display (serif, Google Fonts) — gives editorial personality
- **Body / UI:** DM Sans (sans-serif, Google Fonts) — clean, legible at small sizes
- **Monospace:** system mono — CEFR level badges, keyboard shortcuts

### Component Patterns

- Dark theme only by default; light mode toggled via `.dark` class on `<html>` and `localStorage`
- All interactive elements show `text-accent-gold` on focus/hover
- Tables use `group` + `opacity-0 group-hover:opacity-100` to reveal action buttons on row hover
- Modals use a fixed backdrop with `backdrop-blur-sm` and click-outside-to-close
- Toasts: bottom-right, z-100, max 5 visible, 4-second auto-dismiss
- Loading states use `animate-pulse` skeletons or inline spinners (never full-page overlays)
