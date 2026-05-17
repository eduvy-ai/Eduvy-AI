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

// ─── Input styles ────────────────────────────────────────────
const inp = {
  background: "#101022",
  border: "1px solid #ffffff18",
  borderRadius: 9,
  padding: "10px 13px",
  color: "#eeeeff",
  fontSize: 13,
  fontFamily: "Sora, sans-serif",
  outline: "none",
  width: "100%",
}
const btn = (color = C.green) => ({
  background: color,
  border: "none",
  borderRadius: 9,
  padding: "9px 18px",
  color: color === C.red ? "#fff" : "#04040e",
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "Sora, sans-serif",
  cursor: "pointer",
})
const ghostBtn = {
  background: "transparent",
  border: `1px solid ${C.border}`,
  borderRadius: 9,
  padding: "9px 18px",
  color: C.text,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "Sora, sans-serif",
  cursor: "pointer",
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: type === "error" ? C.red : C.green,
      color: "#04040e", padding: "10px 22px", borderRadius: 10,
      fontSize: 13, fontWeight: 700, zIndex: 9999, boxShadow: "0 4px 24px #0008",
    }}>{msg}</div>
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
    // Check if any admin exists
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
    <div className="admin-panel-root" style={{
      background: C.bg, alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 18, padding: 32, width: "100%", maxWidth: 400,
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 28 }}>⚙️</div>
          <h2 style={{ color: C.text, margin: "8px 0 4px", fontSize: 22, fontWeight: 800 }}>
            Eduvy-AI Admin
          </h2>
          <p style={{ color: C.muted, fontSize: 13 }}>
            {isSetup ? "Create the first superadmin account" : "Sign in to manage curriculum"}
          </p>
        </div>

        {isSetup && (
          <input style={inp} placeholder="Your name" value={setupName}
            onChange={e => setSetupName(e.target.value)} />
        )}
        <input style={inp} type="email" placeholder="Admin email"
          value={email} onChange={e => setEmail(e.target.value)} />
        <input style={inp} type="password" placeholder="Password (min 8 chars)"
          value={password} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()} />

        {err && <p style={{ color: C.red, fontSize: 12, margin: 0 }}>{err}</p>}

        <button style={btn()} onClick={submit} disabled={loading}>
          {loading ? "Please wait…" : (isSetup ? "Create Admin" : "Login")}
        </button>

        <button style={{ ...ghostBtn, fontSize: 12 }} onClick={() => setIsSetup(v => !v)}>
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

  // Reset to page 1 whenever rows change (e.g. filter applied)
  useEffect(() => { setPage(1) }, [rows.length])

  if (!rows.length) return (
    <p style={{ color: C.muted, fontSize: 13, margin: "12px 0" }}>No entries yet.</p>
  )

  const totalPages = Math.ceil(rows.length / pageSize)
  const start      = (page - 1) * pageSize
  const pageRows   = rows.slice(start, start + pageSize)

  // Build page number buttons — show max 5 around current page
  const pageNums = []
  const delta = 2
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - delta && p <= page + delta)) {
      pageNums.push(p)
    }
  }
  // Insert ellipsis markers
  const pageButtons = []
  let prev = null
  for (const p of pageNums) {
    if (prev !== null && p - prev > 1) pageButtons.push("…")
    pageButtons.push(p)
    prev = p
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c.key} style={{
                  textAlign: "left", padding: "8px 10px",
                  borderBottom: `1px solid ${C.border}`,
                  color: C.muted, fontWeight: 600, fontSize: 11,
                  whiteSpace: "nowrap",
                }}>{c.label}</th>
              ))}
              <th style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, width: 90 }} />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={row.id ?? i} style={{ borderBottom: `1px solid ${C.border}` }}>
                {cols.map(c => (
                  <td key={c.key} style={{ padding: "10px 10px", color: C.text, maxWidth: 260 }}>
                    {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? "")}
                  </td>
                ))}
                <td style={{ padding: "10px 10px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {onEdit && (
                      <button style={{ ...ghostBtn, padding: "5px 10px", fontSize: 12 }}
                        onClick={() => onEdit(row)}>Edit</button>
                    )}
                    {onDelete && (
                      <button style={{ ...btn(C.red), padding: "5px 10px", fontSize: 12 }}
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
      <div style={{
        display: "flex", flexDirection: "column", gap: 8, paddingTop: 4,
      }}>
        {/* Top row: count + page size */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, color: C.muted }}>
            {start + 1}–{Math.min(start + pageSize, rows.length)} of {rows.length}
          </span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
            style={{
              background: C.card2, border: `1px solid ${C.border}`,
              borderRadius: 7, padding: "4px 8px", color: C.muted,
              fontSize: 12, fontFamily: "Sora, sans-serif", cursor: "pointer",
            }}
          >
            {PAGE_SIZE_OPTIONS.map(n => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </div>

        {/* Page buttons — scrollable on small screens */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...ghostBtn, padding: "5px 12px", fontSize: 14, opacity: page === 1 ? 0.35 : 1, flexShrink: 0 }}
          >‹</button>

          {pageButtons.map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} style={{ color: C.muted, fontSize: 13, padding: "0 4px", flexShrink: 0 }}>…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: "5px 10px", fontSize: 12, borderRadius: 7, cursor: "pointer",
                  fontFamily: "Sora, sans-serif", fontWeight: p === page ? 700 : 500,
                  background: p === page ? C.green : "transparent",
                  color: p === page ? "#04040e" : C.muted,
                  border: p === page ? "none" : `1px solid ${C.border}`,
                  flexShrink: 0, minWidth: 32,
                }}
              >{p}</button>
            )
          )}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ ...ghostBtn, padding: "5px 12px", fontSize: 14, opacity: page === totalPages ? 0.35 : 1, flexShrink: 0 }}
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
  const [importJson, setImport] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const load = useCallback(() =>
    API('/admin/boards').then(r => r.json()).then(setBoards).catch(() => {}), [])

  useEffect(() => { load() }, [load])

  const filtered = boards.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.id.includes(search.toLowerCase())
  )

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
      setEditing(null)
      setForm({ id: "", name: "", sort_order: 0, is_active: true })
      load()
    } else {
      const d = await res.json()
      toast(d.detail || "Error", "error")
    }
  }

  const del = async (row) => {
    if (!confirm(`Soft-delete board "${row.name}"?`)) return
    await API(`/admin/boards/${row.id}`, { method: 'DELETE' })
    toast("Board deactivated"); load()
  }

  const edit = (row) => {
    setEditing(row)
    setForm({ id: row.id, name: row.name, sort_order: row.sort_order, is_active: row.is_active })
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Add/Edit form */}
      <div style={{ background: C.card2, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ color: C.text, margin: 0, fontSize: 15 }}>{editing ? "Edit Board" : "Add Board"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <input style={inp} placeholder="ID slug (e.g. cbse)"
            value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
            disabled={!!editing} />
          <input style={inp} placeholder="Display name (e.g. CBSE)"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...inp, width: 120, flex: "0 0 120px" }} type="number" placeholder="Sort order"
            value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: C.muted, fontSize: 13, flex: 1 }}>
            <input type="checkbox" checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            Active
          </label>
          <button style={btn()} onClick={save}>{editing ? "Update" : "Add Board"}</button>
          {editing && <button style={ghostBtn} onClick={() => { setEditing(null); setForm({ id: "", name: "", sort_order: 0, is_active: true }) }}>Cancel</button>}
        </div>
      </div>

      {/* Bulk Import */}
      <div style={{ background: C.card2, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ color: C.text, margin: 0, fontSize: 15 }}>Bulk Import (JSON)</h3>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
          Paste a JSON array: <code style={{ color: C.yellow }}>[{`{"id":"cbse","name":"CBSE","sort_order":1}`}, …]</code>
        </p>
        <textarea
          style={{ ...inp, minHeight: 120, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
          placeholder='[{"id":"cbse","name":"CBSE","sort_order":1},{"id":"icse","name":"ICSE","sort_order":2}]'
          value={importJson}
          onChange={e => setImport(e.target.value)}
        />
        {importResult && (
          <p style={{ fontSize: 12, color: importResult.errors?.length ? C.red : C.green, margin: 0 }}>
            {importResult.inserted} inserted · {importResult.updated} updated · {importResult.errors?.length || 0} errors
            {importResult.errors?.length > 0 && ": " + importResult.errors.map(e => `Row ${e.row}: ${e.error}`).join("; ")}
          </p>
        )}
        <button style={btn(C.blue)} onClick={doImport} disabled={importing}>
          {importing ? "Importing…" : "Import"}
        </button>
      </div>

      {/* Search filter */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ ...inp, flex: "1 1 200px", minWidth: 0 }} placeholder="Search by name or ID…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <span style={{ color: C.muted, fontSize: 12, whiteSpace: "nowrap" }}>{filtered.length} boards</span>
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
        onDelete={del}
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
  const [importJson, setImport] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const load = useCallback(() =>
    API('/admin/standards').then(r => r.json()).then(setStds).catch(() => {}), [])

  useEffect(() => { load() }, [load])

  const filtered = stds.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search.toLowerCase())
  )

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
      setEditing(null)
      setForm({ id: "", name: "", grade_num: "", sort_order: 0, is_active: true })
      load()
    } else {
      const d = await res.json(); toast(d.detail || "Error", "error")
    }
  }

  const del = async row => {
    if (!confirm(`Soft-delete "${row.name}"?`)) return
    await API(`/admin/standards/${row.id}`, { method: 'DELETE' })
    toast("Standard deactivated"); load()
  }

  const edit = row => {
    setEditing(row)
    setForm({ id: row.id, name: row.name, grade_num: row.grade_num, sort_order: row.sort_order, is_active: row.is_active })
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Add/Edit form */}
      <div style={{ background: C.card2, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ color: C.text, margin: 0, fontSize: 15 }}>{editing ? "Edit Standard" : "Add Standard"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <input style={inp} placeholder="ID (e.g. class-10)"
            value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
            disabled={!!editing} />
          <input style={inp} placeholder="Name (e.g. Class 10)"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...inp, width: 120, flex: "0 0 120px" }} type="number" placeholder="Grade #"
            value={form.grade_num} onChange={e => setForm(f => ({ ...f, grade_num: e.target.value }))} />
          <input style={{ ...inp, width: 120, flex: "0 0 120px" }} type="number" placeholder="Sort order"
            value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: C.muted, fontSize: 13, flex: 1 }}>
            <input type="checkbox" checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            Active
          </label>
          <button style={btn()} onClick={save}>{editing ? "Update" : "Add Standard"}</button>
          {editing && <button style={ghostBtn} onClick={() => { setEditing(null); setForm({ id: "", name: "", grade_num: "", sort_order: 0, is_active: true }) }}>Cancel</button>}
        </div>
      </div>

      {/* Bulk Import */}
      <div style={{ background: C.card2, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ color: C.text, margin: 0, fontSize: 15 }}>Bulk Import (JSON)</h3>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
          Paste a JSON array: <code style={{ color: C.yellow }}>[{`{"id":"class-10","name":"Class 10","grade_num":10,"sort_order":10}`}, …]</code>
        </p>
        <textarea
          style={{ ...inp, minHeight: 120, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
          placeholder='[{"id":"class-1","name":"Class 1","grade_num":1,"sort_order":1},{"id":"class-2","name":"Class 2","grade_num":2,"sort_order":2}]'
          value={importJson}
          onChange={e => setImport(e.target.value)}
        />
        {importResult && (
          <p style={{ fontSize: 12, color: importResult.errors?.length ? C.red : C.green, margin: 0 }}>
            {importResult.inserted} inserted · {importResult.updated} updated · {importResult.errors?.length || 0} errors
            {importResult.errors?.length > 0 && ": " + importResult.errors.map(e => `Row ${e.row}: ${e.error}`).join("; ")}
          </p>
        )}
        <button style={btn(C.blue)} onClick={doImport} disabled={importing}>
          {importing ? "Importing…" : "Import"}
        </button>
      </div>

      {/* Search filter */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ ...inp, flex: "1 1 200px", minWidth: 0 }} placeholder="Search by name or ID…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <span style={{ color: C.muted, fontSize: 12, whiteSpace: "nowrap" }}>{filtered.length} standards</span>
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
        onDelete={del}
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
  const [importJson, setImport] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const load = useCallback(() =>
    API('/admin/mediums').then(r => r.json()).then(setMeds).catch(() => {}), [])

  useEffect(() => { load() }, [load])

  const filtered = meds.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.id.includes(search.toLowerCase())
  )

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
      setEditing(null)
      setForm({ id: "", name: "", sort_order: 0, is_active: true })
      load()
    } else {
      const d = await res.json(); toast(d.detail || "Error", "error")
    }
  }

  const del = async row => {
    if (!confirm(`Soft-delete medium "${row.name}"?`)) return
    await API(`/admin/mediums/${row.id}`, { method: 'DELETE' })
    toast("Medium deactivated"); load()
  }

  const edit = row => {
    setEditing(row)
    setForm({ id: row.id, name: row.name, sort_order: row.sort_order, is_active: row.is_active })
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Add/Edit form */}
      <div style={{ background: C.card2, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ color: C.text, margin: 0, fontSize: 15 }}>{editing ? "Edit Medium" : "Add Medium"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <input style={inp} placeholder="ID (e.g. gujarati)"
            value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
            disabled={!!editing} />
          <input style={inp} placeholder="Display name (e.g. Gujarati)"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...inp, width: 120, flex: "0 0 120px" }} type="number" placeholder="Sort order"
            value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: C.muted, fontSize: 13, flex: 1 }}>
            <input type="checkbox" checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            Active
          </label>
          <button style={btn()} onClick={save}>{editing ? "Update" : "Add Medium"}</button>
          {editing && <button style={ghostBtn} onClick={() => { setEditing(null); setForm({ id: "", name: "", sort_order: 0, is_active: true }) }}>Cancel</button>}
        </div>
      </div>

      {/* Bulk Import */}
      <div style={{ background: C.card2, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ color: C.text, margin: 0, fontSize: 15 }}>Bulk Import (JSON)</h3>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
          Paste a JSON array: <code style={{ color: C.yellow }}>[{`{"id":"hindi","name":"Hindi","sort_order":2}`}, …]</code>
        </p>
        <textarea
          style={{ ...inp, minHeight: 120, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
          placeholder='[{"id":"english","name":"English","sort_order":1},{"id":"hindi","name":"Hindi","sort_order":2}]'
          value={importJson}
          onChange={e => setImport(e.target.value)}
        />
        {importResult && (
          <p style={{ fontSize: 12, color: importResult.errors?.length ? C.red : C.green, margin: 0 }}>
            {importResult.inserted} inserted · {importResult.updated} updated · {importResult.errors?.length || 0} errors
            {importResult.errors?.length > 0 && ": " + importResult.errors.map(e => `Row ${e.row}: ${e.error}`).join("; ")}
          </p>
        )}
        <button style={btn(C.blue)} onClick={doImport} disabled={importing}>
          {importing ? "Importing…" : "Import"}
        </button>
      </div>

      {/* Search filter */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ ...inp, flex: "1 1 200px", minWidth: 0 }} placeholder="Search by name or ID…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <span style={{ color: C.muted, fontSize: 12, whiteSpace: "nowrap" }}>{filtered.length} mediums</span>
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
        onDelete={del}
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
      if (res.ok) { toast("Updated"); setEditing(null); setForm({ board_id: "", standard_id: "", medium_id: "", subjects: "", is_active: true }); load() }
      else { const d = await res.json(); toast(d.detail || "Error", "error") }
    } else {
      const res = await API('/admin/curriculum', {
        method: 'POST',
        body: JSON.stringify({ board_id: form.board_id, standard_id: form.standard_id, medium_id: form.medium_id, subjects, is_active: form.is_active }),
      })
      if (res.ok) { toast("Created"); setForm({ board_id: "", standard_id: "", medium_id: "", subjects: "", is_active: true }); load() }
      else { const d = await res.json(); toast(d.detail || "Error", "error") }
    }
  }

  const del = async row => {
    if (!confirm(`Delete curriculum for ${row.board_name} / ${row.standard_name} / ${row.medium_name}?`)) return
    await API(`/admin/curriculum/${row.id}`, { method: 'DELETE' })
    toast("Deleted"); load()
  }

  const edit = row => {
    setEditing(row)
    setForm({ board_id: row.board_id, standard_id: row.standard_id, medium_id: row.medium_id,
      subjects: (Array.isArray(row.subjects) ? row.subjects : []).join(", "), is_active: row.is_active })
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Add/Edit form */}
      <div style={{ background: C.card2, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ color: C.text, margin: 0, fontSize: 15 }}>{editing ? "Edit Curriculum Row" : "Add Curriculum Row"}</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select style={{ ...inp, flex: "1 1 120px" }} value={form.board_id}
            onChange={e => setForm(f => ({ ...f, board_id: e.target.value }))} disabled={!!editing}>
            <option value="">Board…</option>
            {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select style={{ ...inp, flex: "1 1 120px" }} value={form.standard_id}
            onChange={e => setForm(f => ({ ...f, standard_id: e.target.value }))} disabled={!!editing}>
            <option value="">Standard…</option>
            {stds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select style={{ ...inp, flex: "1 1 120px" }} value={form.medium_id}
            onChange={e => setForm(f => ({ ...f, medium_id: e.target.value }))} disabled={!!editing}>
            <option value="">Medium…</option>
            {meds.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <textarea
          style={{ ...inp, minHeight: 80, resize: "vertical" }}
          placeholder="Subjects (comma-separated): Mathematics, Science, English…"
          value={form.subjects}
          onChange={e => setForm(f => ({ ...f, subjects: e.target.value }))}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6, color: C.muted, fontSize: 13 }}>
          <input type="checkbox" checked={form.is_active}
            onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          Active
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn()} onClick={save}>{editing ? "Update" : "Add Row"}</button>
          {editing && <button style={ghostBtn} onClick={() => { setEditing(null); setForm({ board_id: "", standard_id: "", medium_id: "", subjects: "", is_active: true }) }}>Cancel</button>}
        </div>
      </div>

      {/* Bulk Import */}
      <div style={{ background: C.card2, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ color: C.text, margin: 0, fontSize: 15 }}>Bulk Import (JSON)</h3>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
          Paste a JSON array: <code style={{ color: C.yellow }}>[{"{"}"board":"CBSE","standard":"Class 10","medium":"English","subjects":["Math","Science"]{"}"}, …]</code>
        </p>
        <textarea
          style={{ ...inp, minHeight: 120, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
          placeholder='[{"board":"CBSE","standard":"Class 10","medium":"English","subjects":["Mathematics","Science"]}]'
          value={importJson}
          onChange={e => setImport(e.target.value)}
        />
        {importResult && (
          <p style={{ fontSize: 12, color: importResult.errors?.length ? C.red : C.green, margin: 0 }}>
            {importResult.inserted} inserted · {importResult.updated} updated · {importResult.errors?.length || 0} errors
            {importResult.errors?.length > 0 && ": " + importResult.errors.map(e => `Row ${e.row}: ${e.error}`).join("; ")}
          </p>
        )}
        <button style={btn(C.blue)} onClick={doImport} disabled={importing}>
          {importing ? "Importing…" : "Import"}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select style={{ ...inp, flex: "1 1 130px", minWidth: 0 }} value={filter.board}
          onChange={e => setFilter(f => ({ ...f, board: e.target.value }))}>
          <option value="">All Boards</option>
          {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select style={{ ...inp, flex: "1 1 130px", minWidth: 0 }} value={filter.standard}
          onChange={e => setFilter(f => ({ ...f, standard: e.target.value }))}>
          <option value="">All Standards</option>
          {stds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select style={{ ...inp, flex: "1 1 130px", minWidth: 0 }} value={filter.medium}
          onChange={e => setFilter(f => ({ ...f, medium: e.target.value }))}>
          <option value="">All Mediums</option>
          {meds.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <span style={{ color: C.muted, fontSize: 12, alignSelf: "center", whiteSpace: "nowrap" }}>
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
        onEdit={edit}
        onDelete={del}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: C.muted }}>Period:</label>
          <select
            style={{ ...inp.background && inp, width: 120 }}
            value={days}
            onChange={e => setDays(Number(e.target.value))}
          >
            {[7, 14, 30].map(d => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: C.muted }}>Day detail:</label>
          <input
            type="date"
            style={{ ...inp, width: 160 }}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <button style={{ ...ghostBtn, padding: "8px 14px", fontSize: 12 }} onClick={loadSummary}>
          {loading ? "…" : "↺ Refresh"}
        </button>
      </div>

      {/* All-time totals */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {[
            { label: "Total Calls (all time)", value: fmtK(summary.all_time?.calls), color: C.blue },
            { label: "Total Tokens (all time)", value: fmtK(summary.all_time?.tokens), color: C.green },
            { label: `Calls (${days}d)`, value: fmtK(summary.daily?.reduce((s, d) => s + (d.calls || 0), 0)), color: C.yellow },
            { label: `Tokens (${days}d)`, value: fmtK(summary.daily?.reduce((s, d) => s + (d.tokens || 0), 0)), color: C.orange },
          ].map(stat => (
            <div key={stat.label} style={{
              background: C.card2, borderRadius: 12, padding: 16,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Per-plan breakdown */}
      {summary?.by_plan?.length > 0 && (
        <div style={{ background: C.card2, borderRadius: 14, padding: 20 }}>
          <h3 style={{ color: C.text, margin: "0 0 14px", fontSize: 14 }}>By Plan (last {days} days)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {summary.by_plan.map(row => (
              <div key={row.plan} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                <span style={{ width: 70, fontWeight: 700, color: PLAN_COLORS[row.plan] || C.muted }}>
                  {row.plan?.charAt(0).toUpperCase() + row.plan?.slice(1)}
                </span>
                <span style={{ color: C.text, width: 80 }}>{fmtK(row.calls)} calls</span>
                <span style={{ color: C.muted, width: 90 }}>{fmtK(row.tokens)} tokens</span>
                <span style={{ color: C.muted, fontSize: 11 }}>{row.active_users} users</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily chart (simple text bars) */}
      {summary?.daily?.length > 0 && (
        <div style={{ background: C.card2, borderRadius: 14, padding: 20 }}>
          <h3 style={{ color: C.text, margin: "0 0 14px", fontSize: 14 }}>Daily Calls</h3>
          {(() => {
            const maxCalls = Math.max(...summary.daily.map(d => d.calls || 0), 1)
            return summary.daily.map(d => (
              <div key={d.date} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: C.muted, width: 80, flexShrink: 0 }}>{d.date?.slice(5)}</span>
                <div style={{ flex: 1, height: 10, background: C.card, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.round((d.calls / maxCalls) * 100)}%`,
                    background: C.blue,
                    borderRadius: 4,
                  }} />
                </div>
                <span style={{ fontSize: 11, color: C.text, width: 50, textAlign: "right" }}>{d.calls}</span>
              </div>
            ))
          })()}
        </div>
      )}

      {/* Top users for selected date */}
      <div>
        <h3 style={{ color: C.text, margin: "0 0 12px", fontSize: 14 }}>Users — {date}</h3>
        {topUsers.length === 0 ? (
          <p style={{ color: C.muted, fontSize: 13 }}>No usage recorded for this date.</p>
        ) : (
          <Table
            cols={[
              { key: "name",          label: "Name" },
              { key: "email",         label: "Email" },
              { key: "plan",          label: "Plan", render: v => <span style={{ color: PLAN_COLORS[v] || C.muted, fontWeight: 700 }}>{v}</span> },
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
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(null)   // { id, name, email, plan, plan_expires_at }
  const [editPlan,    setEditPlan]    = useState('free')
  const [editExpiry,  setEditExpiry]  = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search)     params.set('search', search)
      if (planFilter) params.set('plan', planFilter)
      const res = await API(`/admin/users?${params}`)
      if (res.ok) setUsers(await res.json())
    } finally {
      setLoading(false)
    }
  }, [search, planFilter])

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Edit Plan Modal */}
      {editing && (
        <div style={{
          position: "fixed", inset: 0, background: "#000a", zIndex: 999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{ background: C.card, borderRadius: 18, padding: 28, width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ color: C.text, margin: 0, fontSize: 16 }}>Change Plan — {editing.name}</h3>
            <div style={{ fontSize: 12, color: C.muted }}>{editing.email}</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Plan</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PLAN_OPTIONS.map(p => {
                  const m = PLAN_META[p]
                  return (
                    <button
                      key={p}
                      onClick={() => setEditPlan(p)}
                      style={{
                        padding: "8px 16px", borderRadius: 10, fontFamily: "Sora, sans-serif",
                        fontWeight: 700, fontSize: 13, cursor: "pointer",
                        background: editPlan === p ? `${m.color}25` : "transparent",
                        border: `2px solid ${editPlan === p ? m.color : C.border}`,
                        color: editPlan === p ? m.color : C.muted,
                      }}
                    >{m.icon} {m.label}</button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
                Expires on (leave blank = no expiry)
              </label>
              <input
                type="date"
                style={inp}
                value={editExpiry}
                onChange={e => setEditExpiry(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button style={btn()} onClick={savePlan} disabled={saving}>
                {saving ? "Saving…" : "Save Plan"}
              </button>
              <button style={ghostBtn} onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...inp, flex: "1 1 200px", minWidth: 0 }}
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ ...inp, width: 160, flex: "0 0 160px" }}
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
        >
          <option value="">All Plans</option>
          {PLAN_OPTIONS.map(p => (
            <option key={p} value={p}>{PLAN_META[p].icon} {PLAN_META[p].label}</option>
          ))}
        </select>
        <span style={{ color: C.muted, fontSize: 12, whiteSpace: "nowrap" }}>
          {loading ? "Loading…" : `${users.length} users`}
        </span>
      </div>

      {/* Table */}
      <Table
        cols={[
          { key: "name",  label: "Name" },
          { key: "email", label: "Email" },
          { key: "standard", label: "Class" },
          { key: "plan",  label: "Plan", render: (v) => {
            const m = PLAN_META[v] || PLAN_META.free
            return <span style={{ color: m.color, fontWeight: 700 }}>{m.icon} {m.label}</span>
          }},
          { key: "plan_expires_at", label: "Expires", render: v => v || "—" },
          { key: "xp",   label: "XP" },
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
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(null)   // which plan is saving
  // API key editing state
  const [keyInputs, setKeyInputs]   = useState({})    // {provider: value}
  const [keyVisible, setKeyVisible] = useState({})    // {provider: bool}
  const [keySaving, setKeySaving]   = useState(null)  // which provider is saving
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
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const saveApiKey = async (provider) => {
    const key = (keyInputs[provider] || "").trim()
    if (!key) { toast("Key cannot be empty", "error"); return }
    setKeySaving(provider)
    try {
      const res = await API('/admin/ai-keys', {
        method: 'PUT',
        body: JSON.stringify({ provider, key }),
      })
      if (res.ok) {
        toast(`${ADMIN_PROVIDERS[provider]?.label} key saved`)
        setKeyStatus(s => ({ ...s, [provider]: true }))
        setKeyInputs(k => ({ ...k, [provider]: "" }))
      } else {
        const d = await res.json()
        toast(d.detail || "Failed to save key", "error")
      }
    } finally {
      setKeySaving(null)
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
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Section 0: Provider API Keys ── */}
      <div style={{ background: C.card2, borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h3 style={{ color: C.text, margin: "0 0 4px", fontSize: 15 }}>Provider API Keys</h3>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
            Keys are stored server-side only and never returned to this browser.
            A green dot means a key is active. Paste a new key and click Save to update.
          </p>
        </div>
        {Object.entries(ADMIN_PROVIDERS).map(([provider, meta]) => {
          const hasKey = !!keyStatus[provider]
          const inputVal = keyInputs[provider] || ""
          const isVisible = !!keyVisible[provider]
          return (
            <div key={provider} style={{
              background: C.card, borderRadius: 12, padding: "14px 16px",
              border: `1px solid ${hasKey ? meta.color + "40" : C.border}`,
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {/* Provider header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{meta.icon}</span>
                <span style={{ color: meta.color, fontWeight: 700, fontSize: 13, flex: 1 }}>{meta.label}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                  background: hasKey ? `${meta.color}20` : `${C.red}20`,
                  color: hasKey ? meta.color : C.red,
                  border: `1px solid ${hasKey ? meta.color + "40" : C.red + "40"}`,
                }}>
                  {hasKey ? "● Key set" : "○ No key"}
                </span>
              </div>
              {/* Key input row */}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    style={{ ...inp, paddingRight: 40 }}
                    type={isVisible ? "text" : "password"}
                    placeholder={hasKey ? "Enter new key to replace…" : `Paste ${meta.label} key…`}
                    value={inputVal}
                    onChange={e => setKeyInputs(k => ({ ...k, [provider]: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && saveApiKey(provider)}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => setKeyVisible(v => ({ ...v, [provider]: !v[provider] }))}
                    style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: C.muted, fontSize: 14, padding: 0,
                    }}
                  >{isVisible ? "🙈" : "👁"}</button>
                </div>
                <button
                  style={{ ...btn(meta.color), padding: "9px 16px", fontSize: 12, flexShrink: 0,
                    color: provider === "gemini" ? "#04040e" : provider === "groq" ? "#04040e" : "#fff" }}
                  onClick={() => saveApiKey(provider)}
                  disabled={keySaving === provider || !inputVal.trim()}
                >
                  {keySaving === provider ? "Saving…" : "Save Key"}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Section 1: Global Plan Routing ── */}
      <div style={{ background: C.card2, borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h3 style={{ color: C.text, margin: "0 0 4px", fontSize: 15 }}>Global Plan Routing</h3>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
            Set which AI provider + model is used for each plan tier. Changes take effect immediately for all new requests.
          </p>
        </div>

        {loading ? (
          <p style={{ color: C.muted, fontSize: 13 }}>Loading…</p>
        ) : (
          ["free", "basic", "pro", "premium"].map(plan => {
            const entry = routing[plan] || { provider: "gemini", model: "gemini-2.0-flash" }
            const provMeta = ADMIN_PROVIDERS[entry.provider] || ADMIN_PROVIDERS.gemini
            return (
              <div key={plan} style={{
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                background: C.card, borderRadius: 12, padding: "14px 16px",
                border: `1px solid ${C.border}`,
              }}>
                <span style={{ width: 90, fontWeight: 700, color: PLAN_COLORS[plan] || C.muted, fontSize: 13 }}>
                  {PLAN_LABELS[plan]}
                </span>

                {/* Provider select */}
                <select
                  style={{ ...inp, width: 170, flex: "0 0 170px" }}
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
                  style={{ ...inp, flex: "1 1 220px", minWidth: 0 }}
                  value={entry.model}
                  onChange={e => setRouting(r => ({ ...r, [plan]: { ...entry, model: e.target.value } }))}
                >
                  {(ADMIN_PROVIDERS[entry.provider]?.models || []).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <button
                  style={{ ...btn(provMeta.color), padding: "9px 16px", fontSize: 12, flexShrink: 0 }}
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
      <div style={{ background: C.card2, borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h3 style={{ color: C.text, margin: "0 0 4px", fontSize: 15 }}>Per-User AI Override</h3>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
            Force a specific provider + model for an individual user, regardless of their plan. Useful for testing or special accounts.
          </p>
        </div>

        {/* Search */}
        <div style={{ display: "flex", gap: 10 }}>
          <input
            style={{ ...inp, flex: 1, minWidth: 0 }}
            placeholder="Search by name or email…"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchUsers()}
          />
          <button style={{ ...btn(), padding: "9px 16px", fontSize: 12, flexShrink: 0 }}
            onClick={searchUsers} disabled={userLoading}>
            {userLoading ? "…" : "Search"}
          </button>
        </div>

        {/* User edit modal */}
        {editingUser && (
          <div style={{
            position: "fixed", inset: 0, background: "#000a", zIndex: 999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}>
            <div style={{
              background: C.card, borderRadius: 18, padding: 28,
              width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 16,
            }}>
              <div>
                <h3 style={{ color: C.text, margin: "0 0 4px", fontSize: 16 }}>AI Config — {editingUser.name}</h3>
                <div style={{ fontSize: 12, color: C.muted }}>{editingUser.email} · {editingUser.plan}</div>
              </div>

              {editingUser.ai_admin_override && (
                <div style={{
                  background: `${C.yellow}15`, border: `1px solid ${C.yellow}40`,
                  borderRadius: 8, padding: "8px 12px", fontSize: 12, color: C.yellow,
                }}>
                  ⚠ Admin override is active — this user is using a fixed provider+model.
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Provider</label>
                <select
                  style={inp}
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

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Model</label>
                <select
                  style={inp}
                  value={uModel}
                  onChange={e => setUModel(e.target.value)}
                >
                  {(ADMIN_PROVIDERS[uProvider]?.models || []).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={btn()} onClick={() => saveUserOverride(false)} disabled={uSaving}>
                  {uSaving ? "Saving…" : "Apply Override"}
                </button>
                {editingUser.ai_admin_override && (
                  <button style={btn(C.red)} onClick={() => saveUserOverride(true)} disabled={uSaving}>
                    Clear Override
                  </button>
                )}
                <button style={ghostBtn} onClick={() => setEditingUser(null)}>Cancel</button>
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
                <span style={{ color: PLAN_COLORS[v] || C.muted, fontWeight: 700 }}>{v}</span>
              )},
              { key: "ai_provider", label: "Provider", render: (v, row) => (
                <span style={{ color: row.ai_admin_override ? C.yellow : C.muted, fontSize: 12 }}>
                  {row.ai_admin_override ? "⚠ " : ""}{v || "—"}
                </span>
              )},
              { key: "ai_model", label: "Model", render: (v, row) => (
                <span style={{ fontSize: 11, color: row.ai_admin_override ? C.yellow : C.muted }}>
                  {v || "—"}
                </span>
              )},
            ]}
            rows={users}
            onEdit={openUserEdit}
          />
        )}
        {users.length === 0 && userSearch && !userLoading && (
          <p style={{ color: C.muted, fontSize: 13 }}>No users found.</p>
        )}
      </div>
    </div>
  )
}

// ── Main Admin Panel ──────────────────────────────────────────
export default function AdminPanel() {
  const navigate  = useNavigate()
  const { section = 'curriculum' } = useParams()
  const activeTab = ['curriculum','boards','standards','mediums','users','usage','aiconfig'].includes(section)
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
  ]

  const contentMap = {
    curriculum: <CurriculumTab toast={showToast} />,
    boards:     <BoardsTab     toast={showToast} />,
    standards:  <StandardsTab  toast={showToast} />,
    mediums:    <MediumsTab    toast={showToast} />,
    users:      <UsersTab      toast={showToast} />,
    usage:      <UsageTab      toast={showToast} />,
    aiconfig:   <AIConfigTab   toast={showToast} />,
  }

  // Shared title bar rendered inside content area for all breakpoints
  const ContentTitle = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <h2 style={{ color: C.text, fontWeight: 800, fontSize: 20, margin: 0 }}>
        {TABS.find(t => t.id === activeTab)?.label}
      </h2>
    </div>
  )

  // ── Desktop: sidebar + content ──────────────────────────────
  if (isDesktop) {
    return (
      <div className="admin-panel-root" style={{ background: C.bg }}>
        {/* Header */}
        <div style={{
          background: C.card, borderBottom: `1px solid ${C.border}`,
          padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>⚙️</span>
            <div>
              <div style={{ color: C.text, fontWeight: 800, fontSize: 16 }}>Eduvy-AI Admin Panel</div>
              {adminInfo && <div style={{ color: C.muted, fontSize: 12 }}>{adminInfo.name} · {adminInfo.email}</div>}
            </div>
          </div>
          <button style={{ ...ghostBtn, padding: "8px 18px" }} onClick={logout}>Logout</button>
        </div>

        {/* Body: sidebar + main */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Sidebar */}
          <div style={{
            width: 220, background: C.card, borderRight: `1px solid ${C.border}`,
            display: "flex", flexDirection: "column", padding: "20px 12px", gap: 4,
            flexShrink: 0, overflowY: "auto",
          }}>
            <p style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 8, paddingLeft: 10 }}>NAVIGATION</p>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: activeTab === t.id ? `${C.green}15` : "transparent",
                border: `1.5px solid ${activeTab === t.id ? C.green + "40" : "transparent"}`,
                borderRadius: 10, padding: "11px 14px",
                display: "flex", alignItems: "center", gap: 10,
                cursor: "pointer", fontFamily: "Sora, sans-serif", textAlign: "left",
              }}>
                <span style={{ fontSize: 18 }}>{t.short}</span>
                <span style={{ fontSize: 14, fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? C.green : C.text }}>
                  {t.label.slice(2)}
                </span>
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button style={{ ...ghostBtn, width: "100%", marginTop: 12, fontSize: 13 }} onClick={logout}>← Logout</button>
          </div>

          {/* Main content — scrolls internally */}
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
            <div style={{ maxWidth: 960, margin: "0 auto" }}>
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
    <div className="admin-panel-root" style={{ background: C.bg }}>
      {/* Header */}
      <div style={{
        background: C.card, borderBottom: `1px solid ${C.border}`,
        padding: isMobile ? "12px 16px" : "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: isMobile ? 18 : 20 }}>⚙️</span>
          <div>
            <div style={{ color: C.text, fontWeight: 800, fontSize: isMobile ? 14 : 15 }}>Eduvy-AI Admin</div>
            {adminInfo && !isMobile && <div style={{ color: C.muted, fontSize: 11 }}>{adminInfo.email}</div>}
          </div>
        </div>
        <button
          style={{ ...ghostBtn, padding: isMobile ? "6px 12px" : "8px 16px", fontSize: 12 }}
          onClick={logout}
        >{isMobile ? "✕ Exit" : "Logout"}</button>
      </div>

      {/* Tab bar */}
      <div style={{
        background: C.card, borderBottom: `1px solid ${C.border}`,
        display: "flex", overflowX: "auto", padding: "0 8px",
        flexShrink: 0,
        msOverflowStyle: "none", scrollbarWidth: "none",
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "transparent", border: "none",
              borderBottom: activeTab === t.id ? `2px solid ${C.green}` : "2px solid transparent",
              padding: isMobile ? "10px 14px" : "12px 18px",
              color: activeTab === t.id ? C.green : C.muted,
              fontSize: isMobile ? 12 : 13,
              fontWeight: activeTab === t.id ? 700 : 500,
              fontFamily: "Sora, sans-serif",
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >{isMobile ? t.short : t.label}</button>
        ))}
      </div>

      {/* Content — scrolls internally, uniform padding */}
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px 14px" : "24px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <ContentTitle />
          {contentMap[activeTab]}
        </div>
      </div>

      {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}
