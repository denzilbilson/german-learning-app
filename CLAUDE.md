# German Language Learning App — Build Instructions
 
## Project Overview
Build a local, self-hosted German language learning web application with a React + Vite frontend and Express.js backend. All data is stored as Markdown files. AI features are powered by the Claude API.
 
## Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS + React Router
- **Backend:** Express.js (Node)
- **Data storage:** Markdown tables on disk (in ./data/ directory)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)
- **Flashcards:** Anki TSV export
 
## Architecture
- Frontend runs on localhost:5173 (Vite dev server)
- Backend runs on localhost:3001 (Express)
- Frontend calls backend REST API endpoints
- Backend reads/writes Markdown files and proxies Claude API calls
- API key is in .env (never exposed to frontend)
 
## Project Structure
```
german-learning-app/
├── client/                        # React + Vite frontend
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   │   ├── Sidebar.jsx
│   │   │   ├── DataTable.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── AnalysisReader.jsx
│   │   │   └── PracticeCard.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── TextAnalysis.jsx
│   │   │   ├── Vocabulary.jsx
│   │   │   ├── Phrases.jsx
│   │   │   ├── Practice.jsx
│   │   │   └── Grammar.jsx
│   │   ├── services/
│   │   │   └── api.js             # Fetch wrapper for backend routes
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── server/                        # Express.js backend
│   ├── routes/
│   │   ├── vocabulary.js
│   │   ├── phrases.js
│   │   ├── analyze.js
│   │   ├── anki.js
│   │   ├── practice.js
│   │   ├── progress.js
│   │   └── dashboard.js
│   ├── services/
│   │   ├── markdown-store.js      # Markdown table ↔ JSON parser
│   │   ├── claude-service.js      # Anthropic API wrapper
│   │   └── anki-export.js         # TSV generation
│   ├── prompts/
│   │   ├── analyze-text.js
│   │   ├── generate-practice.js
│   │   ├── check-answer.js
│   │   └── enrich-anki.js
│   ├── index.js
│   └── package.json
├── data/                          # Markdown data files
│   ├── vocabulary.md
│   ├── phrases.md
│   ├── analysis/
│   ├── anki/
│   ├── grammar/
│   │   └── rules.md
│   └── progress/
│       └── log.md
├── .env.example
├── package.json                   # Root package with concurrently dev script
└── CLAUDE.md
```
 
## Database Schemas
 
### Vocabulary (data/vocabulary.md)
Markdown table with columns:
| Word | Literal Meaning | Intended Meaning | Part of Speech | Case Examples | Level | Source | Date Added |
 
Case Examples uses `<br>` separators for Anki compatibility.
 
### Phrases (data/phrases.md)
Markdown table with columns:
| Phrase | English Meaning | Level | Source | Date Added |
 
## Backend API Routes
| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/vocabulary | List all vocabulary (supports ?level=, ?search=, ?since= query params) |
| POST | /api/vocabulary | Add one or more vocabulary entries |
| PUT | /api/vocabulary/:index | Update a vocabulary entry by row index |
| DELETE | /api/vocabulary/:index | Delete a vocabulary entry |
| GET | /api/phrases | List all phrases (same query params) |
| POST | /api/phrases | Add one or more phrase entries |
| PUT | /api/phrases/:index | Update a phrase entry |
| DELETE | /api/phrases/:index | Delete a phrase entry |
| POST | /api/analyze | Submit German text for AI analysis |
| POST | /api/analyze/add | Commit analysis results to databases |
| GET | /api/analysis | List saved analyses |
| GET | /api/analysis/:filename | Get a specific analysis |
| POST | /api/anki/export | Generate and download Anki TSV |
| POST | /api/practice/generate | Generate a practice session |
| POST | /api/practice/check | Check a practice answer |
| GET | /api/progress | Get progress data |
| POST | /api/progress | Log a session result |
| GET | /api/dashboard | Aggregated stats for the home page |
 
## Frontend Pages
 
### Dashboard (Home /)
- Stats bar: total vocab count, total phrases, days active
- Recent activity: last 5 analyses, words added this week
- Progress chart: words added over time (use recharts)
- Quick action buttons: "Analyze New Text" and "Practice"
- Study recommendations panel
 
