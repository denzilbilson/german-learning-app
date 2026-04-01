# Deutsch Lernen

A local, self-hosted German language learning app with AI-powered text analysis, vocabulary management, flashcard export, and practice modes.

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + React Router + Recharts
- **Backend:** Express.js (Node)
- **Storage:** Markdown files on disk (`./data/`)
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Flashcards:** Anki TSV export

## Setup

### 1. Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
```

### 4. Start the app

```bash
npm run dev
```

This starts both servers concurrently:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Features

| Feature | Description |
|---------|-------------|
| **Text Analysis** | Paste German text → Claude extracts vocabulary, phrases, and grammar notes |
| **Vocabulary** | Full CRUD table with levels (A1–C2), case examples, inline editing |
| **Phrases** | Saved expressions with English translations and level tags |
| **Practice** | 5 modes: Flashcard, Quiz, Fill-in-blank, Case Drill, Translation |
| **Anki Export** | TSV export with optional AI-enriched definitions |
| **Grammar** | Browsable reference cards organized by CEFR level |
| **Dashboard** | Stats, progress charts, and level distribution |

## Data

All data lives in `./data/` as Markdown tables — no database required.

```
data/
├── vocabulary.md        # Saved vocabulary
├── phrases.md           # Saved phrases
├── grammar/rules.md     # Grammar reference notes
├── analysis/            # JSON files from text analyses
├── anki/                # TSV export files
└── progress/log.md      # Practice session log
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in watch mode |
| `npm run build` | Build the frontend for production |
| `npm run install:all` | Install all dependencies (root + client + server) |

## Project Structure

```
german-learning-app/
├── client/          # React + Vite frontend
│   └── src/
│       ├── pages/   # Dashboard, Analyze, Vocabulary, Phrases, Practice, Grammar
│       ├── components/
│       └── services/api.js
├── server/          # Express backend
│   ├── routes/      # One file per API route group
│   ├── services/    # markdown-store, claude-service, anki-export
│   └── prompts/     # Claude prompt templates
├── data/            # Markdown data files
├── .env.example
└── CLAUDE.md        # Build instructions
```
