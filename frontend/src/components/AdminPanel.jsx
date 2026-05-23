import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

// ── Responsive hook ───────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

// Local color constants for dynamic styles
const C = {
  bg:     "#04040e",
  card:   "#0b0b1c",
  card2:  "#101022",
  border: "#ffffff10",
  green:  "#00E5A0",
  yellow: "#FFD166",
  red:    "#FF6B6B",
  blue:   "#7B9CFF",
  text:   "#eeeeff",
  muted:  "#6868a0",
}

const API = (path, opts = {}) => {
  const token = localStorage.getItem('eduvyai_admin_token')
  return fetch(`/api${path}`, {
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
const inputClass = "w-full bg-app-card2 border border-white/10 rounded-[9px] py-2.5 px-3 text-app-text text-[13px] font-[Sora,sans-serif] outline-none"
const btnClass = (color = 'green') => `border-none rounded-[9px] py-2 px-4 text-[13px] font-bold font-[Sora,sans-serif] cursor-pointer ${
  color === 'green' ? 'bg-app-green text-app-bg' :
  color === 'red' ? 'bg-app-red text-white' :
  color === 'blue' ? 'bg-app-blue text-app-bg' :
  color === 'yellow' ? 'bg-app-yellow text-app-bg' : 'bg-app-green text-app-bg'
}`
const ghostBtnClass = "bg-transparent border border-app-border rounded-[9px] py-2 px-4 text-app-text text-[13px] font-semibold font-[Sora,sans-serif] cursor-pointer"

// ── Modal ─────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-app-card border border-app-border rounded-[18px] p-7 w-full max-w-[480px] flex flex-col gap-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-app-text m-0 text-[17px] font-extrabold">{title}</h3>
          <button onClick={onClose} className="bg-transparent border-none text-app-muted text-xl cursor-pointer leading-none px-1">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-[1100] flex items-center justify-center p-4">
      <div className="bg-app-card border border-app-border rounded-[18px] p-7 w-full max-w-[400px] flex flex-col gap-5 shadow-2xl">
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
function Toast({ msg, type, onDone }) {
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

// ── Login screen ──────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail]     = useState("")
  const [password, setPass]   = useState("")
  const [err, setErr]         = useState("")
  const [loading, setLoading] = useState(false)
  const [isSetup, setIsSetup] = useState(false)
  const [setupName, setSetupName] = useState("SuperAdmin")

  useEffect(() => {
    fetch('/api/admin/me', { signal: AbortSignal.timeout(3000) }).then(r => {
      if (r.status === 401) setIsSetup(false)
    }).catch(() => {})
  }, [])

  const submit = async () => {
    if (!email || !password) { setErr("Email and password required"); return }
    setLoading(true); setErr("")
    try {
      const endpoint = isSetup ? '/admin/setup' : '/admin/login'
      const body = isSetup ? { email, password, name: setupName } : { email, password }
      const res = await API(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.detail || "Failed"); setLoading(false); return }
      localStorage.setItem('eduvyai_admin_token', data.token)
      onLogin(data)
    } catch (e) {
      setErr(e.message || "Network error")
    }
    setLoading(false)
  }

  return (
    <div className="admin-panel-root bg-app-bg items-center justify-center p-5">
      <div className="bg-app-card border border-app-border rounded-[18px] p-8 w-full max-w-[400px] flex flex-col gap-4">
        <div>
          <div className="text-[28px]">⚙️</div>
          <h2 className="text-app-text my-2 text-[22px] font-extrabold">
            Eduvy-AI Admin
          </h2>
          <p className="text-app-muted text-[13px]">
            {isSetup ? "Create the first superadmin account" : "Sign in to manage curriculum"}
          </p>
        </div>

        {isSetup && (
          <input className={inputClass} placeholder="Your name" value={setupName}
            onChange={e => setSetupName(e.target.value)} />
        )}
        <input className={inputClass} type="email" placeholder="Admin email"
          value={email} onChange={e => setEmail(e.target.value)} />
        <input className={inputClass} type="password" placeholder="Password (min 8 chars)"
          value={password} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()} />

        {err && <p className="text-app-red text-xs m-0">{err}</p>}

        <button className={btnClass('green')} onClick={submit} disabled={loading}>
          {loading ? "Please wait…" : (isSetup ? "Create Admin" : "Login")}
        </button>

        <button className={`${ghostBtnClass} text-xs`} onClick={() => setIsSetup(v => !v)}>
          {isSetup ? "Already have an account? Login" : "First time? Create superadmin"}
        </button>
      </div>
    </div>
  )
}

// ── Table component ───────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function Table({ cols, rows, onDelete, onEdit, pageSize: defaultPageSize = 10 }) {
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  useEffect(() => { setPage(1) }, [rows.length])

  if (!rows.length) return (
    <p className="text-app-muted text-[13px] my-3">No entries yet.</p>
  )

  const totalPages = Math.ceil(rows.length / pageSize)
  const start      = (page - 1) * pageSize
  const pageRows   = rows.slice(start, start + pageSize)

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
              {cols.map(c => (
                <th key={c.key} className="text-left py-2 px-2.5 border-b border-app-border text-app-muted font-semibold text-[11px] whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="py-2 px-2.5 border-b border-app-border w-[90px]" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={row.id ?? i} className="border-b border-app-border">
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
            ))}
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

// ── Boards tab ────────────────────────────────────────────────
function BoardsTab({ toast }) {
  const [boards, setBoards]     = useState([])
  const [search, setSearch]     = useState("")
  const [form, setForm]         = useState({ id: "", name: "", sort_order: 0, is_active: true })
  const [editing, setEditing]   = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [confirmRow, setConfirmRow] = useState(null)
  const [importJson, setImport] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const load = useCallback(() =>
    API('/admin/boards').then(r => r.json()).then(setBoards).catch(() => {}), [])

  useEffect(() => { load() }, [load])

  const filtered = boards.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.id.includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditing(null)
    setForm({ id: "", name: "", sort_order: 0, is_active: true })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.id.trim() || !form.name.trim()) { toast("ID and Name required", "error"); return }
    const method = editing ? 'PUT' : 'POST'
    const path   = editing ? `/admin/boards/${editing.id}` : '/admin/boards'
    const res = await API(path, { method, body: JSON.stringify({
      id: form.id.toLowerCase().trim(),
      name: form.name.trim(),
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    }) })
    if (res.ok) {
      toast(editing ? "Board updated" : "Board created")
      setShowModal(false)
      setEditing(null)
      setForm({ id: "", name: "", sort_order: 0, is_active: true })
      load()
    } else {
      const d = await res.json()
      toast(d.detail || "Error", "error")
    }
  }

  const del = async () => {
    if (!confirmRow) return
    await API(`/admin/boards/${confirmRow.id}`, { method: 'DELETE' })
    toast("Board deactivated"); setConfirmRow(null); load()
  }

  const edit = (row) => {
    setEditing(row)
    setForm({ id: row.id, name: row.name, sort_order: row.sort_order, is_active: row.is_active })
    setShowModal(true)
  }

  const doImport = async () => {
    let parsed
    try { parsed = JSON.parse(importJson) } catch { toast("Invalid JSON", "error"); return }
    if (!Array.isArray(parsed)) { toast("JSON must be an array", "error"); return }
    setImporting(true)
    const res = await API('/admin/boards/import', { method: 'POST', body: JSON.stringify(parsed) })
    const data = await res.json()
    setImportResult(data)
    if (res.ok) { toast(`Imported: ${data.inserted} new, ${data.updated} updated`); load() }
    else toast("Import failed", "error")
    setImporting(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editing ? "Edit Board" : "Add Board"} onClose={() => setShowModal(false)}>
          <div className="grid grid-cols-[1fr_2fr] gap-2.5">
            <input className={inputClass} placeholder="ID slug (e.g. cbse)"
              value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
              disabled={!!editing} />
            <input className={inputClass} placeholder="Display name (e.g. CBSE)"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <input className={`${inputClass} w-[120px] flex-shrink-0`} type="number" placeholder="Sort order"
              value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
            <label className="flex items-center gap-1.5 text-app-muted text-[13px] flex-1">
              <input type="checkbox" checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Active
            </label>
          </div>
          <div className="flex gap-2.5">
            <button className={btnClass('green')} onClick={save}>{editing ? "Update Board" : "Add Board"}</button>
            <button className={ghostBtnClass} onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {confirmRow && (
        <ConfirmDialog
          message={`Deactivate board "${confirmRow.name}"? It will be hidden from students but not permanently deleted.`}
          onConfirm={del}
          onCancel={() => setConfirmRow(null)}
        />
      )}

      {/* Top action bar */}
      <div className="flex gap-2.5 items-center flex-wrap">
        <button className={btnClass('green')} onClick={openAdd}>+ Add Board</button>
      </div>

      {/* Bulk Import */}
      <div className="bg-app-card2 rounded-[14px] p-5 flex flex-col gap-3">
        <h3 className="text-app-text m-0 text-[15px]">Bulk Import (JSON)</h3>
        <p className="text-app-muted text-xs m-0">
          Paste a JSON array: <code className="text-app-yellow">[{`{"id":"cbse","name":"CBSE","sort_order":1}`}, …]</code>
        </p>
        <textarea
          className={`${inputClass} min-h-[120px] resize-y font-mono text-xs`}
          placeholder='[{"id":"cbse","name":"CBSE","sort_order":1},{"id":"icse","name":"ICSE","sort_order":2}]'
          value={importJson}
          onChange={e => setImport(e.target.value)}
        />
        {importResult && (
          <p className={`text-xs m-0 ${importResult.errors?.length ? 'text-app-red' : 'text-app-green'}`}>
            {importResult.inserted} inserted · {importResult.updated} updated · {importResult.errors?.length || 0} errors
            {importResult.errors?.length > 0 && ": " + importResult.errors.map(e => `Row ${e.row}: ${e.error}`).join("; ")}
          </p>
        )}
        <button className={btnClass('blue')} onClick={doImport} disabled={importing}>
          {importing ? "Importing…" : "Import"}
        </button>
      </div>

      {/* Search filter */}
      <div className="flex gap-2.5 items-center flex-wrap">
        <input className={`${inputClass} flex-1 min-w-0`} placeholder="Search by name or ID…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <span className="text-app-muted text-xs whitespace-nowrap">{filtered.length} boards</span>
      </div>

      <Table
        cols={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "sort_order", label: "Order" },
          { key: "is_active", label: "Active", render: v => v ? "✓" : "—" },
        ]}
        rows={filtered}
        onEdit={edit}
        onDelete={row => setConfirmRow(row)}
      />
    </div>
  )
}

