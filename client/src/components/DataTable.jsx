/**
 * DataTable — a sortable, filterable, inline-editable Markdown-backed data table.
 *
 * Props:
 *   columns   {Array}   — column definitions:
 *     { key: string, label: string, sortable?: boolean, editable?: boolean,
 *       render?: (value, row) => ReactNode, options?: string[], className?: string, textClass?: string }
 *   rows      {object[]} — data rows (keys match column `key` values)
 *   onUpdate  {(rowIndex: number, patch: object) => void} — called when an inline edit is committed
 *   onDelete  {(rowIndex: number) => void}                — called after delete confirmation
 *   expandKey {string?}  — if set, rows with a value at this key get an expand toggle
 *                          that shows the cell content split on "<br>" as a list
 *   levelKey  {string}   — column key used for the CEFR level filter pills (default: "Level")
 *   loading   {boolean}  — shows a pulsing placeholder while true
 *
 * Features:
 *   - Client-side search across all column values
 *   - CEFR level filter pills (A1-C2), shown only when any row has the levelKey column
 *   - Click column header to sort ascending/descending
 *   - Click an editable cell to open an inline input (or <select> if options provided)
 *   - Enter to commit, Escape to cancel
 *   - Hover row to reveal delete button; requires a second click to confirm
 *   - Expandable row detail for the expandKey column (splits on "<br>")
 */
