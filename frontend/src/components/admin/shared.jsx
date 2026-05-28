import { useState, useEffect } from 'react'

// ── Responsive hook ───────────────────────────────────────────
export function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

// Local color constants for dynamic styles
export const C = {
  bg:     "#04040e",
  card:   "#0b0b1c",
  card2:  "#101022",
  border: "#ffffff10",
  green:  "#00E5A0",
  yellow: "#FFD166",
  orange: "#FF9F1C",
  red:    "#FF6B6B",
  blue:   "#7B9CFF",
  text:   "#eeeeff",
  muted:  "#6868a0",
}

const BASE_URL = import.meta.env.VITE_API_URL || 'https://eduvyai-api.onrender.com'

export const API = (path, opts = {}) => {
  const token = localStorage.getItem('eduvyai_admin_token')
  return fetch(`${BASE_URL}/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    signal: opts.signal || AbortSignal.timeout(15000),
  })
}

// ─── Reusable Tailwind classes ────────────────────────────────
export const inputClass = "w-full bg-app-card2 border border-white/10 rounded-xl py-2.5 px-3.5 text-app-text text-[13px] font-[Sora,sans-serif] outline-none focus:ring-1 focus:ring-app-green/40 transition-all duration-150"

export const btnClass = (color = 'green') => `border-none rounded-xl py-2 px-4 text-[13px] font-bold font-[Sora,sans-serif] cursor-pointer transition-all duration-150 active:scale-95 hover:opacity-90 ${
  color === 'green'  ? 'bg-app-green text-app-bg' :
  color === 'red'    ? 'bg-app-red text-white' :
  color === 'blue'   ? 'bg-app-blue text-app-bg' :
  color === 'yellow' ? 'bg-app-yellow text-app-bg' : 'bg-app-green text-app-bg'
}`

export const ghostBtnClass = "bg-transparent border border-app-border rounded-xl py-2 px-4 text-app-text text-[13px] font-semibold font-[Sora,sans-serif] cursor-pointer hover:bg-white/5 active:scale-95 transition-all duration-150"

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ title, onClose, children }) {
  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-app-card border border-app-border rounded-t-[22px] sm:rounded-[18px] p-5 sm:p-7 w-full sm:max-w-[480px] flex flex-col gap-4 shadow-2xl max-h-[92dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-app-text m-0 text-[17px] font-extrabold">{title}</h3>
          <button onClick={onClose} className="bg-transparent border-none text-app-muted text-xl cursor-pointer leading-none px-1 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-white/5">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────
export function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-app-card border border-app-border rounded-t-[22px] sm:rounded-[18px] p-5 sm:p-7 w-full sm:max-w-[400px] flex flex-col gap-5 shadow-2xl max-h-[80dvh] overflow-y-auto">
        <div>
          <div className="text-[28px] mb-2">⚠️</div>
          <p className="text-app-text m-0 text-[15px] leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2.5">
          <button className={btnClass('red')} onClick={onConfirm}>Yes, Delete</button>
          <button className={ghostBtnClass} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────
export function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 py-2.5 px-5 rounded-[10px] text-[13px] font-bold z-[9999] shadow-xl text-app-bg"
      style={{ background: type === "error" ? C.red : C.green }}
    >{msg}</div>
  )
}

// ── Loading Overlay ───────────────────────────────────────────
export function LoadingOverlay({ show, text = "Loading…" }) {
  if (!show) return null
  return (
    <div className="absolute inset-0 bg-app-bg/70 rounded-2xl flex items-center justify-center z-10">
      <div className="flex items-center gap-2 bg-app-card2 py-3 px-5 rounded-xl border border-app-border">
        <span className="animate-spin text-lg">⏳</span>
        <span className="text-app-muted text-sm">{text}</span>
      </div>
    </div>
  )
}

// ── Table component ───────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export function Table({ cols, rows, onDelete, onEdit, pageSize: defaultPageSize = 10, selectedIds, onSelectChange }) {
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  useEffect(() => { setPage(1) }, [rows.length])

  if (!rows.length) return (
    <p className="text-app-muted text-[13px] my-3">No entries yet.</p>
  )

  const totalPages = Math.ceil(rows.length / pageSize)
  const start      = (page - 1) * pageSize
  const pageRows   = rows.slice(start, start + pageSize)

  // Checkbox helpers
  const selectable = !!onSelectChange
  const pageIds = pageRows.map(r => r.id)
  const allPageSelected = selectable && pageIds.length > 0 && pageIds.every(id => selectedIds?.has(id))
  const somePageSelected = selectable && pageIds.some(id => selectedIds?.has(id))

  const toggleRow = (id) => {
    if (!onSelectChange) return
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectChange(next)
  }

  const togglePage = () => {
    if (!onSelectChange) return
    const next = new Set(selectedIds)
    if (allPageSelected) pageIds.forEach(id => next.delete(id))
    else pageIds.forEach(id => next.add(id))
    onSelectChange(next)
  }

  const pageNums = []
  const delta = 2
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - delta && p <= page + delta)) {
      pageNums.push(p)
    }
  }
  const pageButtons = []
  let prev = null
  for (const p of pageNums) {
    if (prev !== null && p - prev > 1) pageButtons.push("…")
    pageButtons.push(p)
    prev = p
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {selectable && (
                <th className="py-2 px-2.5 border-b border-app-border w-[36px]">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                    onChange={togglePage}
                    className="cursor-pointer accent-app-green"
                  />
                </th>
              )}
              {cols.map(c => (
                <th key={c.key} className="text-left py-2 px-2.5 border-b border-app-border text-app-muted font-semibold text-[11px] whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="py-2 px-2.5 border-b border-app-border w-[90px]" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => {
              const isChecked = selectable && selectedIds?.has(row.id)
              return (
                <tr key={row.id ?? i} className={`border-b border-app-border ${isChecked ? 'bg-app-blue/10' : ''}`}>
                  {selectable && (
                    <td className="py-2.5 px-2.5">
                      <input
                        type="checkbox"
                        checked={!!isChecked}
                        onChange={() => toggleRow(row.id)}
                        className="cursor-pointer accent-app-green"
                      />
                    </td>
                  )}
                  {cols.map(c => (
                    <td key={c.key} className="py-2.5 px-2.5 text-app-text max-w-[260px]">
                      {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? "")}
                    </td>
                  ))}
                  <td className="py-2.5 px-2.5">
                    <div className="flex gap-1.5">
                      {onEdit && (
                        <button className={`${ghostBtnClass} py-1 px-2.5 text-xs`}
                          onClick={() => onEdit(row)}>Edit</button>
                      )}
                      {onDelete && (
                        <button className={`${btnClass('red')} py-1 px-2.5 text-xs`}
                          onClick={() => onDelete(row)}>✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-app-muted">
            {start + 1}–{Math.min(start + pageSize, rows.length)} of {rows.length}
          </span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="bg-app-card2 border border-app-border rounded-[7px] py-1 px-2 text-app-muted text-xs font-[Sora,sans-serif] cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map(n => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`${ghostBtnClass} py-1 px-3 text-sm shrink-0 ${page === 1 ? 'opacity-35' : ''}`}
          >‹</button>

          {pageButtons.map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="text-app-muted text-[13px] px-1 shrink-0">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`py-1 px-2.5 text-xs rounded-[7px] cursor-pointer font-[Sora,sans-serif] shrink-0 min-w-[32px] ${
                  p === page 
                    ? 'bg-app-green text-app-bg font-bold border-none' 
                    : 'bg-transparent text-app-muted font-medium border border-app-border'
                }`}
              >{p}</button>
            )
          )}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`${ghostBtnClass} py-1 px-3 text-sm shrink-0 ${page === totalPages ? 'opacity-35' : ''}`}
          >›</button>
        </div>
      </div>
    </div>
  )
}
