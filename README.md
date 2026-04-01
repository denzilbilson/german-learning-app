# Deutsch Lernen — German Language Learning App

A local, self-hosted web application for learning German at B1→B2 level. Paste in any German text and Claude AI will extract vocabulary, phrases, and grammar notes, which you can save to a searchable database, practice with interactive drills, and export to Anki. Everything runs on your machine; all data is stored as plain Markdown files.

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|--------------------------------------------------|
| Frontend    | React 18 + React Router v6 + Recharts            |
| Styling     | Tailwind CSS (dark theme, Playfair Display font) |
| Build tool  | Vite 5                                           |
| Backend     | Express.js (Node 18+)                            |
| AI          | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Storage     | Markdown files on disk (`./data/`)               |
| Flashcards  | Anki TSV export                                  |

---

## Quick Start

### Prerequisites

- Node 18 or later
- npm 9+
- An [Anthropic API key](https://console.anthropic.com/)

### 1 — Clone the repository

```bash
git clone <repo-url>
cd german-learning-app
```

### 2 — Install dependencies

```bash
# All at once (root + client + server)
npm run install:all

# Or individually
npm install
npm install --prefix client
npm install --prefix server
```

### 3 — Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and add your API key:

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
```

### 4 — Start development servers

```bash
npm run dev
```

This runs Vite (port **5173**) and Express (port **3001**) concurrently with colour-coded output.

### 5 — Open the app

```
http://localhost:5173
```

---

## Project Structure

```
german-learning-app/
├── client/                        # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalysisReader.jsx    # Tabbed view of Claude analysis results
│   │   │   ├── AnkiExportModal.jsx   # Export-to-Anki dialog
│   │   │   ├── DataTable.jsx         # Sortable, filterable, inline-editable table
│   │   │   ├── ErrorBoundary.jsx     # React error boundary
│   │   │   ├── GenderBadge.jsx       # Coloured der/die/das pill badge
│   │   │   ├── GermanKeyboard.jsx    # On-screen ä/ö/ü/ß input helper
│   │   │   ├── GlobalSearch.jsx      # Cmd+K full-app search modal
│   │   │   ├── PracticeCard.jsx      # Mode-aware practice question card
│   │   │   ├── SpeakButton.jsx       # Web Speech API pronunciation button
│   │   │   └── Toast.jsx             # Toast notification system (context)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx         # Home: stats, charts, recent activity
│   │   │   ├── Grammar.jsx           # Searchable grammar reference
│   │   │   ├── Import.jsx            # 3-step CSV/TSV import wizard
│   │   │   ├── Practice.jsx          # Multi-mode practice sessions
│   │   │   ├── Phrases.jsx           # Phrases CRUD table
│   │   │   ├── SessionHistory.jsx    # Past sessions + weak-words view
│   │   │   ├── TextAnalysis.jsx      # AI text analysis input & results
│   │   │   └── Vocabulary.jsx        # Vocabulary CRUD table
│   │   ├── services/
│   │   │   └── api.js                # Typed fetch wrapper for all API routes
│   │   ├── App.jsx                   # Router, sidebar, theme, Cmd+K
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── server/                        # Express.js backend
│   ├── routes/
│   │   ├── analyze.js       # POST /api/analyze, /analyze/add, GET /api/analysis
│   │   ├── anki.js          # POST /api/anki/export
│   │   ├── dashboard.js     # GET /api/dashboard
│   │   ├── grammar.js       # GET /api/grammar
│   │   ├── import.js        # POST /api/import/csv, /import/confirm
│   │   ├── phrases.js       # CRUD /api/phrases
│   │   ├── practice.js      # POST /api/practice/generate, /practice/check
│   │   ├── progress.js      # GET/POST /api/progress
│   │   ├── search.js        # GET /api/search
│   │   ├── sessions.js      # GET/DELETE /api/sessions
│   │   └── vocabulary.js    # CRUD /api/vocabulary + POST /conjugate
│   ├── services/
│   │   ├── anki-export.js       # TSV generation from vocab/phrase entries
│   │   ├── claude-service.js    # Anthropic SDK wrapper with retry logic
│   │   └── markdown-store.js    # Markdown table ↔ JSON CRUD
│   ├── prompts/
│   │   ├── analyze-text.js      # System prompt for text analysis
│   │   ├── check-answer.js      # System prompt for answer evaluation
│   │   ├── conjugate-verb.js    # System prompt for verb conjugation
│   │   ├── enrich-anki.js       # System prompt for German definitions
│   │   └── generate-practice.js # System prompt for question generation
│   ├── index.js
│   └── package.json
├── data/                          # All user data (Markdown + JSON)
│   ├── vocabulary.md
│   ├── phrases.md
│   ├── grammar/rules.md
│   ├── analysis/            *.json saved AI analyses
│   ├── conjugations/        *.json cached verb conjugations
│   └── progress/
│       ├── log.md
│       └── sessions/        *.json detailed session records
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   └── PROMPTS.md
├── .env.example
├── package.json             # Root: concurrently dev script
└── CLAUDE.md
```

---

## Features

| Feature | Description |
|---------|-------------|
| **AI Text Analysis** | Paste any German text; Claude extracts B1-B2 vocabulary, idioms, and grammar notes with translations |
| **Vocabulary Database** | Full CRUD table with inline editing, level filtering, audio pronunciation, and verb conjugation |
| **Phrase Database** | Same as vocabulary, for idioms and set phrases |
| **Multi-Mode Practice** | Flashcard, Quiz, Fill-in-blank, Case Drill, Translation, Article Drill |
| **Anki Export** | Download Anki-compatible TSV with optional AI-enriched German definitions |
| **CSV/Notion Import** | Upload CSV/TSV, auto-detect columns, preview before committing |
| **Global Search** | Cmd+K search across vocabulary, phrases, grammar, and saved analyses |
| **Session History** | Browse past practice sessions; aggregate weak-word report |
| **Grammar Reference** | Searchable grammar rules from `data/grammar/rules.md` |
| **Dashboard** | Stats, cumulative vocabulary chart, level distribution, recent analyses |
| **Dark/Light Theme** | Persisted in `localStorage`, toggled from the sidebar |

---

## API Reference

All routes are prefixed with `/api`.

### Vocabulary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/vocabulary` | List all entries. Query: `?level=B1`, `?search=`, `?since=YYYY-MM-DD` |
| `POST` | `/vocabulary` | Add one or more entries |
| `PUT` | `/vocabulary/:index` | Update entry at row index |
| `DELETE` | `/vocabulary/:index` | Delete entry at row index |
| `POST` | `/vocabulary/conjugate` | Conjugate a verb via Claude (result cached to disk) |

### Phrases

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/phrases` | List all entries (same query params as vocabulary) |
| `POST` | `/phrases` | Add entries |
| `PUT` | `/phrases/:index` | Update entry |
| `DELETE` | `/phrases/:index` | Delete entry |

### Analysis

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/analyze` | Submit German text for AI analysis; saves JSON to `data/analysis/` |
| `POST` | `/analyze/add` | Add selected items from an analysis to the databases |
| `GET` | `/analysis` | List saved analysis files (metadata only) |
| `GET` | `/analysis/:filename` | Get a specific saved analysis JSON |

### Anki

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/anki/export` | Generate and download Anki TSV. Body: `{ vocabulary[], phrases[], enrich: boolean }` |

### Practice

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/practice/generate` | Generate practice questions. Body: `{ mode, count, level? }` |
| `POST` | `/practice/check` | Evaluate a student answer via Claude |

### Progress & Sessions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/progress` | Get progress log as array of rows |
| `POST` | `/progress` | Log a session result |
| `GET` | `/sessions` | Paginated session list. Query: `?page=1&limit=20` |
| `GET` | `/sessions/weak-words` | Aggregate words with errors across all sessions |
| `GET` | `/sessions/:id` | Full session detail including every question |
| `DELETE` | `/sessions/:id` | Delete a session |

### Other

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dashboard` | Aggregated stats (vocab count, charts data, recent analyses) |
| `GET` | `/grammar` | Grammar rules parsed from `data/grammar/rules.md` |
| `POST` | `/import/csv` | Upload and preview CSV/TSV; returns column mapping |
| `POST` | `/import/confirm` | Commit imported rows to vocabulary or phrases |
| `GET` | `/search` | Search all content. Query: `?q=&type=all\|vocabulary\|phrases\|grammar\|analysis` |
| `GET` | `/health` | Health check: `{ status: "ok", timestamp }` |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | — | Your Anthropic API key |
| `PORT` | No | `3001` | Port the Express server listens on |

---

## How the Markdown Data Layer Works

All user data is stored as Markdown pipe tables in the `data/` directory. The `server/services/markdown-store.js` module handles all reads and writes.

**File format:**
```markdown
| Word | Literal Meaning | Intended Meaning | Part of Speech | Case Examples | Level | Source | Date Added |
|------|-----------------|------------------|----------------|---------------|-------|--------|------------|
| die Vorstellung | the imagining | idea, concept | Noun (f.) | Ich habe keine Vorstellung. | B1 | Podcast | 2026-03-15 |
```

- Pipe characters (`|`) inside cell values are escaped as `\|`
- Missing files are auto-created with correct headers on first access
- Row index (0-based) is used for `PUT` and `DELETE` operations
- The `data/` directory and all subdirectories are created automatically at server startup

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in watch mode |
| `npm run build` | Build the frontend for production (`client/dist/`) |
| `npm run install:all` | Install all dependencies (root + client + server) |

---

## Troubleshooting

**AI features return "API key not configured"**
Ensure `ANTHROPIC_API_KEY` is set in `.env` and the server was restarted after editing.

**`npm run dev` — port already in use**
Kill the existing process: `lsof -ti:3001 | xargs kill` (or 5173 for the frontend).

**"No vocabulary found" when generating practice**
Add words first via Text Analysis or the Vocabulary page's manual-add button.

**CSV import shows no column matches**
Ensure your CSV has recognisable headers (e.g. "Word", "German", "Wort", "Meaning", "Translation"). See `server/routes/import.js` for the full alias table.

**Anki cards show raw HTML**
In Anki's import dialog, select a note type that has HTML enabled, or use the "Basic (and reversed card)" type which supports it by default.

**Speech button does nothing**
The browser has no `de-DE` voice installed. Install a German system voice or use a Chromium-based browser with built-in TTS voices.

---

## License

MIT
