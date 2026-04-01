import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import TextAnalysis from './pages/TextAnalysis.jsx'
import Vocabulary from './pages/Vocabulary.jsx'
import Phrases from './pages/Phrases.jsx'
import Practice from './pages/Practice.jsx'
import Grammar from './pages/Grammar.jsx'

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard',  icon: '⊞' },
  { to: '/analyze',   label: 'Analyze',    icon: '◎' },
  { to: '/vocabulary',label: 'Vocabulary', icon: '⬡' },
  { to: '/phrases',   label: 'Phrases',    icon: '❝' },
  { to: '/practice',  label: 'Practice',   icon: '◈' },
  { to: '/grammar',   label: 'Grammar',    icon: '§' },
]

function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-stone-900 border-r border-stone-800 flex flex-col py-8 px-4 min-h-screen">
      <div className="mb-10 px-2">
        <h1 className="font-display text-xl font-semibold text-stone-100 leading-tight">
          Deutsch<br />
          <span className="text-yellow-400">Lernen</span>
        </h1>
        <p className="text-xs text-stone-500 mt-1 font-sans">B1 → B2</p>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-sans transition-colors ${
                isActive
                  ? 'bg-yellow-400/10 text-yellow-300 border-l-2 border-yellow-400'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`
            }
          >
            <span className="text-base w-5 text-center">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-2 pt-8">
        <p className="text-xs text-stone-600 font-sans">
          Powered by Claude
        </p>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-stone-950 text-stone-100 font-sans">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analyze" element={<TextAnalysis />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
            <Route path="/phrases" element={<Phrases />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/grammar" element={<Grammar />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
