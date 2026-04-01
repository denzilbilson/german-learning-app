# Contributing

## Development Setup

Follow the quick-start steps in the main README, then:

```bash
# Watch mode restarts the server on file changes (Node --watch)
npm run dev
```

Frontend hot-reloads via Vite HMR. Backend reloads via `node --watch`. No build step is required during development.

---

## Code Style

### General

- **ES Modules throughout** — use `import`/`export`, never `require`/`module.exports`
- No TypeScript; plain `.js` / `.jsx`
- 2-space indent, single quotes in JS, double quotes in JSX attributes
- No semicolons (frontend); semicolons optional (backend — existing files use none)

### Backend (Express)

- One route file per logical group; mount in `server/index.js`
- All route handlers use `try/catch` and return `{ error: string }` on failure
- Use `store.getAll` / `store.add` / `store.update` / `store.remove` for all markdown data access — never read/write markdown files directly in route handlers
- Claude calls always go through `callClaude()` in `claude-service.js`
- Never expose the API key to any response body or log output

### Frontend (React)

- Functional components with hooks only — no class components (except `ErrorBoundary`)
- Tailwind utility classes for all styling — no inline styles unless driven by dynamic values (e.g. gender badge colours)
- `api.js` is the single entry point for all HTTP calls — do not `fetch()` directly in components
- Page-level data fetching in `useEffect`; pass data down as props

---

## How to Add a New Page

1. **Create the page component** in `client/src/pages/MyPage.jsx`
2. **Add the route** in `client/src/App.jsx`:
   ```jsx
   import MyPage from './pages/MyPage.jsx'
   // ...
   <Route path="/my-page" element={<MyPage />} />
   ```
3. **Add the nav item** in the `navItems` array in `App.jsx`:
   ```js
   { path: '/my-page', icon: '◆', label: 'My Page' }
   ```
4. **Add API methods** to `client/src/services/api.js` if the page needs new endpoints
5. Wrap any async operation in a loading state and surface errors via `useToast()`

---

## How to Add a New Backend Route

1. **Create the route file** in `server/routes/my-feature.js`:
   ```js
   /**
    * my-feature routes
    * GET  /api/my-feature       — description
    * POST /api/my-feature       — description
    */
   import { Router } from 'express'
   const router = Router()

   router.get('/', async (req, res) => {
     try {
       // ...
       res.json(result)
     } catch (e) {
       res.status(500).json({ error: e.message })
     }
   })

   export default router
   ```
2. **Mount it** in `server/index.js`:
   ```js
   import myFeatureRouter from './routes/my-feature.js'
   app.use('/api/my-feature', myFeatureRouter)
   ```
3. **Add an API method** in `client/src/services/api.js`:
   ```js
   getMyFeature: (params) => get(`/api/my-feature?${new URLSearchParams(params)}`),
   ```

---

## How to Add a New Practice Mode

### 1. Add a prompt schema to `generate-practice.js`

Add a new `if (mode === 'my-mode')` branch that returns `{ system, user }`. Define the JSON schema Claude must return, including a `"type": "my-mode"` field on each question object.

### 2. Register the mode in `Practice.jsx`

Add an entry to the mode selector array:
```js
{ id: 'my-mode', label: 'My Mode', description: 'Short description', icon: '◆' }
```

### 3. Add a card renderer in `PracticeCard.jsx`

Add a branch at the top of the `PracticeCard` default export:
```jsx
if (type === 'my-mode') {
  return <MyModeCard question={question} onComplete={onComplete} />
}
```

`onComplete` receives `{ correct: boolean, word: string }`. Call it after the student answers.

### 4. Handle checking

- If the mode can be evaluated client-side (like quiz or article-drill), set `feedback` state directly.
- If it requires Claude, call `api.checkAnswer({ question, userAnswer, correctAnswer, mode })` — the `check-answer.js` prompt will need a new mode branch too.

---

## How Markdown Storage Works

`server/services/markdown-store.js` exposes five async functions:

| Function | Description |
|----------|-------------|
| `getAll(filepath, query?)` | Read all rows; optional `{ level, search, since }` filter |
| `getByIndex(filepath, idx)` | Get single row by 0-based index |
| `add(filepath, entries)` | Append one or more rows |
| `update(filepath, idx, data)` | Merge `data` into the row at `idx` |
| `remove(filepath, idx)` | Splice out the row at `idx` |

Keys in `data` objects must match the column headers exactly (e.g. `"Intended Meaning"`, not `"intendedMeaning"`). The store auto-creates missing files with the correct headers on first access.

---

## Testing

There is currently no automated test suite. Manual verification checklist:

- [ ] `npm run dev` starts without errors and both ports are reachable
- [ ] `GET /api/health` returns `{ status: "ok" }`
- [ ] Text analysis returns results and saves a JSON file to `data/analysis/`
- [ ] Adding vocabulary from analysis deduplicates correctly
- [ ] Practice session generates questions in each mode and logs to `data/progress/`
- [ ] CSV import preview shows correct column mapping; confirm writes rows
- [ ] Anki export downloads a valid TSV file; enriched export includes German definitions
- [ ] Global search (Cmd+K) returns results across all content types
- [ ] Dark/light theme persists across page reload

When adding a new route or component, test the happy path and at least one error case (e.g. missing required field, out-of-range index) manually in the browser and with `curl`.

---

## Data Directory

The `data/` directory is **not committed to git** (add it to `.gitignore` for personal installations). The server auto-creates all required subdirectories on startup:

```
data/
├── vocabulary.md        auto-created if missing
├── phrases.md           auto-created if missing
├── grammar/rules.md     must be seeded manually (sample data in CLAUDE.md)
├── analysis/
├── anki/
├── conjugations/
└── progress/
    ├── log.md           auto-created if missing
    └── sessions/
```
