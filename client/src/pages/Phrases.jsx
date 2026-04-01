import { useState, useEffect } from 'react'
import DataTable from '../components/DataTable.jsx'
import AnkiExportModal from '../components/AnkiExportModal.jsx'
import SpeakButton from '../components/SpeakButton.jsx'
import GermanKeyboard from '../components/GermanKeyboard.jsx'
import { api } from '../services/api.js'
import { useToast } from '../components/Toast.jsx'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function LevelBadge({ val }) {
  if (!val) return null
  return <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-accent-gold/10 text-accent-gold">{val}</span>
}

function PhraseCell({ val }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-primary italic">{val}</span>
      <SpeakButton text={val} />
    </div>
  )
}

const COLUMNS = [
  { key: 'Phrase',          label: 'Phrase',  sortable: true,  editable: true,  render: (val) => <PhraseCell val={val} /> },
  { key: 'English Meaning', label: 'Meaning', sortable: false, editable: true,  textClass: 'text-warm-300' },
  { key: 'Level',           label: 'Level',   sortable: true,  editable: true,  options: LEVELS, render: (val) => <LevelBadge val={val} /> },
  { key: 'Source',          label: 'Source',  sortable: false, editable: true,  textClass: 'text-secondary text-xs' },
  { key: 'Date Added',      label: 'Added',   sortable: true,  editable: false, textClass: 'text-warm-700 text-xs' },
]

const EMPTY_FORM = { Phrase: '', 'English Meaning': '', Level: 'B1', Source: '' }

function AddModal({ onClose, onSave }) {
  const [form, setForm]     = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState(null)

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.Phrase.trim()) { setErr('Phrase is required'); return }
    setSaving(true); setErr(null)
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-tertiary border border-warm-700 rounded-lg px-3 py-2 text-primary placeholder-warm-600 text-sm focus:outline-none focus:ring-2 focus:ring-accent-gold/40 focus:border-accent-gold/60'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/80 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-secondary border border-warm-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-warm-800">
          <h2 className="font-display text-lg text-primary">Add Phrase</h2>
          <button onClick={onClose} className="text-warm-600 hover:text-warm-300 text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs text-secondary uppercase tracking-wider mb-1.5 font-medium">
              Phrase <span className="text-accent-gold">*</span>
            </label>
            <input value={form.Phrase} onChange={e => set('Phrase', e.target.value)}
              placeholder="Es kommt darauf an." className={inputCls} autoFocus />
          </div>

          <div>
            <label className="block text-xs text-secondary uppercase tracking-wider mb-1.5 font-medium">English Meaning</label>
            <input value={form['English Meaning']} onChange={e => set('English Meaning', e.target.value)}
              placeholder="It depends." className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-secondary uppercase tracking-wider mb-1.5 font-medium">Level</label>
              <select value={form.Level} onChange={e => set('Level', e.target.value)} className={inputCls}>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-secondary uppercase tracking-wider mb-1.5 font-medium">Source</label>
              <input value={form.Source} onChange={e => set('Source', e.target.value)}
                placeholder="Podcast" className={inputCls} />
            </div>
          </div>

          <GermanKeyboard className="justify-end" />

          {err && <p className="text-accent-red text-sm">{err}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-secondary hover:text-primary">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg text-sm font-semibold bg-accent-gold text-primary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving…' : 'Add Phrase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Phrases() {
  const toast = useToast()

  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showAnki,  setShowAnki]  = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    api.getPhrases()
      .then(data => { setRows(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function handleUpdate(idx, data) {
    try {
      await api.updatePhrase(idx, data)
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...data } : r))
      toast.success('Saved')
    } catch (e) {
      toast.error('Update failed: ' + e.message)
    }
  }

  async function handleDelete(idx) {
    try {
      await api.deletePhrase(idx)
      setRows(prev => prev.filter((_, i) => i !== idx))
      toast.success('Deleted')
    } catch (e) {
      toast.error('Delete failed: ' + e.message)
    }
  }

  async function handleAdd(data) {
    const added = await api.addPhrases(data)
    setRows(prev => [...prev, ...(Array.isArray(added) ? added : [added])])
    toast.success('Phrase added')
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary mb-1">Phrases</h1>
          <p className="text-secondary text-sm font-sans">
            {loading ? 'Loading…' : error ? 'Failed to load' : `${rows.length} phrase${rows.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GermanKeyboard />
          <button
            onClick={() => setShowAnki(true)}
            disabled={rows.length === 0}
            className="px-4 py-2.5 bg-tertiary border border-warm-700 text-warm-300 rounded-xl text-sm font-semibold hover:bg-warm-700 hover:border-warm-600 flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 2v8M5 7l3 3 3-3M2 11v1a2 2 0 002 2h8a2 2 0 002-2v-1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export to Anki
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 bg-accent-gold text-primary rounded-xl text-sm font-semibold hover:brightness-110 flex items-center gap-2 shrink-0"
          >
            <span className="text-base leading-none font-bold">+</span>
            Add Phrase
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-6 bg-accent-red/10 border border-accent-red/30 rounded-xl text-accent-red text-sm font-sans flex items-center justify-between gap-4">
          <span>Failed to load phrases: {error}</span>
          <button onClick={load} className="text-xs px-3 py-1.5 bg-accent-red/20 rounded-lg hover:bg-accent-red/30 shrink-0">
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={rows}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          levelKey="Level"
          loading={loading}
        />
      )}

      {showModal && <AddModal onClose={() => setShowModal(false)} onSave={handleAdd} />}
      {showAnki  && (
        <AnkiExportModal
          phraseRows={rows}
          onClose={() => setShowAnki(false)}
          onSuccess={() => { setShowAnki(false); toast.success('Anki deck downloaded') }}
        />
      )}
    </div>
  )
}
