import { useState, useEffect } from 'react'
import DataTable from '../components/DataTable.jsx'
import AnkiExportModal from '../components/AnkiExportModal.jsx'
import GenderBadge from '../components/GenderBadge.jsx'
import SpeakButton from '../components/SpeakButton.jsx'
import GermanKeyboard from '../components/GermanKeyboard.jsx'
import { api } from '../services/api.js'
import { useToast } from '../components/Toast.jsx'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const POS_COLORS = {
  noun:        'bg-accent-blue/10 text-accent-blue border border-accent-blue/20',
  verb:        'bg-accent-green/10 text-accent-green border border-accent-green/20',
  adjective:   'bg-orange-400/10 text-orange-300 border border-orange-400/20',
  adverb:      'bg-accent-purple/10 text-accent-purple border border-accent-purple/20',
  conjunction: 'bg-pink-400/10 text-pink-300 border border-pink-400/20',
  preposition: 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20',
  article:     'bg-accent-gold/10 text-accent-gold border border-accent-gold/20',
  pronoun:     'bg-accent-purple/10 text-accent-purple border border-accent-purple/20',
}

function PosBadge({ val }) {
  if (!val) return null
  const key = val.toLowerCase().match(/^[a-z]+/)?.[0] || ''
  const cls = POS_COLORS[key] || 'bg-tertiary text-secondary border border-warm-700'
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{val}</span>
      <GenderBadge pos={val} />
    </div>
  )
}

function LevelBadge({ val }) {
  if (!val) return null
  return <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-accent-gold/10 text-accent-gold">{val}</span>
}

function WordCell({ val, row }) {
  const pos = row?.['Part of Speech'] || ''
  const isVerb = pos.toLowerCase().includes('verb')
  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-primary">{val}</span>
      <SpeakButton text={val} />
      {isVerb && <ConjugateInline word={val} />}
    </div>
  )
}

// ── Conjugation panel ─────────────────────────────────────────────

