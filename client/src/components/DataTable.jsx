import { useState, useMemo, useRef, useEffect, Fragment } from 'react'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function SortIcon({ dir }) {
  if (!dir) return <span className="ml-1 text-stone-700">⇅</span>
  return <span className="ml-1 text-yellow-400">{dir === 'asc' ? '↑' : '↓'}</span>
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
  const [search, setSearch]         = useState('')
  const [levelFilter, setLevelFilter] = useState(null)
  const [sort, setSort]             = useState({ key: null, dir: 'asc' })
  const [editCell, setEditCell]     = useState(null)   // { rowIdx, colKey }
  const [editVal, setEditVal]       = useState('')
  const [confirmDel, setConfirmDel] = useState(null)   // original index
  const [expanded, setExpanded]     = useState(new Set())
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

  return (
    <div>
      {/* ── Controls ── */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <div className="relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="bg-stone-900 border border-stone-700 rounded-lg pl-9 pr-4 py-2 text-stone-100 placeholder-stone-600 text-sm font-sans focus:outline-none focus:border-yellow-500/60 transition-colors w-64"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600 text-base select-none">⌕</span>
        </div>

        {hasLevelFilter && (
          <div className="flex gap-1.5 flex-wrap">
            {LEVELS.map(l => (
              <button
                key={l}
                onClick={() => setLevelFilter(lf => lf === l ? null : l)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  levelFilter === l
                    ? 'bg-yellow-400 text-stone-900'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-700'
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
            className="text-xs text-stone-600 hover:text-stone-400 transition-colors ml-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
        {loading ? (
          <div className="px-6 py-16 text-center text-stone-600 font-sans text-sm animate-pulse">
            Loading…
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-stone-800">
                  {expandKey && <th className="w-8 px-3 py-3" />}
                  {columns.map(col => (
                    <th
                      key={col.key}
                      onClick={() => col.sortable && toggleSort(col.key)}
                      className={`text-left px-4 py-3 text-xs text-stone-500 uppercase tracking-wider font-medium whitespace-nowrap select-none ${
                        col.sortable ? 'cursor-pointer hover:text-stone-300 transition-colors' : ''
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
                    <td colSpan={totalCols} className="px-4 py-16 text-center text-stone-600 font-sans">
                      No entries found.
                    </td>
                  </tr>
                )}

                {processed.map(row => {
                  const oi         = row._oi
                  const isExpanded = expanded.has(oi)
                  const isDeleting = confirmDel === oi

                  return (
                    <Fragment key={oi}>
                      <tr className={`border-b border-stone-800/50 transition-colors group ${
                        isDeleting ? 'bg-red-950/20' : 'hover:bg-stone-800/30'
                      }`}>
                        {/* Expand toggle */}
                        {expandKey && (
                          <td className="px-3 py-3 w-8">
                            {row[expandKey] ? (
                              <button
                                onClick={() => toggleExpand(oi)}
                                className="text-stone-600 hover:text-yellow-400 transition-colors w-4 h-4 flex items-center justify-center text-xs"
                              >
                                {isExpanded ? '▾' : '▸'}
                              </button>
                            ) : null}
                          </td>
                        )}

                        {/* Data cells */}
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
                                    className="bg-stone-800 border border-yellow-500/50 rounded px-2 py-1 text-stone-100 text-sm focus:outline-none w-full"
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
                                    className="bg-stone-800 border border-yellow-500/50 rounded px-2 py-1 text-stone-100 text-sm focus:outline-none w-full min-w-[8rem]"
                                  />
                                )
                              ) : col.render ? (
                                col.render(val, row)
                              ) : (
                                <span className={col.textClass || 'text-stone-300'}>{val}</span>
                              )}
                            </td>
                          )
                        })}

                        {/* Actions */}
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          {isDeleting ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-xs text-stone-500 mr-0.5">Delete?</span>
                              <button
                                onClick={() => { onDelete?.(oi); setConfirmDel(null) }}
                                className="text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white transition-colors"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmDel(null)}
                                className="text-xs px-2 py-1 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 transition-colors"
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDel(oi)}
                              title="Delete"
                              className="text-stone-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-base leading-none px-1"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {expandKey && isExpanded && row[expandKey] && (
                        <tr className="border-b border-stone-800/50 bg-stone-950/50">
                          <td />
                          <td colSpan={columns.length + 1} className="px-4 py-4">
                            <p className="text-[10px] text-stone-600 uppercase tracking-widest mb-2 font-medium">
                              {expandKey}
                            </p>
                            <div className="space-y-1">
                              {String(row[expandKey]).split('<br>').map((ex, i) => (
                                <p key={i} className="text-stone-400 text-xs leading-relaxed">
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

      {!loading && processed.length > 0 && (
        <p className="text-xs text-stone-700 font-sans mt-3 px-1">
          {processed.length === rows.length
            ? `${rows.length} entries`
            : `${processed.length} of ${rows.length} entries`}
        </p>
      )}
    </div>
  )
}