// ── Standards tab ─────────────────────────────────────────────
function StandardsTab({ toast }) {
  const [stds, setStds]         = useState([])
  const [search, setSearch]     = useState("")
  const [form, setForm]         = useState({ id: "", name: "", grade_num: "", sort_order: 0, is_active: true })
  const [editing, setEditing]   = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [confirmRow, setConfirmRow] = useState(null)
  const [importJson, setImport] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const load = useCallback(() =>
    API('/admin/standards').then(r => r.json()).then(setStds).catch(() => {}), [])

  useEffect(() => { load() }, [load])

  const filtered = stds.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditing(null)
    setForm({ id: "", name: "", grade_num: "", sort_order: 0, is_active: true })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.id.trim() || !form.name.trim() || form.grade_num === "") {
      toast("All fields required", "error"); return
    }
    const method = editing ? 'PUT' : 'POST'
    const path   = editing ? `/admin/standards/${editing.id}` : '/admin/standards'
    const res = await API(path, { method, body: JSON.stringify({
      id: form.id.toLowerCase().trim(),
      name: form.name.trim(),
      grade_num: Number(form.grade_num),
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    }) })
    if (res.ok) {
      toast(editing ? "Standard updated" : "Standard created")
      setShowModal(false)
      setEditing(null)
      setForm({ id: "", name: "", grade_num: "", sort_order: 0, is_active: true })
      load()
    } else {
      const d = await res.json(); toast(d.detail || "Error", "error")
    }
  }

  const del = async () => {
    if (!confirmRow) return
    await API(`/admin/standards/${confirmRow.id}`, { method: 'DELETE' })
    toast("Standard deactivated"); setConfirmRow(null); load()
  }

  const edit = row => {
    setEditing(row)
    setForm({ id: row.id, name: row.name, grade_num: row.grade_num, sort_order: row.sort_order, is_active: row.is_active })
    setShowModal(true)
  }

  const doImport = async () => {
    let parsed
    try { parsed = JSON.parse(importJson) } catch { toast("Invalid JSON", "error"); return }
    if (!Array.isArray(parsed)) { toast("JSON must be an array", "error"); return }
    setImporting(true)
    const res = await API('/admin/standards/import', { method: 'POST', body: JSON.stringify(parsed) })
    const data = await res.json()
    setImportResult(data)
    if (res.ok) { toast(`Imported: ${data.inserted} new, ${data.updated} updated`); load() }
    else toast("Import failed", "error")
    setImporting(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editing ? "Edit Standard" : "Add Standard"} onClose={() => setShowModal(false)}>
          <div className="grid grid-cols-[1fr_2fr] gap-2.5">
            <input className={inputClass} placeholder="ID (e.g. class-10)"
              value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
              disabled={!!editing} />
            <input className={inputClass} placeholder="Name (e.g. Class 10)"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <input className={`${inputClass} w-[120px] flex-shrink-0`} type="number" placeholder="Grade #"
              value={form.grade_num} onChange={e => setForm(f => ({ ...f, grade_num: e.target.value }))} />
            <input className={`${inputClass} w-[120px] flex-shrink-0`} type="number" placeholder="Sort order"
              value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
            <label className="flex items-center gap-1.5 text-app-muted text-[13px] flex-1">
              <input type="checkbox" checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Active
            </label>
          </div>
          <div className="flex gap-2.5">
            <button className={btnClass('green')} onClick={save}>{editing ? "Update Standard" : "Add Standard"}</button>
            <button className={ghostBtnClass} onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {confirmRow && (
        <ConfirmDialog
          message={`Deactivate standard "${confirmRow.name}"? It will be hidden from students but not permanently deleted.`}
          onConfirm={del}
          onCancel={() => setConfirmRow(null)}
        />
      )}

      {/* Top action bar */}
      <div className="flex gap-2.5 items-center flex-wrap">
        <button className={btnClass('green')} onClick={openAdd}>+ Add Standard</button>
      </div>

      {/* Bulk Import */}
      <div className="bg-app-card2 rounded-[14px] p-5 flex flex-col gap-3">
        <h3 className="text-app-text m-0 text-[15px]">Bulk Import (JSON)</h3>
        <p className="text-app-muted text-xs m-0">
          Paste a JSON array: <code className="text-app-yellow">[{`{"id":"class-10","name":"Class 10","grade_num":10,"sort_order":10}`}, …]</code>
        </p>
        <textarea
          className={`${inputClass} min-h-[120px] resize-y font-mono text-xs`}
          placeholder='[{"id":"class-1","name":"Class 1","grade_num":1,"sort_order":1},{"id":"class-2","name":"Class 2","grade_num":2,"sort_order":2}]'
          value={importJson}
          onChange={e => setImport(e.target.value)}
        />
        {importResult && (
          <p className={`text-xs m-0 ${importResult.errors?.length ? 'text-app-red' : 'text-app-green'}`}>
            {importResult.inserted} inserted · {importResult.updated} updated · {importResult.errors?.length || 0} errors
            {importResult.errors?.length > 0 && ": " + importResult.errors.map(e => `Row ${e.row}: ${e.error}`).join("; ")}
          </p>
        )}
        <button className={btnClass('blue')} onClick={doImport} disabled={importing}>
          {importing ? "Importing…" : "Import"}
        </button>
      </div>

      {/* Search filter */}
      <div className="flex gap-2.5 items-center flex-wrap">
        <input className={`${inputClass} flex-1 min-w-0`} placeholder="Search by name or ID…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <span className="text-app-muted text-xs whitespace-nowrap">{filtered.length} standards</span>
      </div>

      <Table
        cols={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "grade_num", label: "Grade" },
          { key: "sort_order", label: "Order" },
          { key: "is_active", label: "Active", render: v => v ? "✓" : "—" },
        ]}
        rows={filtered}
        onEdit={edit}
        onDelete={row => setConfirmRow(row)}
      />
    </div>
  )
}

