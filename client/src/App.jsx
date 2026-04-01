import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import Dashboard      from './pages/Dashboard.jsx'
import TextAnalysis   from './pages/TextAnalysis.jsx'
import Vocabulary     from './pages/Vocabulary.jsx'
import Phrases        from './pages/Phrases.jsx'
import Practice       from './pages/Practice.jsx'
import Grammar        from './pages/Grammar.jsx'
import Import         from './pages/Import.jsx'
import SessionHistory from './pages/SessionHistory.jsx'
import GlobalSearch   from './components/GlobalSearch.jsx'
import { ToastProvider } from './components/Toast.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { GenderLegend } from './components/GenderBadge.jsx'

const NAV_ITEMS = [
  { to: '/',           label: 'Dashboard',  icon: '⊞' },
  { to: '/analyze',    label: 'Analyze',    icon: '◎' },
  { to: '/vocabulary', label: 'Vocabulary', icon: '⬡' },
  { to: '/phrases',    label: 'Phrases',    icon: '❝' },
  { to: '/practice',   label: 'Practice',   icon: '◈' },
  { to: '/grammar',    label: 'Grammar',    icon: '§'  },
  { to: '/history',    label: 'History',    icon: '◷'  },
  { to: '/import',     label: 'Import',     icon: '↑'  },
]

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function Sidebar({ theme, onToggleTheme, mobileOpen, onClose, onOpenSearch }) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-30
          lg:relative lg:z-auto lg:translate-x-0
          w-56 shrink-0 bg-secondary border-r border-warm-800
          flex flex-col py-8 px-4
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="mb-6 px-2 flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold text-primary leading-tight">
              Deutsch<br />
              <span className="text-accent-gold">Lernen</span>
            </h1>
            <p className="text-xs text-secondary mt-1 font-sans">B1 → B2</p>
          </div>
          <button
            className="lg:hidden text-warm-600 hover:text-warm-300 mt-0.5"
            onClick={onClose}
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Search button */}
        <button
          onClick={() => { onClose(); onOpenSearch() }}
          className="flex items-center gap-2 mx-2 mb-5 px-3 py-2 bg-tertiary border border-warm-700 rounded-lg text-secondary hover:text-primary hover:border-warm-600 transition-colors group"
        >
          <SearchIcon />
          <span className="flex-1 text-xs font-sans text-left">Search…</span>
          <kbd className="text-warm-700 text-xs font-sans bg-secondary border border-warm-700 rounded px-1 group-hover:border-warm-600">
            ⌘K
          </kbd>
        </button>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-sans ${
                  isActive
                    ? 'bg-accent-gold/10 text-accent-gold border-l-2 border-accent-gold'
                    : 'text-secondary hover:text-primary hover:bg-tertiary'
                }`
              }
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="mt-auto px-2 pt-8 space-y-4">
          <GenderLegend />
          <div className="border-t border-warm-800 pt-3 space-y-2">
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-2 text-xs text-secondary hover:text-primary font-sans"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <p className="text-xs text-warm-700 font-sans">Powered by Claude</p>
          </div>
        </div>
      </aside>
    </>
  )
}

function MobileBar({ onOpenMenu, onOpenSearch }) {
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-10 h-14 bg-secondary/95 backdrop-blur border-b border-warm-800 flex items-center px-4 gap-3">
      <button
        onClick={onOpenMenu}
        className="text-secondary hover:text-primary"
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>
      <span className="font-display text-base font-semibold text-primary">
        Deutsch <span className="text-accent-gold">Lernen</span>
      </span>
      <button
        onClick={onOpenSearch}
        className="ml-auto text-secondary hover:text-primary"
        aria-label="Search"
      >
        <SearchIcon />
      </button>
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-enter">
      <Routes location={location}>
        <Route path="/"           element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="/analyze"    element={<ErrorBoundary><TextAnalysis /></ErrorBoundary>} />
        <Route path="/vocabulary" element={<ErrorBoundary><Vocabulary /></ErrorBoundary>} />
        <Route path="/phrases"    element={<ErrorBoundary><Phrases /></ErrorBoundary>} />
        <Route path="/practice"   element={<ErrorBoundary><Practice /></ErrorBoundary>} />
        <Route path="/grammar"    element={<ErrorBoundary><Grammar /></ErrorBoundary>} />
        <Route path="/history"    element={<ErrorBoundary><SessionHistory /></ErrorBoundary>} />
        <Route path="/import"     element={<ErrorBoundary><Import /></ErrorBoundary>} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

// Global Cmd+K handler — lives inside BrowserRouter so GlobalSearch can use navigate
function AppShell() {
  const [theme, setTheme]           = useState(() => {
    try { return localStorage.getItem('theme') || 'dark' } catch { return 'dark' }
  })
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [searchOpen,  setSearchOpen]    = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  // Global Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleTheme  = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const openSidebar  = useCallback(() => setSidebarOpen(true), [])
  const openSearch   = useCallback(() => setSearchOpen(true), [])
  const closeSearch  = useCallback(() => setSearchOpen(false), [])

  return (
    <div
      className="flex min-h-screen font-sans"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <Sidebar
        theme={theme}
        onToggleTheme={toggleTheme}
        mobileOpen={sidebarOpen}
        onClose={closeSidebar}
        onOpenSearch={openSearch}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <MobileBar onOpenMenu={openSidebar} onOpenSearch={openSearch} />
        <main className="flex-1 overflow-auto pt-14 lg:pt-0">
          <AnimatedRoutes />
        </main>
      </div>

      <GlobalSearch isOpen={searchOpen} onClose={closeSearch} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </BrowserRouter>
  )
}