import { useState, useMemo, useRef, useEffect, Fragment } from 'react'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function SortIcon({ dir }) {
  if (!dir) return <span className="ml-1 text-warm-600">⇅</span>
  return <span className="ml-1 text-accent-gold">{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function DataTable({
  columns,
  rows,
  onUpdate,
  onDelete,
  expandKey,
  levelKey = 'Level',
  loading = false,
}) {
  const [search, setSearch]           = useState('')
  const [levelFilter, setLevelFilter] = useState(null)
  const [sort, setSort]               = useState({ key: null, dir: 'asc' })
  const [editCell, setEditCell]       = useState(null)
  const [editVal, setEditVal]         = useState('')
  const [confirmDel, setConfirmDel]   = useState(null)
  const [expanded, setExpanded]       = useState(new Set())
  const inputRef = useRef(null)

  useEffect(() => {
    if (editCell && inputRef.current) inputRef.current.focus()
  }, [editCell])

  const processed = useMemo(() => {
    let result = rows.map((r, i) => ({ ...r, _oi: i }))

    if (search) {
      const s = search.toLowerCase()
      result = result.filter(r =>
        Object.entries(r)
          .filter(([k]) => k !== '_oi')
          .some(([, v]) => String(v).toLowerCase().includes(s))
      )
    }

    if (levelFilter && levelKey) {
      result = result.filter(r => r[levelKey] === levelFilter)
    }

    if (sort.key) {
      result = [...result].sort((a, b) => {
        const av = String(a[sort.key] || '').toLowerCase()
        const bv = String(b[sort.key] || '').toLowerCase()
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }

    return result
  }, [rows, search, levelFilter, sort, levelKey])

  function toggleSort(key) {
    setSort(s => s.key === key
      ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' }
    )
  }

  function startEdit(rowIdx, colKey, currentVal) {
    setEditCell({ rowIdx, colKey })
    setEditVal(currentVal ?? '')
  }

  function commitEdit() {
    if (!editCell) return
    const orig = String(rows[editCell.rowIdx]?.[editCell.colKey] ?? '')
    if (editVal !== orig) {
      onUpdate?.(editCell.rowIdx, { [editCell.colKey]: editVal })
    }
    setEditCell(null)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter')  { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') setEditCell(null)
  }

  function toggleExpand(oi) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(oi) ? next.delete(oi) : next.add(oi)
      return next
    })
  }

  const hasLevelFilter = levelKey && rows.some(r => r[levelKey])
  const totalCols = columns.length + (expandKey ? 2 : 1)

  const inputCls = 'bg-tertiary border border-warm-700 rounded-lg px-2 py-1 text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-gold/40 focus:border-accent-gold/60 w-full'

  return (
    <div>
      {/* ── Controls ── */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <div className="relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="bg-secondary border border-warm-700 rounded-lg pl-9 pr-4 py-2 text-primary placeholder-warm-600 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-accent-gold/40 focus:border-accent-gold/60 w-64"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-500 text-base select-none">⌕</span>
        </div>

        {hasLevelFilter && (
          <div className="flex gap-1.5 flex-wrap">
            {LEVELS.map(l => (
              <button
                key={l}
                onClick={() => setLevelFilter(lf => lf === l ? null : l)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  levelFilter === l
                    ? 'bg-accent-gold text-primary'
                    : 'bg-tertiary text-secondary hover:text-primary hover:bg-warm-700'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {(search || levelFilter) && (
          <button
            onClick={() => { setSearch(''); setLevelFilter(null) }}
            className="text-xs text-warm-600 hover:text-secondary transition-colors ml-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-secondary rounded-xl border border-warm-800 overflow-hidden">
        {loading ? (
          <div className="px-6 py-16 text-center text-warm-600 font-sans text-sm animate-pulse">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-warm-500 font-sans text-sm">No entries yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-warm-800">
                  {expandKey && <th className="w-8 px-3 py-3" />}
                  {columns.map(col => (
                    <th
                      key={col.key}
                      onClick={() => col.sortable && toggleSort(col.key)}
                      className={`text-left px-4 py-3 text-xs text-warm-500 uppercase tracking-wider font-medium whitespace-nowrap select-none ${
                        col.sortable ? 'cursor-pointer hover:text-warm-300 transition-colors' : ''
                      }`}
                    >
                      {col.label}
                      {col.sortable && <SortIcon dir={sort.key === col.key ? sort.dir : null} />}
                    </th>
                  ))}
                  <th className="w-28 px-3 py-3" />
                </tr>
              </thead>

              <tbody>
                {processed.length === 0 && (
                  <tr>
                    <td colSpan={totalCols} className="px-4 py-16 text-center text-warm-600 font-sans">
                      No entries match your search.
                    </td>
                  </tr>
                )}

                {processed.map(row => {
                  const oi         = row._oi
                  const isExpanded = expanded.has(oi)
                  const isDeleting = confirmDel === oi

                  return (
                    <Fragment key={oi}>
                      <tr className={`border-b border-warm-800/50 group ${
                        isDeleting ? 'bg-accent-red/5' : 'hover:bg-tertiary/50'
                      }`}>
                        {expandKey && (
                          <td className="px-3 py-3 w-8">
                            {row[expandKey] ? (
                              <button
                                onClick={() => toggleExpand(oi)}
                                className="text-warm-600 hover:text-accent-gold w-4 h-4 flex items-center justify-center text-xs"
                              >
                                {isExpanded ? '▾' : '▸'}
                              </button>
                            ) : null}
                          </td>
                        )}

                        {columns.map(col => {
                          const isEditing = editCell?.rowIdx === oi && editCell?.colKey === col.key
                          const val = row[col.key] ?? ''

                          return (
                            <td
                              key={col.key}
                              onClick={() => col.editable && !isEditing && startEdit(oi, col.key, val)}
                              className={`px-4 py-3 ${col.editable ? 'cursor-pointer' : ''} ${col.className || ''}`}
                            >
                              {isEditing ? (
                                col.options ? (
                                  <select
                                    ref={inputRef}
                                    value={editVal}
                                    onChange={e => setEditVal(e.target.value)}
                                    onBlur={commitEdit}
                                    onKeyDown={handleKeyDown}
                                    className={inputCls}
                                  >
                                    {col.options.map(o => (
                                      <option key={o} value={o}>{o}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    ref={inputRef}
                                    value={editVal}
                                    onChange={e => setEditVal(e.target.value)}
                                    onBlur={commitEdit}
                                    onKeyDown={handleKeyDown}
                                    className={`${inputCls} min-w-[8rem]`}
                                  />
                                )
                              ) : col.render ? (
                                col.render(val, row)
                              ) : (
                                <span className={col.textClass || 'text-warm-300'}>{val}</span>
                              )}
                            </td>
                          )
                        })}

                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          {isDeleting ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-xs text-secondary mr-0.5">Delete?</span>
                              <button
                                onClick={() => { onDelete?.(oi); setConfirmDel(null) }}
                                className="text-xs px-2 py-1 rounded bg-accent-red hover:brightness-110 text-white"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmDel(null)}
                                className="text-xs px-2 py-1 rounded bg-tertiary hover:bg-warm-700 text-warm-300"
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDel(oi)}
                              title="Delete"
                              className="text-warm-700 hover:text-accent-red opacity-0 group-hover:opacity-100 text-base leading-none px-1"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>

                      {expandKey && isExpanded && row[expandKey] && (
                        <tr className="border-b border-warm-800/50 bg-primary/30">
                          <td />
                          <td colSpan={columns.length + 1} className="px-4 py-4">
                            <p className="text-[10px] text-warm-600 uppercase tracking-widest mb-2 font-medium">
                              {expandKey}
                            </p>
                            <div className="space-y-1">
                              {String(row[expandKey]).split('<br>').map((ex, i) => (
                                <p key={i} className="text-warm-400 text-xs leading-relaxed">
                                  {ex.trim()}
                                </p>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && rows.length > 0 && (
        <p className="text-xs text-warm-700 font-sans mt-3 px-1">
          {processed.length === rows.length
            ? `${rows.length} entries`
            : `${processed.length} of ${rows.length} entries`}
        </p>
      )}
    </div>
  )
}
