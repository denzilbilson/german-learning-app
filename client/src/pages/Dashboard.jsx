import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import { api } from '../services/api.js'

const LEVEL_COLORS = {
  A1: '#4AD97A',
  A2: '#45c97a',
  B1: '#D4A843',
  B2: '#c4942e',
  C1: '#fb923c',
  C2: '#C4453C',
}

const STUDY_TIPS = [
  { icon: '📖', tip: 'Read one German article today — even a headline counts.' },
  { icon: '🎧', tip: 'Listen to a German podcast at 0.8× speed to tune your ear.' },
  { icon: '✍️', tip: 'Write three sentences using words you added this week.' },
  { icon: '🔄', tip: 'Review your Anki deck before bed for spaced repetition.' },
  { icon: '🗣️', tip: 'Speak one word aloud and feel its gender and case.' },
]

function Skeleton({ className = '' }) {
  return <div className={`bg-tertiary rounded animate-pulse ${className}`} />
}

function StatCard({ label, value, sub, icon, accent, loading }) {
  return (
    <div className="bg-secondary rounded-xl p-5 border border-warm-800 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-secondary uppercase tracking-wider font-sans font-medium">{label}</p>
        {icon && <span className="text-lg opacity-40">{icon}</span>}
      </div>
      {loading
        ? <Skeleton className="h-9 w-20" />
        : <p className={`font-display text-4xl font-semibold ${accent || 'text-primary'}`}>
            {value ?? '—'}
          </p>
      }
      <p className="text-xs text-warm-600 font-sans">{sub}</p>
    </div>
  )
}

const chartTooltipStyle = {
  contentStyle: { background: '#1A1D27', border: '1px solid #252836', borderRadius: '8px', color: '#D8D4CB', fontSize: 12 },
  itemStyle:    { color: '#D4A843' },
  labelStyle:   { color: '#8B8D97', fontSize: 11 },
}

