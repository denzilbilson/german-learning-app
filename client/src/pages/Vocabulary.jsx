import { useState, useEffect } from 'react'
import DataTable from '../components/DataTable.jsx'
import AnkiExportModal from '../components/AnkiExportModal.jsx'
import { api } from '../services/api.js'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const POS_COLORS = {
  noun:        'bg-blue-500/15 text-blue-300 border border-blue-500/20',
  verb:        'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  adjective:   'bg-orange-500/15 text-orange-300 border border-orange-500/20',
  adverb:      'bg-purple-500/15 text-purple-300 border border-purple-500/20',
  conjunction: 'bg-pink-500/15 text-pink-300 border border-pink-500/20',
  preposition: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20',
  article:     'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  pronoun:     'bg-violet-500/15 text-violet-300 border border-violet-500/20',
}

function PosBadge({ val }) {
  if (!val) return null
  const key = val.toLowerCase().match(/^[a-z]+/)?.[0] || ''
  const cls = POS_COLORS[key] || 'bg-stone-700/60 text-stone-400 border border-stone-700'
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{val}</span>
}

function LevelBadge({ val }) {
  if (!val) return null
  return <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-yellow-400/10 text-yellow-300">{val}</span>
}

const COLUMNS = [
  { key: 'Word',             label: 'Word',           sortable: true,  editable: true,  textClass: 'font-semibold text-stone-100' },
  { key: 'Literal Meaning',  label: 'Literal',        sortable: false, editable: true,  textClass: 'text-stone-500 italic text-xs' },
  { key: 'Intended Meaning', label: 'Meaning',        sortable: false, editable: true,  textClass: 'text-stone-300' },
  { key: 'Part of Speech',   label: 'POS',            sortable: true,  editable: true,  render: (val) => <PosBadge val={val} /> },
  { key: 'Level',            label: 'Level',          sortable: true,  editable: true,  options: LEVELS, render: (val) => <LevelBadge val={val} /> },
  { key: 'Source',           label: 'Source',         sortable: false, editable: true,  textClass: 'text-stone-500 text-xs' },
  { key: 'Date Added',       label: 'Added',          sortable: true,  editable: false, textClass: 'text-stone-700 text-xs' },
]

const EMPTY_FORM = { Word: '', 'Literal Meaning': '', 'Intended Meaning': '', 'Part of Speech': '', 'Case Examples': '', Level: 'B1', Source: '' }

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
    if (!form.Word.trim()) { setErr('Word is required'); return }
    setSaving(true); setErr(null)
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-600 text-sm focus:outline-none focus:border-yellow-500/60 transition-colors'
  const label = (text, required) => (
    <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1.5 font-medium">
      {text} {required && <span className="text-yellow-400">*</span>}
    </label>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-800">
          <h2 className="font-display text-lg text-stone-100">Add Vocabulary</h2>
          <button onClick={onClose} className="text-stone-600 hover:text-stone-300 transition-colors text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              {label('Word', true)}
              <input value={form.Word} onChange={e => set('Word', e.target.value)} placeholder="die Vorstellung" className={inputCls} autoFocus />
            </div>
            <div>
              {label('Level')}
              <select value={form.Level} onChange={e => set('Level', e.target.value)} className={inputCls}>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            {label('Literal Meaning')}
            <input value={form['Literal Meaning']} onChange={e => set('Literal Meaning', e.target.value)} placeholder="the presentation / the imagining" className={inputCls} />
          </div>

          <div>
            {label('Intended Meaning')}
            <input value={form['Intended Meaning']} onChange={e => set('Intended Meaning', e.target.value)} placeholder="concept, idea, performance" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              {label('Part of Speech')}
              <input value={form['Part of Speech']} onChange={e => set('Part of Speech', e.target.value)} placeholder="Noun (f.)" className={inputCls} />
            </div>
            <div>
              {label('Source')}
              <input value={form.Source} onChange={e => set('Source', e.target.value)} placeholder="Der Spiegel" className={inputCls} />
            </div>
          </div>

          <div>
            {label('Case Examples')}
            <p className="text-xs text-stone-700 -mt-1 mb-1.5">Separate examples with &lt;br&gt;</p>
            <textarea value={form['Case Examples']} onChange={e => set('Case Examples', e.target.value)} rows={2}
              placeholder="Ich habe keine Vorstellung davon.<br>Die Vorstellung beginnt um 20 Uhr."
              className={`${inputCls} resize-none`} />
          </div>

          {err && <p className="text-red-400 text-sm">{err}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-stone-400 hover:text-stone-200 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg text-sm font-semibold bg-yellow-400 text-stone-900 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {saving ? 'Saving…' : 'Add Word'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Vocabulary() {
  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAnki,  setShowAnki]  = useState(false)
  const [toast, setToast]         = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    api.getVocabulary()
      .then(setRows)
      .catch(e => showToast('Load failed: ' + e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpdate(idx, data) {
    try {
      await api.updateVocabulary(idx, data)
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...data } : r))
      showToast('Saved')
    } catch (e) {
      showToast('Update failed: ' + e.message, 'error')
    }
  }

  async function handleDelete(idx) {
    try {
      await api.deleteVocabulary(idx)
      setRows(prev => prev.filter((_, i) => i !== idx))
      showToast('Deleted')
    } catch (e) {
      showToast('Delete failed: ' + e.message, 'error')
    }
  }

  async function handleAdd(data) {
    const added = await api.addVocabulary(data)
    setRows(prev => [...prev, ...(Array.isArray(added) ? added : [added])])
    showToast('Word added')
  }

  return (
    <div className="p-8">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-sans shadow-xl border ${
          toast.type === 'error' ? 'bg-red-950 text-red-300 border-red-800' : 'bg-stone-800 text-stone-200 border-stone-700'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-stone-100 mb-1">Vocabulary</h1>
          <p className="text-stone-500 text-sm font-sans">
            {loading ? 'Loading…' : `${rows.length} word${rows.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnki(true)}
            disabled={rows.length === 0}
            className="px-4 py-2.5 bg-stone-800 border border-stone-700 text-stone-300 rounded-xl text-sm font-semibold hover:bg-stone-700 hover:border-stone-600 transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 2v8M5 7l3 3 3-3M2 11v1a2 2 0 002 2h8a2 2 0 002-2v-1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export to Anki
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 bg-yellow-400 text-stone-900 rounded-xl text-sm font-semibold hover:bg-yellow-300 transition-colors flex items-center gap-2 shrink-0"
          >
            <span className="text-base leading-none font-bold">+</span>
            Add Word
          </button>
        </div>
      </div>

      <DataTable
        columns={COLUMNS}
        rows={rows}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        expandKey="Case Examples"
        levelKey="Level"
        loading={loading}
      />

      {showModal && <AddModal onClose={() => setShowModal(false)} onSave={handleAdd} />}
      {showAnki  && (
        <AnkiExportModal
          vocabRows={rows}
          onClose={() => setShowAnki(false)}
          onSuccess={() => { setShowAnki(false); showToast('Anki deck downloaded') }}
        />
      )}
    </div>
  )
}