// ── Mediums tab ───────────────────────────────────────────────
function MediumsTab({ toast }) {
  const [meds, setMeds]         = useState([])
  const [search, setSearch]     = useState("")
  const [form, setForm]         = useState({ id: "", name: "", sort_order: 0, is_active: true })
  const [editing, setEditing]   = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [confirmRow, setConfirmRow] = useState(null)
  const [importJson, setImport] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const load = useCallback(() =>
    API('/admin/mediums').then(r => r.json()).then(setMeds).catch(() => {}), [])

  useEffect(() => { load() }, [load])

  const filtered = meds.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.id.includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditing(null)
    setForm({ id: "", name: "", sort_order: 0, is_active: true })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.id.trim() || !form.name.trim()) { toast("ID and Name required", "error"); return }
    const method = editing ? 'PUT' : 'POST'
    const path   = editing ? `/admin/mediums/${editing.id}` : '/admin/mediums'
    const res = await API(path, { method, body: JSON.stringify({
      id: form.id.toLowerCase().trim(),
      name: form.name.trim(),
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    }) })
    if (res.ok) {
      toast(editing ? "Medium updated" : "Medium created")
      setShowModal(false)
      setEditing(null)
      setForm({ id: "", name: "", sort_order: 0, is_active: true })
      load()
    } else {
      const d = await res.json(); toast(d.detail || "Error", "error")
    }
  }

  const del = async () => {
    if (!confirmRow) return
    await API(`/admin/mediums/${confirmRow.id}`, { method: 'DELETE' })
    toast("Medium deactivated"); setConfirmRow(null); load()
  }

  const edit = row => {
    setEditing(row)
    setForm({ id: row.id, name: row.name, sort_order: row.sort_order, is_active: row.is_active })
    setShowModal(true)
  }

  const doImport = async () => {
    let parsed
    try { parsed = JSON.parse(importJson) } catch { toast("Invalid JSON", "error"); return }
    if (!Array.isArray(parsed)) { toast("JSON must be an array", "error"); return }
    setImporting(true)
    const res = await API('/admin/mediums/import', { method: 'POST', body: JSON.stringify(parsed) })
    const data = await res.json()
    setImportResult(data)
    if (res.ok) { toast(`Imported: ${data.inserted} new, ${data.updated} updated`); load() }
    else toast("Import failed", "error")
    setImporting(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editing ? "Edit Medium" : "Add Medium"} onClose={() => setShowModal(false)}>
          <div className="grid grid-cols-[1fr_2fr] gap-2.5">
            <input className={inputClass} placeholder="ID (e.g. gujarati)"
              value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
              disabled={!!editing} />
            <input className={inputClass} placeholder="Display name (e.g. Gujarati)"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <input className={`${inputClass} w-[120px] flex-shrink-0`} type="number" placeholder="Sort order"
              value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
            <label className="flex items-center gap-1.5 text-app-muted text-[13px] flex-1">
              <input type="checkbox" checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Active
            </label>
          </div>
          <div className="flex gap-2.5">
            <button className={btnClass('green')} onClick={save}>{editing ? "Update Medium" : "Add Medium"}</button>
            <button className={ghostBtnClass} onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {confirmRow && (
        <ConfirmDialog
          message={`Deactivate medium "${confirmRow.name}"? It will be hidden from students but not permanently deleted.`}
          onConfirm={del}
          onCancel={() => setConfirmRow(null)}
        />
      )}

      {/* Top action bar */}
      <div className="flex gap-2.5 items-center flex-wrap">
        <button className={btnClass('green')} onClick={openAdd}>+ Add Medium</button>
      </div>

      {/* Bulk Import */}
      <div className="bg-app-card2 rounded-[14px] p-5 flex flex-col gap-3">
        <h3 className="text-app-text m-0 text-[15px]">Bulk Import (JSON)</h3>
        <p className="text-app-muted text-xs m-0">
          Paste a JSON array: <code className="text-app-yellow">[{`{"id":"hindi","name":"Hindi","sort_order":2}`}, …]</code>
        </p>
        <textarea
          className={`${inputClass} min-h-[120px] resize-y font-mono text-xs`}
          placeholder='[{"id":"english","name":"English","sort_order":1},{"id":"hindi","name":"Hindi","sort_order":2}]'
          value={importJson}
          onChange={e => setImport(e.target.value)}
        />
        {importResult && (
          <p className={`text-xs m-0 ${importResult.errors?.length ? 'text-app-red' : 'text-app-green'}`}>
            {importResult.inserted} inserted · {importResult.updated} updated · {importResult.errors?.length || 0} errors
            {importResult.errors?.length > 0 && ": " + importResult.errors.map(e => `Row ${e.row}: ${e.error}`).join("; ")}
          </p>
        )}
        <button className={btnClass('blue')} onClick={doImport} disabled={importing}>
          {importing ? "Importing…" : "Import"}
        </button>
      </div>

      {/* Search filter */}
      <div className="flex gap-2.5 items-center flex-wrap">
        <input className={`${inputClass} flex-1 min-w-0`} placeholder="Search by name or ID…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <span className="text-app-muted text-xs whitespace-nowrap">{filtered.length} mediums</span>
      </div>

      <Table
        cols={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "sort_order", label: "Order" },
          { key: "is_active", label: "Active", render: v => v ? "✓" : "—" },
        ]}
        rows={filtered}
        onEdit={edit}
        onDelete={row => setConfirmRow(row)}
      />
    </div>
  )
}

// ── Curriculum tab ────────────────────────────────────────────
function CurriculumTab({ toast }) {
  const [rows, setRows]       = useState([])
  const [boards, setBoards]   = useState([])
  const [stds, setStds]       = useState([])
  const [meds, setMeds]       = useState([])
  const [filter, setFilter]   = useState({ board: "", standard: "", medium: "" })
  const [form, setForm]       = useState({ board_id: "", standard_id: "", medium_id: "", subjects: "", is_active: true })
  const [editing, setEditing] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [confirmRow, setConfirmRow] = useState(null)
  const [importJson, setImport] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const load = useCallback(() =>
    API('/admin/curriculum').then(r => r.json()).then(setRows).catch(() => {}), [])

  useEffect(() => {
    load()
    API('/admin/boards').then(r => r.json()).then(setBoards).catch(() => {})
    API('/admin/standards').then(r => r.json()).then(setStds).catch(() => {})
    API('/admin/mediums').then(r => r.json()).then(setMeds).catch(() => {})
  }, [load])

  const filtered = rows.filter(r =>
    (!filter.board    || r.board_id    === filter.board) &&
    (!filter.standard || r.standard_id === filter.standard) &&
    (!filter.medium   || r.medium_id   === filter.medium)
  )

  const openAdd = () => {
    setEditing(null)
    setForm({ board_id: "", standard_id: "", medium_id: "", subjects: "", is_active: true })
    setShowModal(true)
  }

  const save = async () => {
    const subjects = form.subjects.split(',').map(s => s.trim()).filter(Boolean)
    if (!form.board_id || !form.standard_id || !form.medium_id || !subjects.length) {
      toast("All fields required", "error"); return
    }
    if (editing) {
      const res = await API(`/admin/curriculum/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ subjects, is_active: form.is_active }),
      })
      if (res.ok) { toast("Updated"); setShowModal(false); setEditing(null); setForm({ board_id: "", standard_id: "", medium_id: "", subjects: "", is_active: true }); load() }
      else { const d = await res.json(); toast(d.detail || "Error", "error") }
    } else {
      const res = await API('/admin/curriculum', {
        method: 'POST',
        body: JSON.stringify({ board_id: form.board_id, standard_id: form.standard_id, medium_id: form.medium_id, subjects, is_active: form.is_active }),
      })
      if (res.ok) { toast("Created"); setShowModal(false); setForm({ board_id: "", standard_id: "", medium_id: "", subjects: "", is_active: true }); load() }
      else { const d = await res.json(); toast(d.detail || "Error", "error") }
    }
  }

  const del = async () => {
    if (!confirmRow) return
    await API(`/admin/curriculum/${confirmRow.id}`, { method: 'DELETE' })
    toast("Deleted"); setConfirmRow(null); load()
  }

  const edit = row => {
    setEditing(row)
    setForm({ board_id: row.board_id, standard_id: row.standard_id, medium_id: row.medium_id,
      subjects: (Array.isArray(row.subjects) ? row.subjects : []).join(", "), is_active: row.is_active })
    setShowModal(true)
  }

  const doImport = async () => {
    let parsed
    try { parsed = JSON.parse(importJson) } catch { toast("Invalid JSON", "error"); return }
    if (!Array.isArray(parsed)) { toast("JSON must be an array", "error"); return }
    setImporting(true)
    const res = await API('/admin/curriculum/import', { method: 'POST', body: JSON.stringify(parsed) })
    const data = await res.json()
    setImportResult(data)
    if (res.ok) { toast(`Imported: ${data.inserted} new, ${data.updated} updated`); load() }
    else toast("Import failed", "error")
    setImporting(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editing ? "Edit Curriculum Row" : "Add Curriculum Row"} onClose={() => setShowModal(false)}>
          <div className="flex gap-2.5 flex-wrap">
            <select className={`${inputClass} flex-1 min-w-[120px]`} value={form.board_id}
              onChange={e => setForm(f => ({ ...f, board_id: e.target.value }))} disabled={!!editing}>
              <option value="">Board…</option>
              {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className={`${inputClass} flex-1 min-w-[120px]`} value={form.standard_id}
              onChange={e => setForm(f => ({ ...f, standard_id: e.target.value }))} disabled={!!editing}>
              <option value="">Standard…</option>
              {stds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className={`${inputClass} flex-1 min-w-[120px]`} value={form.medium_id}
              onChange={e => setForm(f => ({ ...f, medium_id: e.target.value }))} disabled={!!editing}>
              <option value="">Medium…</option>
              {meds.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            placeholder="Subjects (comma-separated): Mathematics, Science, English…"
            value={form.subjects}
            onChange={e => setForm(f => ({ ...f, subjects: e.target.value }))}
          />
          <label className="flex items-center gap-1.5 text-app-muted text-[13px]">
            <input type="checkbox" checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            Active
          </label>
          <div className="flex gap-2.5">
            <button className={btnClass('green')} onClick={save}>{editing ? "Update Row" : "Add Row"}</button>
            <button className={ghostBtnClass} onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {confirmRow && (
        <ConfirmDialog
          message={`Permanently delete curriculum for ${confirmRow.board_name} / ${confirmRow.standard_name} / ${confirmRow.medium_name}?`}
          onConfirm={del}
          onCancel={() => setConfirmRow(null)}
        />
      )}

      {/* Top action bar */}
      <div className="flex gap-2.5 items-center flex-wrap">
        <button className={btnClass('green')} onClick={openAdd}>+ Add Row</button>
      </div>

      {/* Bulk Import */}
      <div className="bg-app-card2 rounded-[14px] p-5 flex flex-col gap-3">
        <h3 className="text-app-text m-0 text-[15px]">Bulk Import (JSON)</h3>
        <p className="text-app-muted text-xs m-0">
          Paste a JSON array: <code className="text-app-yellow">[{"{"}"board":"CBSE","standard":"Class 10","medium":"English","subjects":["Math","Science"]{"}"}, …]</code>
        </p>
        <textarea
          className={`${inputClass} min-h-[120px] resize-y font-mono text-xs`}
          placeholder='[{"board":"CBSE","standard":"Class 10","medium":"English","subjects":["Mathematics","Science"]}]'
          value={importJson}
          onChange={e => setImport(e.target.value)}
        />
        {importResult && (
          <p className={`text-xs m-0 ${importResult.errors?.length ? 'text-app-red' : 'text-app-green'}`}>
            {importResult.inserted} inserted · {importResult.updated} updated · {importResult.errors?.length || 0} errors
            {importResult.errors?.length > 0 && ": " + importResult.errors.map(e => `Row ${e.row}: ${e.error}`).join("; ")}
          </p>
        )}
        <button className={btnClass('blue')} onClick={doImport} disabled={importing}>
          {importing ? "Importing…" : "Import"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2.5 flex-wrap">
        <select className={`${inputClass} flex-1 min-w-[130px]`} value={filter.board}
          onChange={e => setFilter(f => ({ ...f, board: e.target.value }))}>
          <option value="">All Boards</option>
          {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className={`${inputClass} flex-1 min-w-[130px]`} value={filter.standard}
          onChange={e => setFilter(f => ({ ...f, standard: e.target.value }))}>
          <option value="">All Standards</option>
          {stds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className={`${inputClass} flex-1 min-w-[130px]`} value={filter.medium}
          onChange={e => setFilter(f => ({ ...f, medium: e.target.value }))}>
          <option value="">All Mediums</option>
          {meds.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <span className="text-app-muted text-xs self-center whitespace-nowrap">
          {filtered.length} rows
        </span>
      </div>

      <Table
        cols={[
          { key: "board_name",    label: "Board" },
          { key: "standard_name", label: "Standard" },
          { key: "medium_name",   label: "Medium" },
          { key: "subjects",      label: "Subjects", render: v => Array.isArray(v) ? v.join(", ") : v },
          { key: "is_active",     label: "Active", render: v => v ? "✓" : "—" },
        ]}
        rows={filtered}
        onEdit={row => edit(row)}
        onDelete={row => setConfirmRow(row)}
      />
    </div>
  )
}

// ── AI Usage Analytics Tab ────────────────────────────────────
const PLAN_COLORS = {
  free:    '#6868a0',
  basic:   '#FFD166',
  pro:     '#7B9CFF',
  premium: '#00E5A0',
}

function UsageTab({ toast }) {
  const [summary, setSummary] = useState(null)
  const [topUsers, setTopUsers] = useState([])
  const [days, setDays] = useState(7)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, uRes] = await Promise.all([
        API(`/admin/usage/summary?days=${days}`),
        API(`/admin/usage/users?date=${date}`),
      ])
      if (sRes.ok) setSummary(await sRes.json())
      if (uRes.ok) setTopUsers((await uRes.json()).rows || [])
    } finally {
      setLoading(false)
    }
  }, [days, date])

  useEffect(() => { loadSummary() }, [loadSummary])

  const fmtK = n => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex gap-2.5 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs text-app-muted">Period:</label>
          <select
            className={`${inputClass} w-[120px]`}
            value={days}
            onChange={e => setDays(Number(e.target.value))}
          >
            {[7, 14, 30].map(d => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-app-muted">Day detail:</label>
          <input
            type="date"
            className={`${inputClass} w-[160px]`}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <button className={`${ghostBtnClass} py-2 px-3.5 text-xs`} onClick={loadSummary}>
          {loading ? "…" : "↺ Refresh"}
        </button>
      </div>

      {/* All-time totals */}
      {summary && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
          {[
            { label: "Total Calls (all time)", value: fmtK(summary.all_time?.calls), color: C.blue },
            { label: "Total Tokens (all time)", value: fmtK(summary.all_time?.tokens), color: C.green },
            { label: `Calls (${days}d)`, value: fmtK(summary.daily?.reduce((s, d) => s + (d.calls || 0), 0)), color: C.yellow },
            { label: `Tokens (${days}d)`, value: fmtK(summary.daily?.reduce((s, d) => s + (d.tokens || 0), 0)), color: C.orange },
          ].map(stat => (
            <div key={stat.label} className="bg-app-card2 rounded-xl p-4 border border-app-border">
              <div className="text-[22px] font-black" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-[11px] text-app-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Per-plan breakdown */}
      {summary?.by_plan?.length > 0 && (
        <div className="bg-app-card2 rounded-[14px] p-5">
          <h3 className="text-app-text m-0 mb-3.5 text-sm">By Plan (last {days} days)</h3>
          <div className="flex flex-col gap-2">
            {summary.by_plan.map(row => (
              <div key={row.plan} className="flex items-center gap-3 text-[13px]">
                <span className="w-[70px] font-bold" style={{ color: PLAN_COLORS[row.plan] || C.muted }}>
                  {row.plan?.charAt(0).toUpperCase() + row.plan?.slice(1)}
                </span>
                <span className="text-app-text w-[80px]">{fmtK(row.calls)} calls</span>
                <span className="text-app-muted w-[90px]">{fmtK(row.tokens)} tokens</span>
                <span className="text-app-muted text-[11px]">{row.active_users} users</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily chart (simple text bars) */}
      {summary?.daily?.length > 0 && (
        <div className="bg-app-card2 rounded-[14px] p-5">
          <h3 className="text-app-text m-0 mb-3.5 text-sm">Daily Calls</h3>
          {(() => {
            const maxCalls = Math.max(...summary.daily.map(d => d.calls || 0), 1)
            return summary.daily.map(d => (
              <div key={d.date} className="flex items-center gap-2.5 mb-1.5">
                <span className="text-[11px] text-app-muted w-[80px] shrink-0">{d.date?.slice(5)}</span>
                <div className="flex-1 h-2.5 bg-app-card rounded overflow-hidden">
                  <div 
                    className="h-full bg-app-blue rounded"
                    style={{ width: `${Math.round((d.calls / maxCalls) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-app-text w-[50px] text-right">{d.calls}</span>
              </div>
            ))
          })()}
        </div>
      )}

      {/* Top users for selected date */}
      <div>
        <h3 className="text-app-text m-0 mb-3 text-sm">Users — {date}</h3>
        {topUsers.length === 0 ? (
          <p className="text-app-muted text-[13px]">No usage recorded for this date.</p>
        ) : (
          <Table
            cols={[
              { key: "name",          label: "Name" },
              { key: "email",         label: "Email" },
              { key: "plan",          label: "Plan", render: v => <span style={{ color: PLAN_COLORS[v] || C.muted }} className="font-bold">{v}</span> },
              { key: "call_count",    label: "Calls" },
              { key: "total_tokens",  label: "Tokens" },
            ]}
            rows={topUsers}
          />
        )}
      </div>
    </div>
  )
}