### Text Analysis (/analyze)
- Large textarea for pasting German text
- Optional source field
- "Analyze" button → loading state → results
- Results show: line-by-line translation, vocabulary table, phrases, grammar breakdown
- Actions: "Add All to Databases", "Select & Add", "Export to Anki"
 
### Vocabulary (/vocabulary)
- Sortable, filterable, searchable table
- Level filter (A1-C2 pills)
- Inline editing (click to edit)
- Expandable rows for case examples
- Manual add button (opens modal/form)
- Delete with confirmation
- Bulk Anki export
 
### Phrases (/phrases)
- Same as vocabulary but simpler (fewer columns)
 
### Practice (/practice)
- Mode selector: Flashcard, Quiz, Fill-in-blank, Case Drill, Translation
- Single question at a time, centered layout
- Immediate feedback with color-coded results
- Session summary at end with score
 
### Grammar (/grammar)
- Browsable, searchable grammar notes
- Organized by topic (Cases, Verbs, Word Order, etc.)
 
## UI Design Requirements
- **Dark theme by default** with warm tones (not cold gray)
- **Premium editorial feel** — not gamified, not a developer dashboard
- Distinctive display font for headings (not Inter/Roboto/Arial — use something with personality, import from Google Fonts)
- German flag colors (black/red/gold) as subtle accents only
- Generous whitespace, content should breathe
- Smooth page transitions and loading states
- Sidebar navigation with icons
- Toast notifications for confirmations
- Responsive (works on mobile too)
- Use Tailwind CSS for all styling
 
## Claude API Integration
- All API calls go through the Express backend (never from frontend)
- API key stored in .env as ANTHROPIC_API_KEY
- Use claude-sonnet-4-20250514 model for all calls
- Request structured JSON responses from Claude
- Validate and parse responses before sending to frontend
- Retry on malformed responses (up to 2 retries)
 
## Anki Export Format
TSV with HTML formatting:
```
Front\tBack\tTags
Vorstellung\tLiteral: presentation<br>Meaning: idea, concept<br><b>die Nomen (f.)</b><br>Example sentences...\tB1::vocabulary
```
 
## Build Phases (FOLLOW THIS ORDER)
 
### Phase 1: Scaffolding
- Initialize client/ with Vite + React + Tailwind
- Initialize server/ with Express
- Set up root package.json with concurrently for `npm run dev`
- Create data/ directory with empty but properly formatted markdown files
- Set up vite proxy to backend
- Verify both servers start and frontend can reach backend
 
### Phase 2: Data Layer + Database UI
- Build markdown-store.js (parse markdown tables to JSON and back)
- Build vocabulary and phrases CRUD routes
- Build Vocabulary and Phrases pages with DataTable component
- Search, sort, filter, inline edit, add, delete all working
- Style the tables beautifully with Tailwind
 
### Phase 3: Text Analysis
- Build claude-service.js with Anthropic SDK
- Build analyze-text.js prompt template
- Build POST /api/analyze route
- Build TextAnalysis page (input state → results state)
- Build AnalysisReader component for rich display
- "Add to Database" flow with duplicate detection
 
### Phase 4: Anki Export
- Build anki-export.js service
- Build POST /api/anki/export route
- Add export UI to Vocabulary, Phrases, and Analysis pages
- Trigger file download in browser
 
### Phase 5: Practice Modes
- Build generate-practice.js and check-answer.js prompt templates
- Build practice API routes
- Build Practice page with mode selector
- Implement all 5 modes: flashcard, quiz, fill-blank, case drill, translation
- Session scoring and results
 
### Phase 6: Dashboard + Polish
- Build dashboard API route (aggregate stats from markdown files)
- Build Dashboard page with stat cards and charts
- Build progress logging
- Build Sidebar, navigation, page transitions
- Dark/light mode toggle
- Toast notifications
- Grammar page
- Responsive design pass
- Error handling everywhere
 
## Important Notes
- ALWAYS use ES modules (import/export), not CommonJS (require)
- Frontend uses Vite proxy for API calls in development
- The .env file should never be committed to git
- Include sample data in the markdown files so the UI isn't empty
- After completing each phase, verify the app runs without errors
- Use the @anthropic-ai/sdk npm package for Claude API calls in the backend