export default function Dashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    api.getDashboard()
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const levelData = data
    ? Object.entries(data.levelDistribution || {}).map(([level, count]) => ({ level, count }))
    : []

  const tip = STUDY_TIPS[new Date().getDay() % STUDY_TIPS.length]

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-primary leading-tight">
          Guten Tag
        </h1>
        <p className="text-secondary font-sans text-sm mt-1">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/30 rounded-xl text-accent-red text-sm font-sans flex items-center justify-between gap-4">
          <span>Failed to load dashboard: {error}</span>
          <button
            onClick={load}
            className="text-xs px-3 py-1.5 bg-accent-red/20 rounded-lg hover:bg-accent-red/30 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Vocabulary"
          value={data?.totalVocab ?? '—'}
          sub={data?.addedThisWeek ? `+${data.addedThisWeek} this week` : 'words saved'}
          icon="📚"
          accent="text-accent-gold"
          loading={loading}
        />
        <StatCard
          label="Phrases"
          value={data?.totalPhrases ?? '—'}
          sub="phrases saved"
          icon="💬"
          loading={loading}
        />
        <StatCard
          label="Days Active"
          value={data?.daysActive ?? '—'}
          sub="since you started"
          icon="🗓"
          loading={loading}
        />
        <StatCard
          label="Practice Sessions"
          value={data?.practiceStats?.totalSessions ?? 0}
          sub={
            data?.practiceStats?.totalSessions
              ? `avg score: ${data.practiceStats.avgScore}%`
              : 'no sessions yet'
          }
          icon="🎯"
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-secondary rounded-xl p-6 border border-warm-800">
          <h2 className="font-display text-lg text-primary mb-5">Words Over Time</h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : data?.wordsOverTime?.length > 0 ? (
            <ResponsiveContainer width="100%" height={192}>
              <LineChart data={data.wordsOverTime} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#8B8D97', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                  tickLine={false}
                  axisLine={{ stroke: '#252836' }}
                  tickFormatter={d => d.slice(5)}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#8B8D97', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip {...chartTooltipStyle} labelFormatter={d => `Date: ${d}`} formatter={v => [v, 'Total words']} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#D4A843"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#D4A843', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#D4A843' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-warm-600 text-sm font-sans">Add vocabulary to see progress here.</p>
            </div>
          )}
        </div>

        <div className="bg-secondary rounded-xl p-6 border border-warm-800">
          <h2 className="font-display text-lg text-primary mb-5">By CEFR Level</h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : levelData.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={192}>
              <BarChart data={levelData} margin={{ left: -20, right: 0, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252836" horizontal vertical={false} />
                <XAxis
                  dataKey="level"
                  tick={{ fill: '#8B8D97', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                  tickLine={false}
                  axisLine={{ stroke: '#252836' }}
                />
                <YAxis
                  tick={{ fill: '#8B8D97', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip {...chartTooltipStyle} formatter={(v, _, props) => [v, props.payload.level]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {levelData.map(({ level }) => (
                    <Cell key={level} fill={LEVEL_COLORS[level] || '#D4A843'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-3">
              {['A1','A2','B1','B2','C1','C2'].map(l => (
                <div key={l} className="flex items-center gap-2 w-full">
                  <span className="text-xs text-warm-600 w-6">{l}</span>
                  <div className="flex-1 h-1.5 bg-tertiary rounded-full" />
                  <span className="text-xs text-warm-700 w-3">0</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-secondary rounded-xl p-6 border border-warm-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-primary">Recent Analyses</h2>
            <Link to="/analyze" className="text-xs text-secondary hover:text-accent-gold font-sans">
              + New
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : data?.recentAnalyses?.length > 0 ? (
            <ul className="space-y-2">
              {data.recentAnalyses.map(a => (
                <li key={a.filename} className="flex items-start gap-3 p-2.5 rounded-lg bg-tertiary/50 border border-warm-800">
                  <span className="text-accent-gold/60 mt-0.5">◎</span>
                  <div className="min-w-0">
                    <p className="text-warm-300 text-xs font-sans truncate">
                      {a.source || a.filename.replace('.json', '').replace(/-/g, ' ')}
                    </p>
                    <p className="text-warm-600 text-xs font-sans mt-0.5">
                      {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-6 text-center">
              <p className="text-warm-600 text-sm font-sans">No analyses yet.</p>
              <Link to="/analyze" className="text-accent-gold/70 text-xs font-sans mt-2 block hover:text-accent-gold">
                Analyze your first text →
              </Link>
            </div>
          )}
        </div>

        <div className="bg-secondary rounded-xl p-6 border border-warm-800">
          <h2 className="font-display text-lg text-primary mb-4">Quick Actions</h2>
          <div className="space-y-2.5">
            <Link
              to="/analyze"
              className="flex items-center gap-3 w-full px-4 py-3 bg-accent-gold hover:brightness-110 text-primary rounded-lg text-sm font-semibold"
            >
              <span>◎</span> Analyze New Text
            </Link>
            <Link
              to="/practice"
              className="flex items-center gap-3 w-full px-4 py-3 bg-tertiary hover:bg-warm-700 text-warm-200 rounded-lg text-sm font-semibold border border-warm-700"
            >
              <span>◈</span> Start Practice
            </Link>
            <Link
              to="/vocabulary"
              className="flex items-center gap-3 w-full px-4 py-3 bg-tertiary hover:bg-warm-700 text-warm-200 rounded-lg text-sm font-semibold border border-warm-700"
            >
              <span>⬡</span> Browse Vocabulary
            </Link>
            <Link
              to="/grammar"
              className="flex items-center gap-3 w-full px-4 py-3 bg-tertiary hover:bg-warm-700 text-warm-200 rounded-lg text-sm font-semibold border border-warm-700"
            >
              <span>§</span> Grammar Reference
            </Link>
          </div>
        </div>

        <div className="bg-secondary rounded-xl p-6 border border-warm-800">
          <h2 className="font-display text-lg text-primary mb-4">Today's Tip</h2>
          <div className="p-4 bg-accent-gold/5 border border-accent-gold/20 rounded-xl mb-5">
            <p className="text-2xl mb-2">{tip.icon}</p>
            <p className="text-warm-300 text-sm font-sans leading-relaxed">{tip.tip}</p>
          </div>
          <h3 className="text-xs text-secondary uppercase tracking-wider font-sans font-medium mb-3">
            B1 → B2 Milestones
          </h3>
          <ul className="space-y-2 font-sans text-xs text-secondary">
            {[
              { done: (data?.totalVocab || 0) >= 100,                    label: '100 vocabulary words' },
              { done: (data?.totalPhrases || 0) >= 50,                   label: '50 phrases saved' },
              { done: (data?.practiceStats?.totalSessions || 0) >= 10,   label: '10 practice sessions' },
              { done: (data?.daysActive || 0) >= 30,                     label: '30 days active' },
            ].map(({ done, label }) => (
              <li key={label} className={`flex items-center gap-2 ${done ? 'text-accent-green' : ''}`}>
                <span>{done ? '✓' : '○'}</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