function ConjugateInline({ word }) {
  const [open,   setOpen]   = useState(false)
  const [data,   setData]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [err,    setErr]    = useState(null)

  async function load() {
    if (data) { setOpen(o => !o); return }
    setLoading(true)
    setErr(null)
    try {
      const res = await api.conjugateVerb(word)
      setData(res)
      setOpen(true)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  const TENSES = data ? Object.keys(data.tenses) : []
  const PRONOUNS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie']

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); load() }}
        disabled={loading}
        className="text-[10px] px-1.5 py-0.5 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded hover:bg-accent-green/20 disabled:opacity-50 font-sans"
        title="Show verb conjugation"
      >
        {loading ? '…' : 'conj'}
      </button>
      {err && <span className="text-[10px] text-accent-red ml-1">{err}</span>}

      {open && data && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-secondary border border-warm-700 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-warm-800">
              <div>
                <h3 className="font-display text-lg text-primary">{data.infinitive}</h3>
                <p className="text-xs text-secondary font-sans mt-0.5">
                  Hilfsverb: <span className="text-accent-gold">{data.auxiliary}</span>
                  {data.isReflexive && <span className="ml-2 text-accent-purple">(reflexive)</span>}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-warm-600 hover:text-warm-300 text-lg">✕</button>
            </div>

            <div className="overflow-x-auto p-6">
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr>
                    <th className="text-left text-warm-600 text-xs uppercase tracking-wider pb-3 pr-6">Pronoun</th>
                    {TENSES.map(t => (
                      <th key={t} className="text-left text-warm-500 text-xs uppercase tracking-wider pb-3 px-3">{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PRONOUNS.map(pron => (
                    <tr key={pron} className="border-t border-warm-800/50 hover:bg-tertiary/30">
                      <td className="py-2 pr-6 text-secondary text-xs font-medium whitespace-nowrap">{pron}</td>
                      {TENSES.map(t => (
                        <td key={t} className="py-2 px-3 text-warm-300 whitespace-nowrap">
                          {data.tenses[t]?.[pron] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Column definitions ────────────────────────────────────────────
const COLUMNS = [
  { key: 'Word',             label: 'Word',    sortable: true,  editable: true,  render: (val, row) => <WordCell val={val} row={row} /> },
  { key: 'Literal Meaning',  label: 'Literal', sortable: false, editable: true,  textClass: 'text-secondary italic text-xs' },
  { key: 'Intended Meaning', label: 'Meaning', sortable: false, editable: true,  textClass: 'text-warm-300' },
  { key: 'Part of Speech',   label: 'POS',     sortable: true,  editable: true,  render: (val) => <PosBadge val={val} /> },
  { key: 'Level',            label: 'Level',   sortable: true,  editable: true,  options: LEVELS, render: (val) => <LevelBadge val={val} /> },
  { key: 'Source',           label: 'Source',  sortable: false, editable: true,  textClass: 'text-secondary text-xs' },
  { key: 'Date Added',       label: 'Added',   sortable: true,  editable: false, textClass: 'text-warm-700 text-xs' },
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

  const inputCls = 'w-full bg-tertiary border border-warm-700 rounded-lg px-3 py-2 text-primary placeholder-warm-600 text-sm focus:outline-none focus:ring-2 focus:ring-accent-gold/40 focus:border-accent-gold/60'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/80 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-secondary border border-warm-700 rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-warm-800">
          <h2 className="font-display text-lg text-primary">Add Vocabulary</h2>
          <button onClick={onClose} className="text-warm-600 hover:text-warm-300 text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-secondary uppercase tracking-wider mb-1.5 font-medium">
                Word <span className="text-accent-gold">*</span>
              </label>
              <input value={form.Word} onChange={e => set('Word', e.target.value)} placeholder="die Vorstellung" className={inputCls} autoFocus />
            </div>
            <div>
              <label className="block text-xs text-secondary uppercase tracking-wider mb-1.5 font-medium">Level</label>
              <select value={form.Level} onChange={e => set('Level', e.target.value)} className={inputCls}>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-secondary uppercase tracking-wider mb-1.5 font-medium">Literal Meaning</label>
            <input value={form['Literal Meaning']} onChange={e => set('Literal Meaning', e.target.value)} placeholder="the presentation / the imagining" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs text-secondary uppercase tracking-wider mb-1.5 font-medium">Intended Meaning</label>
            <input value={form['Intended Meaning']} onChange={e => set('Intended Meaning', e.target.value)} placeholder="concept, idea, performance" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-secondary uppercase tracking-wider mb-1.5 font-medium">Part of Speech</label>
              <input value={form['Part of Speech']} onChange={e => set('Part of Speech', e.target.value)} placeholder="Noun (f.)" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-secondary uppercase tracking-wider mb-1.5 font-medium">Source</label>
              <input value={form.Source} onChange={e => set('Source', e.target.value)} placeholder="Der Spiegel" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-secondary uppercase tracking-wider mb-1.5 font-medium">Case Examples</label>
            <p className="text-xs text-warm-700 -mt-1 mb-1.5">Separate examples with &lt;br&gt;</p>
            <textarea value={form['Case Examples']} onChange={e => set('Case Examples', e.target.value)} rows={2}
              placeholder="Ich habe keine Vorstellung davon.<br>Die Vorstellung beginnt um 20 Uhr."
              className={`${inputCls} resize-none`} />
          </div>

          <GermanKeyboard className="justify-end" />

          {err && <p className="text-accent-red text-sm">{err}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-secondary hover:text-primary">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg text-sm font-semibold bg-accent-gold text-primary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving…' : 'Add Word'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Vocabulary() {
  const toast = useToast()

  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showAnki,  setShowAnki]  = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    api.getVocabulary()
      .then(data => { setRows(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function handleUpdate(idx, data) {
    try {
      await api.updateVocabulary(idx, data)
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...data } : r))
      toast.success('Saved')
    } catch (e) {
      toast.error('Update failed: ' + e.message)
    }
  }

  async function handleDelete(idx) {
    try {
      await api.deleteVocabulary(idx)
      setRows(prev => prev.filter((_, i) => i !== idx))
      toast.success('Deleted')
    } catch (e) {
      toast.error('Delete failed: ' + e.message)
    }
  }

  async function handleAdd(data) {
    const added = await api.addVocabulary(data)
    setRows(prev => [...prev, ...(Array.isArray(added) ? added : [added])])
    toast.success('Word added')
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary mb-1">Vocabulary</h1>
          <p className="text-secondary text-sm font-sans">
            {loading ? 'Loading…' : error ? 'Failed to load' : `${rows.length} word${rows.length !== 1 ? 's' : ''} saved`}
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
            Add Word
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-6 bg-accent-red/10 border border-accent-red/30 rounded-xl text-accent-red text-sm font-sans flex items-center justify-between gap-4">
          <span>Failed to load vocabulary: {error}</span>
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
          expandKey="Case Examples"
          levelKey="Level"
          loading={loading}
        />
      )}

      {showModal && <AddModal onClose={() => setShowModal(false)} onSave={handleAdd} />}
      {showAnki  && (
        <AnkiExportModal
          vocabRows={rows}
          onClose={() => setShowAnki(false)}
          onSuccess={() => { setShowAnki(false); toast.success('Anki deck downloaded') }}
        />
      )}
    </div>
  )
}
