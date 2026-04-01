import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'
import { useToast } from '../components/Toast.jsx'

// ── Helpers ───────────────────────────────────────────────────────

const MODES = ['flashcard', 'quiz', 'fill-blank', 'case-drill', 'translation', 'article-drill']
const MODE_ICONS = {
  flashcard:      '⧉',
  quiz:           '⊕',
  'fill-blank':   '⊘',
  'case-drill':   '⊛',
  translation:    '⇄',
  'article-drill':'⟁',
}

function scoreColor(pct) {
  if (pct >= 80) return 'text-accent-green'
  if (pct >= 60) return 'text-accent-gold'
  return 'text-accent-red'
}

function scoreBg(pct) {
  if (pct >= 80) return 'bg-accent-green/10 border-accent-green/30'
  if (pct >= 60) return 'bg-accent-gold/10 border-accent-gold/30'
  return 'bg-accent-red/10 border-accent-red/30'
}

function relativeDate(iso) {
  if (!iso) return '—'
  const d   = new Date(iso)
  const now = new Date()
  const ms  = now - d
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  const hr  = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (day === 0 && hr === 0 && min < 2) return 'just now'
  if (day === 0 && hr === 0) return `${min}m ago`
  if (day === 0) return `${hr}h ago`
  if (day === 1) return 'yesterday'
  if (day < 7)  return `${day}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDuration(ms) {
  if (!ms) return null
  const sec = Math.round(ms / 1000)
  const m   = Math.floor(sec / 60)
  const s   = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function inDateRange(datetime, range) {
  if (range === 'all') return true
  const d   = new Date(datetime)
  const now = new Date()
  if (range === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - 7)
    return d >= start
  }
  if (range === 'month') {
    const start = new Date(now)
    start.setMonth(now.getMonth() - 1)
    return d >= start
  }
  return true
}

// ── Mode badge ────────────────────────────────────────────────────

function ModeBadge({ mode }) {
  const icon  = MODE_ICONS[mode?.toLowerCase()] || '◎'
  const label = mode || '—'
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-tertiary border border-warm-700 rounded-lg text-xs font-sans text-secondary">
      <span>{icon}</span> {label}
    </span>
  )
}

// ── Session card (collapsed + expanded) ───────────────────────────

function SessionCard({ session, onDelete }) {
  const [expanded,    setExpanded]    = useState(false)
  const [detail,      setDetail]      = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const pct = session.totalQuestions > 0
    ? Math.round((session.score / session.totalQuestions) * 100)
    : 0

  async function toggleExpand() {
    if (!expanded && !detail) {
      setLoadingDetail(true)
      try {
        const data = await api.getSession(session.id)
        setDetail(data)
      } catch {
        toast.error('Failed to load session detail')
      } finally {
        setLoadingDetail(false)
      }
    }
    setExpanded(e => !e)
  }

  async function handleDelete(e) {
    e.stopPropagation()
    if (!confirm('Delete this session?')) return
    try {
      await api.deleteSession(session.id)
      onDelete(session.id)
      toast.success('Session deleted')
    } catch {
      toast.error('Failed to delete session')
    }
  }

  return (
    <div className="bg-secondary border border-warm-800 rounded-xl overflow-hidden">
      {/* Summary row */}
      <button
        onClick={toggleExpand}
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-tertiary/50 transition-colors"
      >
        {/* Score badge */}
        <div className={`shrink-0 w-14 h-14 rounded-xl border flex flex-col items-center justify-center ${scoreBg(pct)}`}>
          <span className={`font-display text-xl font-bold leading-none ${scoreColor(pct)}`}>{pct}</span>
          <span className="text-xs text-warm-600 font-sans">%</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <ModeBadge mode={session.mode} />
            {session.durationMs && (
              <span className="text-xs text-warm-600 font-sans">{formatDuration(session.durationMs)}</span>
            )}
          </div>
          <p className="text-xs text-secondary font-sans">
            {session.score}/{session.totalQuestions} correct
            {session.weakWords?.length > 0 && (
              <span className="ml-2 text-accent-red/80">
                · {session.weakWords.length} weak
              </span>
            )}
          </p>
        </div>

        {/* Date + actions */}
        <div className="shrink-0 text-right">
          <p className="text-xs text-secondary font-sans mb-1">{relativeDate(session.datetime)}</p>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs text-warm-700 font-sans">
              {expanded ? '▲' : '▼'}
            </span>
            <button
              onClick={handleDelete}
              className="text-xs text-warm-700 hover:text-accent-red transition-colors px-1"
              title="Delete session"
            >
              ✕
            </button>
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-warm-800 px-5 py-4 space-y-3">
          {loadingDetail && (
            <div className="flex items-center gap-2 text-secondary text-sm font-sans py-2">
              <div className="w-4 h-4 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
              Loading detail…
            </div>
          )}

          {detail && (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 mb-2">
                <ModeBadge mode={detail.mode} />
                <span className="text-xs text-warm-600 font-sans">
                  {new Date(detail.datetime).toLocaleString()}
                </span>
                <span className={`ml-auto font-display text-2xl font-bold ${scoreColor(pct)}`}>
                  {pct}<span className="text-sm text-secondary font-normal font-sans">%</span>
                </span>
              </div>

              {/* Questions */}
              {detail.questions?.length > 0 ? (
                <div className="space-y-2">
                  {detail.questions.map((q, i) => (
                    <QuestionRow key={i} q={q} idx={i} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-secondary font-sans italic">No question detail recorded.</p>
              )}

              {/* Weak words footer */}
              {detail.weakWords?.length > 0 && (
                <div className="pt-3 border-t border-warm-800">
                  <p className="text-xs text-secondary font-sans mb-2 uppercase tracking-wider">Words to review</p>
                  <div className="flex flex-wrap gap-2">
                    {detail.weakWords.map((w, i) => (
                      <Link
                        key={i}
                        to={`/vocabulary?highlight=${encodeURIComponent(w)}`}
                        className="px-2.5 py-1 bg-accent-red/10 border border-accent-red/30 text-accent-red rounded-lg text-xs font-sans hover:bg-accent-red/20 transition-colors"
                      >
                        {w}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function QuestionRow({ q, idx }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-sans ${
      q.correct
        ? 'bg-accent-green/5 border-accent-green/20'
        : 'bg-accent-red/5 border-accent-red/20'
    }`}>
      <div className="flex items-start gap-3">
        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
          q.correct ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-red/20 text-accent-red'
        }`}>
          {q.correct ? '✓' : '✗'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-primary">{q.question || `Question ${idx + 1}`}</p>
          {q.userAnswer && (
            <p className={`text-xs mt-1 ${q.correct ? 'text-accent-green' : 'text-accent-red'}`}>
              Your answer: <span className="font-medium">{q.userAnswer}</span>
            </p>
          )}
          {!q.correct && q.correctAnswer && (
            <p className="text-xs mt-0.5 text-secondary">
              Correct: <span className="font-medium text-primary">{q.correctAnswer}</span>
            </p>
          )}
          {q.timeMs > 0 && (
            <p className="text-xs mt-0.5 text-warm-700">{(q.timeMs / 1000).toFixed(1)}s</p>
          )}
          {q.explanation && (
            <button
              onClick={() => setOpen(o => !o)}
              className="text-xs text-accent-gold mt-1 hover:underline"
            >
              {open ? 'Hide explanation' : 'Show explanation'}
            </button>
          )}
          {open && q.explanation && (
            <p className="text-xs text-secondary mt-1 italic">{q.explanation}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Weak Words tab ────────────────────────────────────────────────

function WeakWordsTab() {
  const [words,    setWords]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [sortKey,  setSortKey]  = useState('timesWrong')
  const [sortDir,  setSortDir]  = useState('desc')
  const navigate = useNavigate()

  useEffect(() => {
    api.getWeakWords()
      .then(setWords)
      .catch(() => setWords([]))
      .finally(() => setLoading(false))
  }, [])

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...words].sort((a, b) => {
    const av = a[sortKey] ?? 0
    const bv = b[sortKey] ?? 0
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
    return sortDir === 'desc' ? -cmp : cmp
  })

  function SortHeader({ label, field }) {
    const active = sortKey === field
    return (
      <button
        onClick={() => toggleSort(field)}
        className={`flex items-center gap-1 hover:text-primary transition-colors ${active ? 'text-primary' : 'text-secondary'}`}
      >
        {label}
        <span className="text-warm-700">{active ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!words.length) {
    return (
      <div className="py-16 text-center text-secondary font-sans text-sm">
        <p className="text-4xl mb-4">🎯</p>
        <p>No weak words yet — complete some practice sessions first.</p>
        <Link to="/practice" className="mt-4 inline-block text-accent-gold hover:underline text-sm">
          Start practicing →
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h2 className="font-display text-xl font-semibold text-primary">Weak Words</h2>
        <span className="text-xs text-secondary font-sans">{words.length} words</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => navigate('/practice')}
            className="px-4 py-2 bg-accent-gold text-primary font-semibold rounded-xl text-xs font-sans hover:brightness-110"
          >
            Practice Weak Words
          </button>
        </div>
      </div>

      <div className="bg-secondary border border-warm-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-6 gap-2 px-4 py-2.5 border-b border-warm-800 text-xs font-sans text-secondary uppercase tracking-wide">
          <div className="col-span-2"><SortHeader label="Word" field="word" /></div>
          <div><SortHeader label="Seen" field="timesSeen" /></div>
          <div><SortHeader label="Wrong" field="timesWrong" /></div>
          <div><SortHeader label="Error %" field="errorRate" /></div>
          <div><SortHeader label="Last Missed" field="lastMissedDate" /></div>
        </div>

        {sorted.map((w, i) => (
          <div
            key={w.word}
            className={`grid grid-cols-6 gap-2 px-4 py-3 text-sm font-sans items-center ${
              i % 2 === 0 ? '' : 'bg-tertiary/30'
            } border-b border-warm-800/50 last:border-0`}
          >
            <div className="col-span-2">
              <Link
                to={`/vocabulary?highlight=${encodeURIComponent(w.word)}`}
                className="text-primary font-medium hover:text-accent-gold transition-colors"
              >
                {w.word}
              </Link>
            </div>
            <div className="text-secondary">{w.timesSeen}</div>
            <div className="text-accent-red">{w.timesWrong}</div>
            <div>
              <span className={`font-semibold ${
                w.errorRate >= 80 ? 'text-accent-red' :
                w.errorRate >= 50 ? 'text-accent-gold' :
                'text-secondary'
              }`}>
                {w.errorRate}%
              </span>
            </div>
            <div className="text-secondary text-xs">
              {w.lastMissedDate ? relativeDate(w.lastMissedDate) : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default function SessionHistory() {
  const [tab,       setTab]       = useState('history')    // 'history' | 'weak'
  const [sessions,  setSessions]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [modeFilter, setModeFilter] = useState('all')
  const [dateRange,  setDateRange]  = useState('all')

  const loadSessions = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const data = await api.getSessions({ page, limit: 50 })
      setSessions(data.sessions || [])
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 })
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSessions(1) }, [loadSessions])

  function handleDelete(id) {
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  const filtered = sessions.filter(s => {
    if (modeFilter !== 'all' && s.mode?.toLowerCase() !== modeFilter) return false
    if (!inDateRange(s.datetime, dateRange)) return false
    return true
  })

  return (
    <div className="p-8 max-w-3xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-primary mb-1">History</h1>
        <p className="text-secondary font-sans text-sm">
          Review past practice sessions and track weak words
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-warm-800">
        {[
          { id: 'history', label: 'Sessions' },
          { id: 'weak',    label: 'Weak Words' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-sans font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-accent-gold text-accent-gold'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sessions tab */}
      {tab === 'history' && (
        <div>
          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <select
              value={modeFilter}
              onChange={e => setModeFilter(e.target.value)}
              className="bg-secondary border border-warm-700 text-secondary text-sm font-sans rounded-lg px-3 py-2 focus:outline-none focus:border-accent-gold"
            >
              <option value="all">All modes</option>
              {MODES.map(m => (
                <option key={m} value={m}>{MODE_ICONS[m]} {m}</option>
              ))}
            </select>

            <div className="flex gap-1">
              {[
                { id: 'week',  label: 'This week' },
                { id: 'month', label: 'This month' },
                { id: 'all',   label: 'All time' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setDateRange(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-colors ${
                    dateRange === id
                      ? 'bg-accent-gold/10 text-accent-gold border border-accent-gold/30'
                      : 'bg-secondary border border-warm-700 text-secondary hover:text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <span className="ml-auto text-xs text-secondary font-sans">
              {filtered.length} session{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Session list */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-secondary font-sans text-sm">
              <p className="text-4xl mb-4">📋</p>
              <p>No sessions found for the selected filters.</p>
              <Link to="/practice" className="mt-4 inline-block text-accent-gold hover:underline text-sm">
                Start a practice session →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weak words tab */}
      {tab === 'weak' && <WeakWordsTab />}
    </div>
  )
}
