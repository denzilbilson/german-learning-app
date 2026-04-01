#!/bin/bash
set -e
 
# ============================================
# German Learning App — Autonomous Build Script
# ============================================
# This script runs Claude Code through each build phase,
# commits and pushes to GitHub after each phase.
#
# Usage: ./build-overnight.sh
# To resume from a specific phase: ./build-overnight.sh 3
# ============================================
 
# Configuration
MAX_BUDGET_PER_PHASE=20    # USD per phase (safety limit)
MODEL="sonnet"             # claude model to use (sonnet is best cost/quality for code)
REPO_DIR="$(pwd)"
LOG_FILE="build-log-$(date +%Y%m%d-%H%M%S).txt"
 
# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
 
log() {
    echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1" | tee -a "$LOG_FILE"
}
 
error() {
    echo -e "${RED}[$(date +%H:%M:%S)] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}
 
warn() {
    echo -e "${YELLOW}[$(date +%H:%M:%S)] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}
 
# Check prerequisites
check_prereqs() {
    log "Checking prerequisites..."
 
    if ! command -v claude &> /dev/null; then
        error "Claude Code CLI not found. Run: npm install -g @anthropic-ai/claude-code"
        exit 1
    fi
 
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        error "ANTHROPIC_API_KEY not set. See setup guide Step 3."
        exit 1
    fi
 
    if ! command -v git &> /dev/null; then
        error "Git not found."
        exit 1
    fi
 
    if ! git remote -v | grep -q "origin"; then
        error "No git remote 'origin' configured. See setup guide Step 4."
        exit 1
    fi
 
    log "All prerequisites met."
}
 
# Commit and push a phase
commit_phase() {
    local phase_num=$1
    local phase_name=$2
 
    log "Committing Phase $phase_num: $phase_name"
 
    cd "$REPO_DIR"
    git add -A
    git commit -m "Phase $phase_num: $phase_name [autonomous build]" || {
        warn "Nothing to commit for Phase $phase_num"
        return 0
    }
    git push origin main || {
        error "Push failed for Phase $phase_num. Continuing anyway."
    }
 
    log "Phase $phase_num committed and pushed."
}
 
# Run a single phase
run_phase() {
    local phase_num=$1
    local phase_name=$2
    local prompt=$3
 
    log "============================================"
    log "STARTING PHASE $phase_num: $phase_name"
    log "Budget limit: \$$MAX_BUDGET_PER_PHASE"
    log "============================================"
 
    cd "$REPO_DIR"
 
    # Run Claude Code in headless mode with auto-accept
    claude -p "$prompt" \
        --dangerously-skip-permissions \
        --model "$MODEL" \
        --max-budget-usd "$MAX_BUDGET_PER_PHASE" \
        2>&1 | tee -a "$LOG_FILE"
 
    local exit_code=${PIPESTATUS[0]}
 
    if [ $exit_code -ne 0 ]; then
        warn "Phase $phase_num exited with code $exit_code. Committing progress and continuing."
    fi
 
    commit_phase "$phase_num" "$phase_name"
 
    log "Phase $phase_num complete."
    echo "" >> "$LOG_FILE"
}
 
# ============================================
# PHASE DEFINITIONS
# ============================================
 
phase_1() {
    run_phase 1 "Scaffolding" "
Read CLAUDE.md carefully. Execute Phase 1: Scaffolding.
 
Create the full project structure:
1. Initialize client/ with Vite + React + Tailwind CSS. Use 'npm create vite@latest client -- --template react'. Install tailwindcss and configure it.
2. Initialize server/ with Express. Create package.json, install express, cors, dotenv, @anthropic-ai/sdk.
3. Create root package.json with a 'dev' script using concurrently to start both client and server.
4. Create .env.example with ANTHROPIC_API_KEY=your-key-here and PORT=3001.
5. Create data/ directory with properly formatted empty markdown table files (vocabulary.md, phrases.md) with headers, and empty subdirectories (analysis/, anki/, grammar/, progress/).
6. Set up Vite proxy in vite.config.js to forward /api/* to localhost:3001.
7. Set up basic Express server in server/index.js with CORS and a health check route GET /api/health.
8. Create a basic App.jsx with React Router and placeholder pages.
9. Add some sample data (5-10 vocabulary entries, 5 phrases) to the markdown files so the UI won't be empty.
10. Verify everything by describing what running 'npm run dev' from root would do.
 
Use ES modules everywhere. Make sure all package.json files have type: module.
Do NOT actually run the dev servers — just create all files.
"
}
 
phase_2() {
    run_phase 2 "Data Layer + Database UI" "
Read CLAUDE.md carefully. Execute Phase 2: Data Layer + Database UI.
 
Build on the existing project structure from Phase 1.
 
1. Build server/services/markdown-store.js — a utility that:
   - Reads a markdown file and parses the table into an array of JSON objects
   - Writes an array of JSON objects back as a formatted markdown table
   - Handles the specific schemas for vocabulary.md and phrases.md
   - Supports CRUD operations (get all, get by index, add, update, delete)
   - Handles the <br> separators in case examples correctly
 
2. Build server/routes/vocabulary.js and server/routes/phrases.js with all CRUD endpoints as specified in CLAUDE.md.
 
3. Build client/src/services/api.js — a fetch wrapper with methods for every API endpoint.
 
4. Build client/src/components/DataTable.jsx — a reusable, beautifully styled table component with:
   - Search bar (filters across all columns as you type)
   - Column sorting (click header to sort asc/desc)
   - Level filter (clickable A1-C2 pills)
   - Inline editing (click a cell to edit, save on blur/enter)
   - Delete button per row (with confirmation)
   - Expandable rows (for case examples in vocabulary)
   - Part of speech shown as colored badges
 
5. Build client/src/pages/Vocabulary.jsx and client/src/pages/Phrases.jsx using DataTable.
 
6. Build an 'Add Entry' modal/form for manually adding new vocabulary and phrases.
 
7. Style everything with Tailwind CSS following the dark theme design direction in CLAUDE.md. Use warm dark backgrounds (slate-900/zinc-900), not pure black. Import a distinctive Google Font for headings.
 
Make sure the API routes are registered in server/index.js.
Test data should already exist from Phase 1.
"
}
 
phase_3() {
    run_phase 3 "Text Analysis Pipeline" "
Read CLAUDE.md carefully. Execute Phase 3: Text Analysis.
 
Build on the existing project from Phases 1-2.
 
1. Build server/services/claude-service.js:
   - Wrapper around the @anthropic-ai/sdk package
   - Reads ANTHROPIC_API_KEY from process.env
   - Uses claude-sonnet-4-20250514 model
   - Has a method that takes a system prompt + user message and returns parsed JSON
   - Retries up to 2 times on malformed JSON responses
   - Handles errors gracefully
 
2. Build server/prompts/analyze-text.js:
   - System prompt that instructs Claude to analyze German text
   - Requests structured JSON output with: translations (line by line), vocabulary (word, literal meaning, intended meaning, part of speech, case examples, level), phrases (phrase, english meaning, level), grammar rules (topic, explanation at B1-B2 level)
   - Calibrated for a B1→B2 learner
 
3. Build server/routes/analyze.js:
   - POST /api/analyze — takes German text, calls Claude, returns structured analysis
   - POST /api/analyze/add — takes analysis results + checks for duplicates against existing vocabulary/phrases, then adds new entries to the markdown files
   - GET /api/analysis — lists saved analysis files
   - GET /api/analysis/:filename — returns a specific saved analysis
 
4. Build client/src/pages/TextAnalysis.jsx:
   - State 1: Large textarea for input, optional source field, 'Analyze' button
   - State 2: Rich analysis display with AnalysisReader component
   - Show line-by-line translations (German left, English right)
   - Vocabulary table with checkboxes
   - Phrases section with checkboxes
   - Collapsible grammar rule sections with clear explanations
   - B1→B2 level callouts visually highlighted
   - Action buttons: 'Add All to Databases', 'Add Selected', 'Export to Anki'
 
5. Build client/src/components/AnalysisReader.jsx for the rich display.
 
6. Style everything beautifully — this is the core feature, it should feel premium.
   The analysis results should read like a well-typeset article, not a data dump.
 
Register new routes in server/index.js.
"
}
 
phase_4() {
    run_phase 4 "Anki Export" "
Read CLAUDE.md carefully. Execute Phase 4: Anki Export.
 
Build on the existing project from Phases 1-3.
 
1. Build server/services/anki-export.js:
   - Takes an array of vocabulary entries and/or phrase entries
   - Generates TSV format compatible with Anki import
   - Vocabulary cards: Front = German word, Back = literal meaning + intended meaning + part of speech (bold) + case examples. Use HTML <br> for line breaks.
   - Phrase cards: Front = German phrase, Back = English meaning + source
   - Adds CEFR level as Anki tags (e.g., B1::vocabulary, B2::phrases)
 
2. Build server/prompts/enrich-anki.js:
   - Prompt template that asks Claude to generate a simple German-language definition for each word (monolingual, suited to B1-B2 level)
   - This enriches the card back with a German explanation
 
3. Build server/routes/anki.js:
   - POST /api/anki/export — accepts { entries: [...], type: 'vocabulary'|'phrases'|'both', enrich: boolean }
   - If enrich is true, calls Claude to add German definitions
   - Returns the TSV as a downloadable file (Content-Disposition: attachment)
 
4. Add Anki export UI to:
   - Vocabulary page: 'Export to Anki' button (exports selected or all, with level/date filters)
   - Phrases page: same
   - TextAnalysis results page: 'Export to Anki' button for just-analyzed items
 
5. Frontend should trigger a file download when export completes (create a blob URL and click a hidden anchor tag).
 
6. Style the export UI — a modal or panel where user can select options before exporting.
 
Register new routes in server/index.js.
"
}
 
phase_5() {
    run_phase 5 "Practice Modes" "
Read CLAUDE.md carefully. Execute Phase 5: Practice Modes.
 
Build on the existing project from Phases 1-4.
 
1. Build server/prompts/generate-practice.js:
   - Prompt templates for each practice mode:
     a. Quiz: Generate 10 multiple-choice questions (German→English or English→German). Use the user's own vocabulary for both correct answers and distractors.
     b. Fill-in-the-blank: Generate sentences with a blank for a target word. Include the correct answer.
     c. Case drill: Generate sentence frames requiring correct case/declension. Include explanation of the rule.
     d. Translation: Generate English sentences using known vocabulary for the user to translate.
 
2. Build server/prompts/check-answer.js:
   - Prompt that evaluates user's answer against the correct answer
   - Returns: correct (boolean), explanation, model answer (if wrong)
 
3. Build server/routes/practice.js:
   - POST /api/practice/generate — takes { mode, count, level?, wordIds? }, reads vocabulary from markdown, calls Claude, returns question set
   - POST /api/practice/check — takes { question, userAnswer, correctAnswer, mode }, calls Claude, returns feedback
 
4. Build client/src/pages/Practice.jsx:
   - Mode selector at top (5 large clickable cards/buttons, one per mode)
   - After selecting mode, shows a focused single-question-at-a-time interface
   - PracticeCard component for each question
   - Large German text display
   - Input field or multiple choice buttons depending on mode
   - Immediate feedback: green flash for correct, red with explanation for incorrect
   - Progress bar showing question X of Y
   - Session summary at end: score, time, list of weak words
 
5. Build client/src/components/PracticeCard.jsx
 
6. Build POST /api/progress endpoint and wire it to log session results to data/progress/log.md after each practice session.
 
Style the practice interface to feel focused and immersive — centered layout, large type, generous spacing. This should feel calm, not stressful.
 
Register new routes in server/index.js.
"
}
 
phase_6() {
    run_phase 6 "Dashboard + Polish" "
Read CLAUDE.md carefully. Execute Phase 6: Dashboard + Polish.
 
Build on the existing project from Phases 1-5. This is the final phase — make everything production-quality.
 
1. Build server/routes/dashboard.js:
   - GET /api/dashboard — aggregates stats from markdown files:
     - Total vocabulary count, total phrases count
     - Words added this week, this month
     - Recent analyses (last 5)
     - Practice session stats (from progress log)
     - Level distribution (count per CEFR level)
 
2. Build client/src/pages/Dashboard.jsx:
   - StatCard components showing key metrics with subtle icons
   - Line chart showing words added over time (use recharts library — install it)
   - Level distribution bar/pie chart
   - Recent activity feed
   - Quick action buttons: 'Analyze New Text', 'Practice', 'Export to Anki'
   - Study recommendations panel (can be static suggestions for now)
 
3. Build client/src/components/Sidebar.jsx:
   - Persistent left sidebar with navigation
   - Icons + labels for each page (Dashboard, Analyze, Vocabulary, Phrases, Practice, Grammar)
   - Active page highlighted
   - Collapsible on mobile (hamburger menu)
   - German flag colors as subtle accent on the active item
 
4. Build client/src/pages/Grammar.jsx:
   - Reads grammar rules from data/grammar/rules.md
   - Displays as browsable, searchable cards organized by topic
   - Each card shows topic, explanation, examples
 
5. Polish everything:
   - Dark/light mode toggle (store preference in localStorage)
   - Smooth page transitions (use CSS transitions or framer-motion)
   - Loading states for all API calls (skeleton loaders or spinners)
   - Toast notifications for: items added, export complete, errors (use a simple toast component)
   - Error boundaries and friendly error states
   - Responsive design: sidebar collapses to bottom nav on mobile
   - Empty states for pages with no data
   - Consistent spacing, typography, and color usage throughout
   - Make sure all pages use the same dark warm theme
 
6. Final checks:
   - All imports resolve correctly
   - All routes are registered
   - .env.example is up to date
   - Root npm run dev works (starts both servers)
   - README.md with setup instructions
 
This is the polish phase. Every page should look intentional and beautiful.
"
}
 
# ============================================
# MAIN EXECUTION
# ============================================
 
check_prereqs
 
# Allow resuming from a specific phase
START_PHASE=${1:-1}
 
log "============================================"
log "AUTONOMOUS BUILD STARTING"
log "Starting from Phase: $START_PHASE"
log "Log file: $LOG_FILE"
log "============================================"
echo ""
 
if [ "$START_PHASE" -le 1 ]; then phase_1; fi
if [ "$START_PHASE" -le 2 ]; then phase_2; fi
if [ "$START_PHASE" -le 3 ]; then phase_3; fi
if [ "$START_PHASE" -le 4 ]; then phase_4; fi
if [ "$START_PHASE" -le 5 ]; then phase_5; fi
if [ "$START_PHASE" -le 6 ]; then phase_6; fi
 
log "============================================"
log "ALL PHASES COMPLETE"
log "Check your GitHub repo for the results."
log "Full log: $LOG_FILE"
log "============================================"
