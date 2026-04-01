import { useState, useEffect } from 'react'
import DataTable from '../components/DataTable.jsx'
import { api } from '../services/api.js'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function LevelBadge({ val }) {
  if (!val) return null
  return <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-yellow-400/10 text-yellow-300">{val}</span>
}

const COLUMNS = [
  { key: 'Phrase',          label: 'Phrase',   sortable: true,  editable: true,  textClass: 'font-medium text-stone-100 italic' },
  { key: 'English Meaning', label: 'Meaning',  sortable: false, editable: true,  textClass: 'text-stone-300' },
  { key: 'Level',           label: 'Level',    sortable: true,  editable: true,  options: LEVELS, render: (val) => <LevelBadge val={val} /> },
  { key: 'Source',          label: 'Source',   sortable: false, editable: true,  textClass: 'text-stone-500 text-xs' },
  { key: 'Date Added',      label: 'Added',    sortable: true,  editable: false, textClass: 'text-stone-700 text-xs' },
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

  const inputCls = 'w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-600 text-sm focus:outline-none focus:border-yellow-500/60 transition-colors'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-800">
          <h2 className="font-display text-lg text-stone-100">Add Phrase</h2>
          <button onClick={onClose} className="text-stone-600 hover:text-stone-300 transition-colors text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1.5 font-medium">
              Phrase <span className="text-yellow-400">*</span>
            </label>
            <input value={form.Phrase} onChange={e => set('Phrase', e.target.value)}
              placeholder="Es kommt darauf an." className={inputCls} autoFocus />
          </div>

          <div>
            <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1.5 font-medium">English Meaning</label>
            <input value={form['English Meaning']} onChange={e => set('English Meaning', e.target.value)}
              placeholder="It depends." className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1.5 font-medium">Level</label>
              <select value={form.Level} onChange={e => set('Level', e.target.value)} className={inputCls}>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1.5 font-medium">Source</label>
              <input value={form.Source} onChange={e => set('Source', e.target.value)}
                placeholder="Podcast" className={inputCls} />
            </div>
          </div>

          {err && <p className="text-red-400 text-sm">{err}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-stone-400 hover:text-stone-200 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg text-sm font-semibold bg-yellow-400 text-stone-900 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {saving ? 'Saving…' : 'Add Phrase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Phrases() {
  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast]         = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    api.getPhrases()
      .then(setRows)
      .catch(e => showToast('Load failed: ' + e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpdate(idx, data) {
    try {
      await api.updatePhrase(idx, data)
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...data } : r))
      showToast('Saved')
    } catch (e) {
      showToast('Update failed: ' + e.message, 'error')
    }
  }

  async function handleDelete(idx) {
    try {
      await api.deletePhrase(idx)
      setRows(prev => prev.filter((_, i) => i !== idx))
      showToast('Deleted')
    } catch (e) {
      showToast('Delete failed: ' + e.message, 'error')
    }
  }

  async function handleAdd(data) {
    const added = await api.addPhrases(data)
    setRows(prev => [...prev, ...(Array.isArray(added) ? added : [added])])
    showToast('Phrase added')
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
          <h1 className="font-display text-3xl font-semibold text-stone-100 mb-1">Phrases</h1>
          <p className="text-stone-500 text-sm font-sans">
            {loading ? 'Loading…' : `${rows.length} phrase${rows.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-yellow-400 text-stone-900 rounded-xl text-sm font-semibold hover:bg-yellow-300 transition-colors flex items-center gap-2 shrink-0"
        >
          <span className="text-base leading-none font-bold">+</span>
          Add Phrase
        </button>
      </div>

      <DataTable
        columns={COLUMNS}
        rows={rows}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        levelKey="Level"
        loading={loading}
      />

      {showModal && <AddModal onClose={() => setShowModal(false)} onSave={handleAdd} />}
    </div>
  )
}
