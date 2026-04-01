import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api.js'
import { useToast } from '../components/Toast.jsx'

// ── Schema definitions ────────────────────────────────────────────
const VOCAB_FIELDS  = ['Word', 'Literal Meaning', 'Intended Meaning', 'Part of Speech', 'Case Examples', 'Level', 'Source', 'Date Added']
const PHRASE_FIELDS = ['Phrase', 'English Meaning', 'Level', 'Source', 'Date Added']

// ── Step indicator ────────────────────────────────────────────────
function StepIndicator({ current, steps }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {steps.map((label, i) => {
        const num    = i + 1
        const active = num === current
        const done   = num < current
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  border-2 transition-all duration-200
                  ${done   ? 'bg-accent-gold border-accent-gold text-primary'  : ''}
                  ${active ? 'bg-accent-gold/10 border-accent-gold text-accent-gold' : ''}
                  ${!done && !active ? 'bg-tertiary border-warm-700 text-warm-600' : ''}
                `}
              >
                {done ? '✓' : num}
              </div>
              <span className={`text-[10px] mt-1 font-sans whitespace-nowrap ${active ? 'text-accent-gold' : done ? 'text-warm-400' : 'text-warm-700'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 h-px mx-1 mb-4 ${done ? 'bg-accent-gold/50' : 'bg-warm-800'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Upload ─────────────────────────────────────────────────
function UploadStep({ onFile, error }) {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleChange(e) {
    const file = e.target.files[0]
    if (file) onFile(file)
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-primary mb-2">Upload File</h2>
      <p className="text-secondary text-sm font-sans mb-8">
        CSV, TSV, or TXT export from Notion, Anki, Excel, or any spreadsheet.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer
          transition-all duration-200 select-none
          ${dragging
            ? 'border-accent-gold bg-accent-gold/5'
            : 'border-warm-700 bg-tertiary hover:border-accent-gold hover:bg-accent-gold/5'
          }
        `}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          <svg
            className={`w-14 h-14 transition-colors ${dragging ? 'text-accent-gold' : 'text-warm-700'}`}
            fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <div>
            <p className={`font-semibold font-sans mb-1 ${dragging ? 'text-accent-gold' : 'text-secondary'}`}>
              {dragging ? 'Drop to upload' : 'Drag & drop your file here'}
            </p>
            <p className="text-secondary text-sm font-sans">or click to browse — CSV, TSV up to 5 MB</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-accent-red text-sm font-sans">{error}</p>
      )}

      <div className="mt-6 p-4 bg-secondary border border-warm-800 rounded-xl">
        <p className="text-secondary text-xs font-sans font-semibold mb-2 uppercase tracking-wider">Notion export tips</p>
        <ul className="text-secondary text-xs font-sans space-y-1 list-disc list-inside">
          <li>Export the database as CSV from Notion's ··· menu → Export</li>
          <li>Multi-select columns are handled automatically</li>
          <li>Date columns are normalized to YYYY-MM-DD</li>
          <li>Column names are matched fuzzily (e.g. "Wort" → Word)</li>
        </ul>
      </div>
    </div>
  )
}

// ── Step 2: Column mapping ─────────────────────────────────────────
function MappingStep({ headers, vocabMapping, phraseMapping, preview, target, onMappingChange }) {
  const schemaFields = target === 'vocabulary' ? VOCAB_FIELDS : PHRASE_FIELDS
  const initialMapping = headers.map((h, i) => ({
    raw:    h,
    schema: vocabMapping[i] || phraseMapping[i] || '',
  }))

  const [mapping, setMapping] = useState(initialMapping)

  function setSchema(idx, val) {
    const next = mapping.map((m, i) => i === idx ? { ...m, schema: val } : m)
    setMapping(next)
    onMappingChange(next)
  }

  // Notify parent on mount
  useState(() => { onMappingChange(initialMapping) })

  const previewCols = headers.slice(0, 6)

  return (
    <div>
      <h2 className="font-display text-2xl text-primary mb-2">Map Columns</h2>
      <p className="text-secondary text-sm font-sans mb-8">
        Match your file's columns to the database schema. Auto-detected mappings are pre-filled.
      </p>

      <div className="bg-secondary border border-warm-800 rounded-xl overflow-hidden mb-8">
        <div className="grid grid-cols-2 gap-0 divide-y divide-warm-800">
          <div className="px-4 py-2 text-xs text-warm-500 uppercase tracking-wider bg-tertiary/50 font-medium">Your column</div>
          <div className="px-4 py-2 text-xs text-warm-500 uppercase tracking-wider bg-tertiary/50 font-medium">Maps to</div>

          {mapping.map((m, i) => (
            <div key={i} className="contents">
              <div className="px-4 py-3 text-sm font-sans text-primary border-r border-warm-800 flex items-center">
                <span className="font-medium">{m.raw}</span>
                {!m.schema && (
                  <span className="ml-2 text-[10px] bg-accent-red/10 text-accent-red border border-accent-red/30 rounded px-1.5 py-0.5">unmapped</span>
                )}
              </div>
              <div className="px-4 py-2.5 flex items-center">
                <select
                  value={m.schema}
                  onChange={e => setSchema(i, e.target.value)}
                  className="w-full bg-tertiary border border-warm-700 rounded-lg px-3 py-1.5 text-sm font-sans text-primary focus:outline-none focus:ring-2 focus:ring-accent-gold/40 focus:border-accent-gold/60"
                >
                  <option value="">— skip —</option>
                  {schemaFields.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview table */}
      <p className="text-xs text-secondary uppercase tracking-wider mb-3 font-medium">Preview (first 5 rows)</p>
      <div className="bg-secondary border border-warm-800 rounded-xl overflow-hidden overflow-x-auto">
        <table className="text-xs font-sans w-full">
          <thead>
            <tr className="border-b border-warm-800">
              {previewCols.map(h => (
                <th key={h} className="px-3 py-2 text-left text-warm-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.slice(0, 5).map((row, i) => (
              <tr key={i} className="border-b border-warm-800/50 hover:bg-tertiary/30">
                {previewCols.map(h => (
                  <td key={h} className="px-3 py-2 text-warm-300 max-w-[12rem] truncate" title={row[h]}>{row[h] || '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Step 3: Target database ────────────────────────────────────────
function TargetStep({ target, onTargetChange }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-primary mb-2">Choose Target</h2>
      <p className="text-secondary text-sm font-sans mb-8">
        Which database should these entries be imported into?
      </p>

      <div className="grid grid-cols-2 gap-4">
        {[
          {
            id: 'vocabulary',
            label: 'Vocabulary',
            desc: 'Words with meanings, part of speech, and case examples',
            icon: '⬡',
            fields: VOCAB_FIELDS,
          },
          {
            id: 'phrases',
            label: 'Phrases',
            desc: 'Full phrases and sentences with English translations',
            icon: '❝',
            fields: PHRASE_FIELDS,
          },
        ].map(({ id, label, desc, icon, fields }) => (
          <button
            key={id}
            onClick={() => onTargetChange(id)}
            className={`
              p-6 rounded-2xl border-2 text-left transition-all duration-150
              ${target === id
                ? 'border-accent-gold bg-accent-gold/5'
                : 'border-warm-800 bg-secondary hover:border-warm-600'
              }
            `}
          >
            <span className={`text-3xl mb-4 block ${target === id ? 'text-accent-gold' : 'text-warm-600'}`}>{icon}</span>
            <p className={`font-semibold font-sans mb-1 ${target === id ? 'text-accent-gold' : 'text-primary'}`}>{label}</p>
            <p className="text-secondary text-xs font-sans mb-4">{desc}</p>
            <div className="flex flex-wrap gap-1">
              {fields.map(f => (
                <span key={f} className="text-[10px] bg-tertiary text-warm-500 rounded px-1.5 py-0.5">{f}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step 4: Confirm ────────────────────────────────────────────────
function ConfirmStep({ totalRows, previewCount, target, filename, loading, onConfirm, error }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-primary mb-2">Confirm Import</h2>
      <p className="text-secondary text-sm font-sans mb-8">
        Review the details before committing to the database.
      </p>

      <div className="bg-secondary border border-warm-800 rounded-2xl p-6 mb-8 space-y-4">
        <div className="flex items-start justify-between">
          <span className="text-secondary text-sm font-sans">File</span>
          <span className="text-primary text-sm font-sans font-medium">{filename}</span>
        </div>
        <div className="flex items-start justify-between">
          <span className="text-secondary text-sm font-sans">Target database</span>
          <span className="capitalize px-2.5 py-0.5 bg-accent-gold/10 text-accent-gold rounded text-xs font-semibold">
            {target}
          </span>
        </div>
        <div className="flex items-start justify-between border-t border-warm-800 pt-4">
          <span className="text-secondary text-sm font-sans">Total rows</span>
          <span className="text-primary text-sm font-semibold font-sans">{totalRows}</span>
        </div>
        <div className="flex items-start justify-between">
          <span className="text-secondary text-sm font-sans">Mapped columns</span>
          <span className="text-primary text-sm font-semibold font-sans">{previewCount}</span>
        </div>
      </div>

      <p className="text-warm-600 text-xs font-sans mb-6">
        Duplicate entries (matched by primary key) will be automatically skipped.
      </p>

      {error && (
        <p className="mb-4 text-accent-red text-sm font-sans">{error}</p>
      )}

      <button
        onClick={onConfirm}
        disabled={loading}
        className="w-full py-3 bg-accent-gold text-primary font-semibold rounded-xl text-sm font-sans hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />}
        {loading ? 'Importing…' : 'Import Now'}
      </button>
    </div>
  )
}

// ── Step 5: Success ────────────────────────────────────────────────
function SuccessStep({ result, target }) {
  return (
    <div className="text-center py-8">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ backgroundColor: 'rgba(212,168,67,0.12)', border: '2px solid rgba(212,168,67,0.4)' }}
      >
        <svg className="w-8 h-8 text-accent-gold" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 className="font-display text-2xl text-primary mb-2">Import Complete</h2>
      <p className="text-secondary text-sm font-sans mb-10">Your entries have been added to the database.</p>

      <div className="flex justify-center gap-4 mb-10">
        <div className="bg-secondary border border-warm-800 rounded-xl px-6 py-4 text-center">
          <p className="font-display text-4xl text-accent-gold mb-1">{result.added}</p>
          <p className="text-secondary text-xs font-sans uppercase tracking-wider">Added</p>
        </div>
        {result.duplicatesSkipped > 0 && (
          <div className="bg-secondary border border-warm-800 rounded-xl px-6 py-4 text-center">
            <p className="font-display text-4xl text-warm-500 mb-1">{result.duplicatesSkipped}</p>
            <p className="text-secondary text-xs font-sans uppercase tracking-wider">Skipped (dupes)</p>
          </div>
        )}
        {result.errors > 0 && (
          <div className="bg-secondary border border-accent-red/30 rounded-xl px-6 py-4 text-center">
            <p className="font-display text-4xl text-accent-red mb-1">{result.errors}</p>
            <p className="text-secondary text-xs font-sans uppercase tracking-wider">Errors</p>
          </div>
        )}
      </div>

      <Link
        to={`/${target}`}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent-gold text-primary font-semibold rounded-xl text-sm font-sans hover:brightness-110"
      >
        View {target === 'vocabulary' ? 'Vocabulary' : 'Phrases'} →
      </Link>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
const STEPS = ['Upload', 'Map Columns', 'Target', 'Confirm', 'Done']

export default function Import() {
  const toast = useToast()

  const [step,     setStep]     = useState(1)
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(null)  // server response from /api/import/csv
  const [mapping,  setMapping]  = useState([])
  const [target,   setTarget]   = useState('vocabulary')
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function handleFile(f) {
    setFile(f)
    setError(null)
    setLoading(true)
    try {
      const data = await api.importCsv(f)
      setPreview(data)
      setStep(2)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.importConfirm({
        data:    preview.data,
        mapping: mapping.filter(m => m.schema),
        target,
      })
      setResult(res)
      setStep(5)
      toast.success(`Imported ${res.added} entries`)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function canNext() {
    if (step === 1) return false // file upload triggers advance automatically
    if (step === 2) return mapping.some(m => m.schema)
    if (step === 3) return !!target
    return true
  }

  function goNext() {
    if (step === 4) { handleConfirm(); return }
    setStep(s => Math.min(s + 1, 5))
  }

  function goBack() {
    setError(null)
    setStep(s => Math.max(s - 1, 1))
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-primary mb-1">Bulk Import</h1>
        <p className="text-secondary text-sm font-sans">Import vocabulary or phrases from CSV, TSV, or Notion exports</p>
      </div>

      <StepIndicator current={step} steps={STEPS} />

      <div className="bg-secondary border border-warm-800 rounded-2xl p-8">
        {step === 1 && (
          <UploadStep onFile={handleFile} error={loading ? null : error} />
        )}

        {step === 2 && preview && (
          <MappingStep
            headers={preview.headers}
            vocabMapping={preview.vocabMapping}
            phraseMapping={preview.phraseMapping}
            preview={preview.preview}
            target={target}
            onMappingChange={setMapping}
          />
        )}

        {step === 3 && (
          <TargetStep target={target} onTargetChange={setTarget} />
        )}

        {step === 4 && preview && (
          <ConfirmStep
            totalRows={preview.totalRows}
            previewCount={mapping.filter(m => m.schema).length}
            target={target}
            filename={file?.name || ''}
            loading={loading}
            onConfirm={handleConfirm}
            error={error}
          />
        )}

        {step === 5 && result && (
          <SuccessStep result={result} target={target} />
        )}

        {step > 1 && step < 5 && (
          <div className="flex justify-between mt-8 pt-6 border-t border-warm-800">
            <button
              onClick={goBack}
              disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-secondary hover:text-primary font-sans disabled:opacity-40"
            >
              ← Back
            </button>
            {step < 4 && (
              <button
                onClick={goNext}
                disabled={!canNext() || loading}
                className="px-6 py-2 rounded-xl text-sm font-semibold bg-accent-gold text-primary hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed font-sans"
              >
                Next →
              </button>
            )}
          </div>
        )}

        {/* Loading overlay for step 1 */}
        {step === 1 && loading && (
          <div className="flex items-center gap-3 mt-6 text-secondary text-sm font-sans">
            <span className="w-4 h-4 border-2 border-warm-700 border-t-accent-gold rounded-full animate-spin" />
            Parsing file…
          </div>
        )}
      </div>
    </div>
  )
}