// ── Users Tab ─────────────────────────────────────────────────
const PLAN_OPTIONS = ['free', 'basic', 'pro', 'premium']
const PLAN_META = {
  free:    { label: 'Free',    icon: '🆓', color: '#6868a0' },
  basic:   { label: 'Basic',   icon: '⭐', color: '#FFD166' },
  pro:     { label: 'Pro',     icon: '🚀', color: '#7B9CFF' },
  premium: { label: 'Premium', icon: '👑', color: '#00E5A0' },
}

function UsersTab({ toast }) {
  const [users,   setUsers]   = useState([])
  const [search,  setSearch]  = useState("")
  const [planFilter, setPlanFilter] = useState("")
  const [drishtiOnly, setDrishtiOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(null)   // { id, name, email, plan, plan_expires_at }
  const [editPlan,    setEditPlan]    = useState('free')
  const [editExpiry,  setEditExpiry]  = useState('')
  const [saving, setSaving] = useState(false)
  
  // Curriculum data for dropdowns
  const [boards, setBoards] = useState([])
  const [standards, setStandards] = useState([])
  const [mediums, setMediums] = useState([])
  
  // Create Drishti student state
  const [showCreate, setShowCreate] = useState(false)
  const [newStudent, setNewStudent] = useState({ name: '', email: '', password: '', standard: '', board: '', language: '' })
  const [creating, setCreating] = useState(false)

  // Load curriculum data for dropdowns
  useEffect(() => {
    API('/admin/boards').then(r => r.json()).then(d => setBoards(Array.isArray(d) ? d.filter(b => b.is_active) : [])).catch(() => {})
    API('/admin/standards').then(r => r.json()).then(d => setStandards(Array.isArray(d) ? d.filter(s => s.is_active) : [])).catch(() => {})
    API('/admin/mediums').then(r => r.json()).then(d => setMediums(Array.isArray(d) ? d.filter(m => m.is_active) : [])).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search)     params.set('search', search)
      if (planFilter) params.set('plan', planFilter)
      if (drishtiOnly) params.set('drishti', 'true')
      const res = await API(`/admin/users?${params}`)
      if (res.ok) setUsers(await res.json())
    } finally {
      setLoading(false)
    }
  }, [search, planFilter, drishtiOnly])

  useEffect(() => { load() }, [load])

  const openEdit = (user) => {
    setEditing(user)
    setEditPlan(user.plan || 'free')
    setEditExpiry(user.plan_expires_at || '')
  }

  const savePlan = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const res = await API(`/admin/users/${editing.id}/plan`, {
        method: 'PUT',
        body: JSON.stringify({ plan: editPlan, plan_expires_at: editExpiry }),
      })
      if (res.ok) {
        toast(`Plan updated for ${editing.name}`)
        setEditing(null)
        load()
      } else {
        const d = await res.json()
        toast(d.detail || 'Failed to update plan', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleDrishti = async (user) => {
    const newVal = !user.is_drishti
    try {
      const res = await API(`/admin/users/${user.id}/drishti?is_drishti=${newVal}`, { method: 'PUT' })
      if (res.ok) {
        toast(`${user.name} ${newVal ? 'marked as' : 'removed from'} Drishti`)
        load()
      } else {
        const d = await res.json()
        toast(d.detail || 'Failed', 'error')
      }
    } catch { toast('Failed to update', 'error') }
  }

  const createDrishtiStudent = async () => {
    const { name, email, password, standard, board, language } = newStudent
    if (!name || !email || !password || !standard || !board) {
      toast('Please fill all required fields', 'error')
      return
    }
    setCreating(true)
    try {
      const res = await API('/admin/users/drishti', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, standard, board, language, is_drishti: true }),
      })
      if (res.ok) {
        toast('Drishti student created!')
        setShowCreate(false)
        setNewStudent({ name: '', email: '', password: '', standard: '', board: '', language: 'Hindi' })
        load()
      } else {
        const d = await res.json()
        toast(d.detail || 'Failed to create', 'error')
      }
    } catch { toast('Failed to create student', 'error') }
    setCreating(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Edit Plan Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center p-4">
          <div className="bg-app-card rounded-[18px] p-7 w-full max-w-[420px] flex flex-col gap-4">
            <h3 className="text-app-text m-0 text-base">Change Plan — {editing.name}</h3>
            <div className="text-xs text-app-muted">{editing.email}</div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-app-muted font-semibold">Plan</label>
              <div className="flex gap-2 flex-wrap">
                {PLAN_OPTIONS.map(p => {
                  const m = PLAN_META[p]
                  return (
                    <button
                      key={p}
                      onClick={() => setEditPlan(p)}
                      className="py-2 px-4 rounded-[10px] font-[Sora,sans-serif] font-bold text-[13px] cursor-pointer border-2"
                      style={{
                        background: editPlan === p ? `${m.color}25` : 'transparent',
                        borderColor: editPlan === p ? m.color : C.border,
                        color: editPlan === p ? m.color : C.muted,
                      }}
                    >{m.icon} {m.label}</button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-app-muted font-semibold">
                Expires on (leave blank = no expiry)
              </label>
              <input
                type="date"
                className={inputClass}
                value={editExpiry}
                onChange={e => setEditExpiry(e.target.value)}
              />
            </div>

            <div className="flex gap-2.5">
              <button className={btnClass()} onClick={savePlan} disabled={saving}>
                {saving ? "Saving…" : "Save Plan"}
              </button>
              <button className={ghostBtnClass} onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2.5 flex-wrap items-center">
        <input
          className={`${inputClass} flex-[1_1_200px] min-w-0`}
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className={`${inputClass} w-[160px] flex-[0_0_160px]`}
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
        >
          <option value="">All Plans</option>
          {PLAN_OPTIONS.map(p => (
            <option key={p} value={p}>{PLAN_META[p].icon} {PLAN_META[p].label}</option>
          ))}
        </select>
        <button
          onClick={() => setDrishtiOnly(!drishtiOnly)}
          className={`${ghostBtnClass} ${drishtiOnly ? 'bg-app-blue/20 text-app-blue border-app-blue' : ''}`}
        >
          👁️ Drishti Only
        </button>
        <button onClick={() => setShowCreate(true)} className={`${btnClass()} py-2.5 px-3.5`}>+ Add Drishti Student</button>
        <span className="text-app-muted text-xs whitespace-nowrap">
          {loading ? "Loading…" : `${users.length} users`}
        </span>
      </div>

      {/* Create Drishti Student Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center p-4">
          <div className="bg-app-card rounded-[18px] p-7 w-full max-w-[440px] flex flex-col gap-3.5">
            <h3 className="text-app-text m-0 text-base">👁️ Create Drishti Student</h3>
            <p className="text-app-muted text-xs m-0">This student will be automatically marked as a Drishti learner.</p>
            
            {[['Name *', 'name', 'text'], ['Email *', 'email', 'email'], ['Password *', 'password', 'password']].map(([label, key, type]) => (
              <div key={key}>
                <label className="block text-app-muted text-[11px] mb-1 font-semibold">{label}</label>
                <input type={type} value={newStudent[key]} onChange={e => setNewStudent(s => ({ ...s, [key]: e.target.value }))}
                  className={`${inputClass} w-full box-border`} />
              </div>
            ))}
            
            <div className="flex gap-2.5">
              <div className="flex-1">
                <label className="block text-app-muted text-[11px] mb-1 font-semibold">Class/Standard *</label>
                <select value={newStudent.standard} onChange={e => setNewStudent(s => ({ ...s, standard: e.target.value }))}
                  className={`${inputClass} w-full box-border`}>
                  <option value="">Select Class</option>
                  {standards.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-app-muted text-[11px] mb-1 font-semibold">Board *</label>
                <select value={newStudent.board} onChange={e => setNewStudent(s => ({ ...s, board: e.target.value }))}
                  className={`${inputClass} w-full box-border`}>
                  <option value="">Select Board</option>
                  {boards.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-app-muted text-[11px] mb-1 font-semibold">Medium/Language</label>
              <select value={newStudent.language} onChange={e => setNewStudent(s => ({ ...s, language: e.target.value }))}
                className={`${inputClass} w-full box-border`}>
                <option value="">Select Medium</option>
                {mediums.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            
            <div className="flex gap-2.5 mt-2">
              <button onClick={createDrishtiStudent} disabled={creating} className={`${btnClass()} flex-1`}>
                {creating ? 'Creating…' : 'Create Student'}
              </button>
              <button onClick={() => setShowCreate(false)} className={`${ghostBtnClass} flex-1`}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <Table
        cols={[
          { key: "name",  label: "Name" },
          { key: "email", label: "Email" },
          { key: "standard", label: "Class" },
          { key: "plan",  label: "Plan", render: (v) => {
            const m = PLAN_META[v] || PLAN_META.free
            return <span className="font-bold" style={{ color: m.color }}>{m.icon} {m.label}</span>
          }},
          { key: "plan_expires_at", label: "Expires", render: v => v || "—" },
          { key: "xp",   label: "XP" },
          { key: "is_drishti", label: "👁️", render: (v, row) => (
            <button
              onClick={(e) => { e.stopPropagation(); toggleDrishti(row) }}
              title={v ? "Remove from Drishti" : "Mark as Drishti learner"}
              className={`rounded-md py-1 px-2 cursor-pointer font-semibold text-[11px] font-[Sora,sans-serif] border ${
                v ? 'bg-app-blue/20 border-app-blue text-app-blue' : 'bg-transparent border-app-border text-app-muted'
              }`}
            >{v ? '👁️ On' : 'Off'}</button>
          )},
          { key: "created_at", label: "Joined" },
        ]}
        rows={users}
        onEdit={openEdit}
      />
    </div>
  )
}

// ── AI Config Tab ─────────────────────────────────────────────
const ADMIN_PROVIDERS = {
  gemini:    { label: "Google Gemini", icon: "✦", color: "#7B9CFF",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"] },
  groq:      { label: "Groq",          icon: "⚡", color: "#FFD166",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] },
  anthropic: { label: "Anthropic Claude", icon: "◈", color: "#FF6B35",
    models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"] },
  openai:    { label: "OpenAI GPT",    icon: "◎", color: "#00E5A0",
    models: ["gpt-4o-mini", "gpt-4o"] },
}

const PLAN_LABELS = { free: "🆓 Free", basic: "⭐ Basic", pro: "🚀 Pro", premium: "👑 Premium" }

function AIConfigTab({ toast }) {
  const [routing, setRouting]       = useState({})
  const [keyStatus, setKeyStatus]   = useState({})   // {provider: bool}
  const [keySlots, setKeySlots]     = useState({})   // {provider: {db_slots,env_count,pool_size}}
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(null)   // which plan is saving
  // API key editing state — keyed as "provider-slot" e.g. "groq-1"
  const [keyInputs, setKeyInputs]   = useState({})    // {"groq-1": value, ...}
  const [keyVisible, setKeyVisible] = useState({})    // {"groq-1": bool, ...}
  const [keySaving, setKeySaving]   = useState(null)  // "groq-1" | null
  const [keyRemoving, setKeyRemoving] = useState(null) // "groq-1" | null
  // Per-user override
  const [userSearch, setUserSearch] = useState("")
  const [users, setUsers]           = useState([])
  const [userLoading, setUserLoading] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [uProvider, setUProvider]   = useState("gemini")
  const [uModel, setUModel]         = useState("gemini-2.0-flash")
  const [uSaving, setUSaving]       = useState(false)

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await API('/admin/ai-config')
      if (res.ok) {
        const data = await res.json()
        setRouting(data.routing || {})
        setKeyStatus(data.key_status || {})
        setKeySlots(data.key_slots || {})
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const saveApiKeySlot = async (provider, slot) => {
    const slotKey = `${provider}-${slot}`
    const key = (keyInputs[slotKey] || "").trim()
    if (!key) { toast("Key cannot be empty", "error"); return }
    setKeySaving(slotKey)
    try {
      const res = await API('/admin/ai-keys', {
        method: 'PUT',
        body: JSON.stringify({ provider, key, slot }),
      })
      if (res.ok) {
        toast(`${ADMIN_PROVIDERS[provider]?.label} — Slot ${slot} saved`)
        setKeyInputs(k => ({ ...k, [slotKey]: "" }))
        loadConfig()  // refresh pool sizes
      } else {
        const d = await res.json()
        toast(d.detail || "Failed to save key", "error")
      }
    } finally {
      setKeySaving(null)
    }
  }

  const removeApiKeySlot = async (provider, slot) => {
    const slotKey = `${provider}-${slot}`
    setKeyRemoving(slotKey)
    try {
      const res = await API(`/admin/ai-keys/${provider}/${slot}`, { method: 'DELETE' })
      if (res.ok) {
        toast(`${ADMIN_PROVIDERS[provider]?.label} — Slot ${slot} removed`)
        loadConfig()
      } else {
        const d = await res.json()
        toast(d.detail || "Failed to remove key", "error")
      }
    } finally {
      setKeyRemoving(null)
    }
  }

  const savePlanRouting = async (plan) => {    const entry = routing[plan]
    if (!entry) return
    setSaving(plan)
    try {
      const res = await API('/admin/ai-config', {
        method: 'PUT',
        body: JSON.stringify({ plan, provider: entry.provider, model: entry.model }),
      })
      if (res.ok) {
        toast(`${PLAN_LABELS[plan]} routing saved`)
      } else {
        const d = await res.json()
        toast(d.detail || 'Failed to save', 'error')
      }
    } finally {
      setSaving(null)
    }
  }

  const searchUsers = async () => {
    if (!userSearch.trim()) return
    setUserLoading(true)
    try {
      const res = await API(`/admin/users?search=${encodeURIComponent(userSearch)}`)
      if (res.ok) setUsers(await res.json())
    } finally {
      setUserLoading(false)
    }
  }

  const openUserEdit = (user) => {
    setEditingUser(user)
    setUProvider(user.ai_provider || "gemini")
    setUModel(user.ai_model || "gemini-2.0-flash")
  }

  const saveUserOverride = async (clearOverride = false) => {
    if (!editingUser) return
    setUSaving(true)
    try {
      const body = clearOverride
        ? { provider: uProvider, model: uModel, override: false }
        : { provider: uProvider, model: uModel, override: true }
      const res = await API(`/admin/users/${editingUser.id}/ai-config`, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast(clearOverride ? `Override cleared for ${editingUser.name}` : `AI config saved for ${editingUser.name}`)
        setEditingUser(null)
        searchUsers()
      } else {
        const d = await res.json()
        toast(d.detail || 'Failed', 'error')
      }
    } finally {
      setUSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-7">

      {/* ── Section 0: Provider API Keys (Round-Robin Pool) ── */}
      <div className="bg-app-card2 rounded-2xl p-[22px] flex flex-col gap-4">
        <div>
          <h3 className="text-app-text m-0 mb-1 text-[15px]">Provider API Keys — Round-Robin Pool</h3>
          <p className="text-app-muted text-xs m-0">
            Add up to 5 DB keys per provider. Requests automatically cycle through all keys,
            multiplying your quota. Keys in <code className="text-app-yellow">.env</code> are
            always included and shown as env count. Keys are stored server-side only.
          </p>
        </div>
        {Object.entries(ADMIN_PROVIDERS).map(([provider, meta]) => {
          const slotInfo = keySlots[provider] || { db_slots: {}, env_count: 0, pool_size: 0 }
          const poolSize = slotInfo.pool_size
          const envCount = slotInfo.env_count
          return (
            <div 
              key={provider} 
              className="bg-app-card rounded-xl py-3.5 px-4 flex flex-col gap-2.5 border"
              style={{ borderColor: poolSize > 0 ? `${meta.color}40` : C.border }}
            >
              {/* Provider header */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-base">{meta.icon}</span>
                <span className="font-bold text-[13px] flex-1" style={{ color: meta.color }}>{meta.label}</span>
                {envCount > 0 && (
                  <span 
                    className="text-[11px] py-0.5 px-2 rounded-full bg-app-green/10 border border-app-green/20 text-app-muted"
                    style={{ cursor: slotInfo.env_hints?.length ? "help" : "default" }}
                    title={slotInfo.env_hints?.join(", ") || ""}
                  >⚙️ {envCount} env{slotInfo.env_hints?.length > 0 ? `: ${slotInfo.env_hints.join(", ")}` : ""}</span>
                )}
                <span 
                  className="text-[11px] font-bold py-0.5 px-2.5 rounded-full border"
                  style={{
                    background: poolSize > 0 ? `${meta.color}20` : `${C.red}20`,
                    color: poolSize > 0 ? meta.color : C.red,
                    borderColor: poolSize > 0 ? `${meta.color}40` : `${C.red}40`,
                  }}
                >
                  {poolSize > 0 ? `● ${poolSize} key${poolSize > 1 ? "s" : ""} in pool` : "○ No keys"}
                </span>
              </div>
              {/* Slots 1 – 5 */}
              {[1, 2, 3, 4, 5].map(slot => {
                const slotKey = `${provider}-${slot}`
                const isSet   = !!slotInfo.db_slots[slot]
                const keyHint = slotInfo.db_hints?.[slot] || ""
                const inputVal  = keyInputs[slotKey] || ""
                const isVisible = !!keyVisible[slotKey]
                const isSaving  = keySaving === slotKey
                const isRemoving = keyRemoving === slotKey
                return (
                  <div 
                    key={slot} 
                    className="flex gap-2 items-center transition-opacity duration-150"
                    style={{ opacity: !isSet && slot > 1 && !inputVal ? 0.55 : 1 }}
                  >
                    <span className="text-[11px] font-bold w-[52px] shrink-0" style={{ color: isSet ? meta.color : C.muted }}>
                      {isSet ? "●" : "○"} Slot {slot}
                    </span>
                    {isSet && keyHint && (
                      <span 
                        className="text-[11px] font-mono py-0.5 px-2 rounded-md shrink-0"
                        style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}
                      >{keyHint}</span>
                    )}
                    <div className="flex-1 relative">
                      <input
                        className={`${inputClass} pr-10`}
                        type={isVisible ? "text" : "password"}
                        placeholder={isSet ? `Paste new key to replace` : `Paste key for slot ${slot}${slot === 1 ? " (primary)" : ""}…`}
                        value={inputVal}
                        onChange={e => setKeyInputs(k => ({ ...k, [slotKey]: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && saveApiKeySlot(provider, slot)}
                        autoComplete="off"
                      />
                      <button
                        onClick={() => setKeyVisible(v => ({ ...v, [slotKey]: !v[slotKey] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-app-muted text-[13px] p-0"
                      >{isVisible ? "🙈" : "👁"}</button>
                    </div>
                    <button
                      className="py-2 px-3 text-[11px] shrink-0 rounded-[9px] font-bold font-[Sora,sans-serif] cursor-pointer border-none"
                      style={{
                        background: meta.color,
                        color: provider === "gemini" || provider === "groq" ? "#04040e" : "#fff",
                        opacity: !inputVal.trim() ? 0.4 : 1,
                      }}
                      onClick={() => saveApiKeySlot(provider, slot)}
                      disabled={isSaving || !inputVal.trim()}
                    >{isSaving ? "…" : "Save"}</button>
                    {isSet && (
                      <button
                        className="py-2 px-2.5 text-[11px] shrink-0 rounded-[9px] font-bold font-[Sora,sans-serif] cursor-pointer border-none bg-app-red text-white"
                        onClick={() => removeApiKeySlot(provider, slot)}
                        disabled={isRemoving}
                        title={`Remove slot ${slot} key`}
                      >{isRemoving ? "…" : "✕"}</button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* ── Section 1: Global Plan Routing ── */}
      <div className="bg-app-card2 rounded-2xl p-[22px] flex flex-col gap-[18px]">
        <div>
          <h3 className="text-app-text m-0 mb-1 text-[15px]">Global Plan Routing</h3>
          <p className="text-app-muted text-xs m-0">
            Set which AI provider + model is used for each plan tier. Changes take effect immediately for all new requests.
          </p>
        </div>

        {loading ? (
          <p className="text-app-muted text-[13px]">Loading…</p>
        ) : (
          ["free", "basic", "pro", "premium"].map(plan => {
            const entry = routing[plan] || { provider: "gemini", model: "gemini-2.0-flash" }
            const provMeta = ADMIN_PROVIDERS[entry.provider] || ADMIN_PROVIDERS.gemini
            return (
              <div 
                key={plan} 
                className="flex items-center gap-3 flex-wrap bg-app-card rounded-xl py-3.5 px-4 border border-app-border"
              >
                <span className="w-[90px] font-bold text-[13px]" style={{ color: PLAN_COLORS[plan] || C.muted }}>
                  {PLAN_LABELS[plan]}
                </span>

                {/* Provider select */}
                <select
                  className={`${inputClass} w-[170px] flex-[0_0_170px]`}
                  value={entry.provider}
                  onChange={e => {
                    const prov = e.target.value
                    const firstModel = ADMIN_PROVIDERS[prov]?.models[0] || ""
                    setRouting(r => ({ ...r, [plan]: { provider: prov, model: firstModel } }))
                  }}
                >
                  {Object.entries(ADMIN_PROVIDERS).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>

                {/* Model select */}
                <select
                  className={`${inputClass} flex-[1_1_220px] min-w-0`}
                  value={entry.model}
                  onChange={e => setRouting(r => ({ ...r, [plan]: { ...entry, model: e.target.value } }))}
                >
                  {(ADMIN_PROVIDERS[entry.provider]?.models || []).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <button
                  className="py-2.5 px-4 text-xs shrink-0 rounded-[9px] font-bold font-[Sora,sans-serif] cursor-pointer border-none"
                  style={{ background: provMeta.color }}
                  onClick={() => savePlanRouting(plan)}
                  disabled={saving === plan}
                >
                  {saving === plan ? "Saving…" : "Save"}
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* ── Section 2: Per-User Override ── */}
      <div className="bg-app-card2 rounded-2xl p-[22px] flex flex-col gap-4">
        <div>
          <h3 className="text-app-text m-0 mb-1 text-[15px]">Per-User AI Override</h3>
          <p className="text-app-muted text-xs m-0">
            Force a specific provider + model for an individual user, regardless of their plan. Useful for testing or special accounts.
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-2.5">
          <input
            className={`${inputClass} flex-1 min-w-0`}
            placeholder="Search by name or email…"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchUsers()}
          />
          <button className={`${btnClass()} py-2.5 px-4 text-xs shrink-0`}
            onClick={searchUsers} disabled={userLoading}>
            {userLoading ? "…" : "Search"}
          </button>
        </div>

        {/* User edit modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center p-4">
            <div className="bg-app-card rounded-[18px] p-7 w-full max-w-[440px] flex flex-col gap-4">
              <div>
                <h3 className="text-app-text m-0 mb-1 text-base">AI Config — {editingUser.name}</h3>
                <div className="text-xs text-app-muted">{editingUser.email} · {editingUser.plan}</div>
              </div>

              {editingUser.ai_admin_override && (
                <div className="bg-app-yellow/10 border border-app-yellow/30 rounded-lg py-2 px-3 text-xs text-app-yellow">
                  ⚠ Admin override is active — this user is using a fixed provider+model.
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs text-app-muted font-semibold">Provider</label>
                <select
                  className={inputClass}
                  value={uProvider}
                  onChange={e => {
                    const prov = e.target.value
                    setUProvider(prov)
                    setUModel(ADMIN_PROVIDERS[prov]?.models[0] || "")
                  }}
                >
                  {Object.entries(ADMIN_PROVIDERS).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-app-muted font-semibold">Model</label>
                <select
                  className={inputClass}
                  value={uModel}
                  onChange={e => setUModel(e.target.value)}
                >
                  {(ADMIN_PROVIDERS[uProvider]?.models || []).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button className={btnClass()} onClick={() => saveUserOverride(false)} disabled={uSaving}>
                  {uSaving ? "Saving…" : "Apply Override"}
                </button>
                {editingUser.ai_admin_override && (
                  <button className={btnClass(C.red)} onClick={() => saveUserOverride(true)} disabled={uSaving}>
                    Clear Override
                  </button>
                )}
                <button className={ghostBtnClass} onClick={() => setEditingUser(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Results table */}
        {users.length > 0 && (
          <Table
            cols={[
              { key: "name",  label: "Name" },
              { key: "email", label: "Email" },
              { key: "plan",  label: "Plan", render: v => (
                <span className="font-bold" style={{ color: PLAN_COLORS[v] || C.muted }}>{v}</span>
              )},
              { key: "ai_provider", label: "Provider", render: (v, row) => (
                <span className="text-xs" style={{ color: row.ai_admin_override ? C.yellow : C.muted }}>
                  {row.ai_admin_override ? "⚠ " : ""}{v || "—"}
                </span>
              )},
              { key: "ai_model", label: "Model", render: (v, row) => (
                <span className="text-[11px]" style={{ color: row.ai_admin_override ? C.yellow : C.muted }}>
                  {v || "—"}
                </span>
              )},
            ]}
            rows={users}
            onEdit={openUserEdit}
          />
        )}
        {users.length === 0 && userSearch && !userLoading && (
          <p className="text-app-muted text-[13px]">No users found.</p>
        )}
      </div>
    </div>
  )
}

// ── Drishti Helpers Tab ──────────────────────────────────────
function DrishtiHelpersTab({ toast }) {
  const [helpers, setHelpers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [newToken, setNewToken]  = useState(null)
  const [form, setForm]         = useState({ helper_name: '', helper_email: '', helper_type: 'teacher', notes: '' })
  
  // Student assignment state
  const [assignModal, setAssignModal] = useState(null) // helper object or null
  const [assignedStudents, setAssignedStudents] = useState([])
  const [allDrishtiStudents, setAllDrishtiStudents] = useState([])
  const [assignLoading, setAssignLoading] = useState(false)

  const token = () => localStorage.getItem('eduvyai_admin_token')

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/drishti-helpers', { headers: { Authorization: `Bearer ${token()}` } })
      const d = await r.json()
      setHelpers(Array.isArray(d) ? d : [])
    } catch { toast('Failed to load helpers', 'error') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setNewToken(null)
    setForm({ helper_name: '', helper_email: '', helper_type: 'teacher', notes: '' })
    setShowModal(true)
  }

  const openEdit = (h) => {
    setEditing(h)
    setNewToken(null)
    setForm({ helper_name: h.helper_name, helper_email: h.helper_email, helper_type: h.helper_type, notes: h.notes || '' })
    setShowModal(true)
  }

  const save = async () => {
    try {
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `/api/admin/drishti-helpers/${editing.id}` : '/api/admin/drishti-helpers'
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Save failed') }
      const d = await r.json()
      if (!editing && d.helper_token) setNewToken(d.helper_token)
      else { toast(editing ? 'Helper updated' : 'Helper created'); setShowModal(false) }
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const deactivate = async (id) => {
    if (!confirm('Deactivate this helper?')) return
    try {
      const r = await fetch(`/api/admin/drishti-helpers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
      if (!r.ok) throw new Error('Failed')
      toast('Helper deactivated')
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const copyPortalUrl = (tok) => {
    const url = `${window.location.origin}/helper/${tok}`
    navigator.clipboard.writeText(url).then(() => toast('Portal URL copied!')).catch(() => toast(url, 'info'))
  }

  // ── Student Assignment ──
  const openAssignModal = async (helper) => {
    setAssignModal(helper)
    setAssignLoading(true)
    try {
      const [assignedRes, allRes] = await Promise.all([
        fetch(`/api/admin/drishti-helpers/${helper.id}/students`, { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/admin/drishti-students', { headers: { Authorization: `Bearer ${token()}` } }),
      ])
      const assigned = await assignedRes.json()
      const all = await allRes.json()
      setAssignedStudents(Array.isArray(assigned) ? assigned : [])
      setAllDrishtiStudents(Array.isArray(all) ? all : [])
    } catch { toast('Failed to load students', 'error') }
    setAssignLoading(false)
  }

  const assignStudent = async (studentId) => {
    try {
      const r = await fetch(`/api/admin/drishti-helpers/${assignModal.id}/assign/${studentId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` },
      })
      if (!r.ok) throw new Error('Failed to assign')
      toast('Student assigned')
      openAssignModal(assignModal) // refresh
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const unassignStudent = async (studentId) => {
    try {
      const r = await fetch(`/api/admin/drishti-helpers/${assignModal.id}/assign/${studentId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token()}` },
      })
      if (!r.ok) throw new Error('Failed to unassign')
      toast('Student removed')
      openAssignModal(assignModal) // refresh
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const assignedIds = new Set(assignedStudents.map(s => s.id))
  const unassignedStudents = allDrishtiStudents.filter(s => !assignedIds.has(s.id))

  return (
    <div>
      <button onClick={openCreate} className={`${btnClass()} py-2.5 px-[18px] w-auto mb-4`}>+ Add Helper</button>

      {loading ? <p className="text-app-muted">Loading…</p> : (
        <div className="flex flex-col gap-2.5">
          {helpers.map(h => (
            <div key={h.id} className="bg-app-card2 border border-app-border rounded-[14px] py-3.5 px-4">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <p className="text-app-text font-bold text-sm m-0">{h.helper_name}</p>
                  <p className="text-app-muted text-xs my-1">{h.helper_email} · {h.helper_type}</p>
                  <p className="text-app-muted text-[11px] m-0">Students: <strong className="text-app-text">{h.student_count || 0}</strong> · Token: <code className="text-app-yellow">{h.token_preview}</code></p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => openAssignModal(h)} className={`${ghostBtnClass} text-app-blue border-app-blue/40`}>👥 Assign</button>
                  <button onClick={() => openEdit(h)} className={ghostBtnClass}>Edit</button>
                  {h.is_active && <button onClick={() => deactivate(h.id)} className={`${ghostBtnClass} text-app-red border-app-red/40`}>Deactivate</button>}
                </div>
              </div>
            </div>
          ))}
          {helpers.length === 0 && <p className="text-app-muted text-center py-6">No helpers yet. Click "+ Add Helper" to create one.</p>}
        </div>
      )}

      {/* Create/Edit Helper Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-app-card rounded-2xl p-6 w-full max-w-[440px] border border-app-border">
            {newToken ? (
              <>
                <h3 className="text-app-green mb-3 text-base">✓ Helper Created!</h3>
                <p className="text-app-muted text-[13px] mb-2.5">Share this portal URL with the helper. The token will NOT be shown again.</p>
                <div className="bg-app-bg border border-app-border rounded-[10px] py-2.5 px-3.5 break-all text-xs text-app-yellow mb-4">
                  {window.location.origin}/helper/{newToken}
                </div>
                <button onClick={() => copyPortalUrl(newToken)} className={`${btnClass()} mb-2.5 w-full`}>📋 Copy Portal URL</button>
                <button onClick={() => setShowModal(false)} className="w-full bg-transparent border-none text-app-muted cursor-pointer font-[Sora,sans-serif]">Close</button>
              </>
            ) : (
              <>
                <h3 className="text-app-text mb-[18px] text-base">{editing ? 'Edit Helper' : 'Add Helper'}</h3>
                {[
                  ['Name', 'helper_name', 'text', "Helper's full name"],
                  ['Email', 'helper_email', 'email', 'helper@example.com'],
                  ['Type', 'helper_type', 'text', 'teacher / volunteer / parent'],
                  ['Notes', 'notes', 'text', 'Optional notes'],
                ].map(([label, key, type, ph]) => (
                  <div key={key} className="mb-3">
                    <label className="block text-app-muted text-xs mb-1 font-semibold">{label}</label>
                    <input type={type} value={form[key] || ''} placeholder={ph}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className={`${inputClass} w-full box-border`} />
                  </div>
                ))}
                <div className="flex gap-2.5">
                  <button onClick={save} className={`${btnClass()} flex-1`}>{editing ? 'Save' : 'Create'}</button>
                  <button onClick={() => setShowModal(false)} className="flex-1 bg-app-card2 border border-app-border rounded-xl text-app-muted cursor-pointer font-[Sora,sans-serif] font-semibold text-[13px]">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Assign Students Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-app-card rounded-2xl p-6 w-full max-w-[560px] max-h-[80vh] overflow-auto border border-app-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-app-text text-base m-0">👥 Assign Students to {assignModal.helper_name}</h3>
              <button onClick={() => setAssignModal(null)} className="bg-transparent border-none text-app-muted cursor-pointer text-xl">×</button>
            </div>

            {assignLoading ? <p className="text-app-muted">Loading…</p> : (
              <>
                {/* Currently Assigned */}
                <div className="mb-5">
                  <p className="text-app-muted text-[11px] font-bold tracking-wider mb-2">ASSIGNED ({assignedStudents.length})</p>
                  {assignedStudents.length === 0 ? (
                    <p className="text-app-muted text-[13px]">No students assigned yet.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {assignedStudents.map(s => (
                        <div key={s.id} className="flex justify-between items-center bg-app-card2 rounded-[10px] py-2 px-3">
                          <div>
                            <p className="text-app-text text-[13px] font-semibold m-0">{s.name}</p>
                            <p className="text-app-muted text-[11px] m-0">Class {s.standard} · {s.board}</p>
                          </div>
                          <button onClick={() => unassignStudent(s.id)} className={`${ghostBtnClass} py-1 px-2.5 text-[11px] text-app-red border-app-red/30`}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available to Assign */}
                <div>
                  <p className="text-app-muted text-[11px] font-bold tracking-wider mb-2">AVAILABLE DRISHTI STUDENTS ({unassignedStudents.length})</p>
                  {unassignedStudents.length === 0 ? (
                    <p className="text-app-muted text-[13px]">No unassigned Drishti students. Mark students as Drishti learners in the Users tab first.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {unassignedStudents.map(s => (
                        <div key={s.id} className="flex justify-between items-center bg-app-card2 rounded-[10px] py-2 px-3">
                          <div>
                            <p className="text-app-text text-[13px] font-semibold m-0">{s.name}</p>
                            <p className="text-app-muted text-[11px] m-0">Class {s.standard} · {s.board} {s.assigned_to && <span className="text-app-yellow">· with {s.assigned_to}</span>}</p>
                          </div>
                          <button onClick={() => assignStudent(s.id)} className={`${btnClass()} py-1 px-3 text-[11px]`}>+ Assign</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Admin Panel ──────────────────────────────────────────
export default function AdminPanel() {
  const navigate  = useNavigate()
  const { section = 'curriculum' } = useParams()
  const activeTab = ['curriculum','boards','standards','mediums','users','usage','aiconfig','drishti'].includes(section)
    ? section : 'curriculum'

  const [authed, setAuthed]   = useState(!!localStorage.getItem('eduvyai_admin_token'))
  const [adminInfo, setInfo]  = useState(null)
  const [toast, setToast]     = useState(null)
  const [sidebarOpen, setSidebar] = useState(false)
  const width = useWindowWidth()
  const isDesktop = width >= 1024
  const isMobile  = width < 640

  const setTab = (id) => navigate(`/admin/${id}`)

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type, key: Date.now() })
  }, [])

  const logout = () => {
    localStorage.removeItem('eduvyai_admin_token')
    setAuthed(false)
    setInfo(null)
    navigate('/admin/login', { replace: true })
  }

  if (!authed) {
    return <LoginScreen onLogin={d => {
      setAuthed(true)
      setInfo(d)
      navigate('/admin/curriculum', { replace: true })
    }} />
  }

  // Already logged in but landed on /login → go to curriculum
  if (section === 'login') {
    navigate('/admin/curriculum', { replace: true })
    return null
  }

  const TABS = [
    { id: "curriculum", label: "📚 Curriculum",  short: "📚" },
    { id: "boards",     label: "🏫 Boards",       short: "🏫" },
    { id: "standards",  label: "🎓 Standards",    short: "🎓" },
    { id: "mediums",    label: "🌐 Mediums",       short: "🌐" },
    { id: "users",      label: "👥 Users",         short: "👥" },
    { id: "usage",      label: "📊 AI Usage",      short: "📊" },
    { id: "aiconfig",   label: "🤖 AI Models",     short: "🤖" },
    { id: "drishti",    label: "👁️ Drishti",       short: "👁️" },
  ]

  const contentMap = {
    curriculum: <CurriculumTab toast={showToast} />,
    boards:     <BoardsTab     toast={showToast} />,
    standards:  <StandardsTab  toast={showToast} />,
    mediums:    <MediumsTab    toast={showToast} />,
    users:      <UsersTab      toast={showToast} />,
    usage:      <UsageTab      toast={showToast} />,
    aiconfig:   <AIConfigTab   toast={showToast} />,
    drishti:    <DrishtiHelpersTab toast={showToast} />,
  }

  // Shared title bar rendered inside content area for all breakpoints
  const ContentTitle = () => (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-app-text font-extrabold text-xl m-0">
        {TABS.find(t => t.id === activeTab)?.label}
      </h2>
    </div>
  )

  // ── Desktop: sidebar + content ──────────────────────────────
  if (isDesktop) {
    return (
      <div className="admin-panel-root bg-app-bg">
        {/* Header */}
        <div className="bg-app-card border-b border-app-border py-3.5 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[22px]">⚙️</span>
            <div>
              <div className="text-app-text font-extrabold text-base">Eduvy-AI Admin Panel</div>
              {adminInfo && <div className="text-app-muted text-xs">{adminInfo.name} · {adminInfo.email}</div>}
            </div>
          </div>
          <button className={`${ghostBtnClass} py-2 px-[18px]`} onClick={logout}>Logout</button>
        </div>

        {/* Body: sidebar + main */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-[220px] bg-app-card border-r border-app-border flex flex-col py-5 px-3 gap-1 shrink-0 overflow-y-auto">
            <p className="text-[10px] text-app-muted font-bold tracking-wider mb-2 pl-2.5">NAVIGATION</p>
            {TABS.map(t => (
              <button 
                key={t.id} 
                onClick={() => setTab(t.id)} 
                className={`rounded-[10px] py-2.5 px-3.5 flex items-center gap-2.5 cursor-pointer font-[Sora,sans-serif] text-left border-[1.5px] ${
                  activeTab === t.id 
                    ? 'bg-app-green/10 border-app-green/30' 
                    : 'bg-transparent border-transparent'
                }`}
              >
                <span className="text-lg">{t.short}</span>
                <span className={`text-sm ${activeTab === t.id ? 'font-bold text-app-green' : 'font-medium text-app-text'}`}>
                  {t.label.slice(2)}
                </span>
              </button>
            ))}
            <div className="flex-1" />
            <button className={`${ghostBtnClass} w-full mt-3 text-[13px]`} onClick={logout}>← Logout</button>
          </div>

          {/* Main content — scrolls internally */}
          <div className="flex-1 overflow-y-auto py-7 px-8">
            <div className="max-w-[960px] mx-auto">
              <ContentTitle />
              {contentMap[activeTab]}
            </div>
          </div>
        </div>

        {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      </div>
    )
  }

  // ── Tablet / Mobile: top tab bar ─────────────────────────────
  return (
    <div className="admin-panel-root bg-app-bg">
      {/* Header */}
      <div className={`bg-app-card border-b border-app-border ${isMobile ? 'py-3 px-4' : 'py-3.5 px-6'} flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2.5">
          <span className={isMobile ? 'text-lg' : 'text-xl'}>⚙️</span>
          <div>
            <div className={`text-app-text font-extrabold ${isMobile ? 'text-sm' : 'text-[15px]'}`}>Eduvy-AI Admin</div>
            {adminInfo && !isMobile && <div className="text-app-muted text-[11px]">{adminInfo.email}</div>}
          </div>
        </div>
        <button
          className={`${ghostBtnClass} ${isMobile ? 'py-1.5 px-3' : 'py-2 px-4'} text-xs`}
          onClick={logout}
        >{isMobile ? "✕ Exit" : "Logout"}</button>
      </div>

      {/* Tab bar */}
      <div className="bg-app-card border-b border-app-border flex overflow-x-auto px-2 shrink-0 [scrollbar-width:none] [-ms-overflow-style:none]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`bg-transparent border-none cursor-pointer whitespace-nowrap shrink-0 font-[Sora,sans-serif] ${
              isMobile ? 'py-2.5 px-3.5 text-xs' : 'py-3 px-[18px] text-[13px]'
            } ${activeTab === t.id 
              ? 'text-app-green font-bold border-b-2 border-app-green' 
              : 'text-app-muted font-medium border-b-2 border-transparent'
            }`}
          >{isMobile ? t.short : t.label}</button>
        ))}
      </div>

      {/* Content — scrolls internally, uniform padding */}
      <div className={`flex-1 overflow-y-auto ${isMobile ? 'py-4 px-3.5' : 'py-6 px-6'}`}>
        <div className="max-w-[960px] mx-auto">
          <ContentTitle />
          {contentMap[activeTab]}
        </div>
      </div>

      {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}
