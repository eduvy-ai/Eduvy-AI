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

// ── Main Admin Panel ──────────────────────────────────────────
export default function AdminPanel() {
  const navigate  = useNavigate()
  const { section = 'curriculum' } = useParams()
  const activeTab = ['curriculum','boards','standards','mediums'].includes(section)
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
  ]

  const contentMap = {
    curriculum: <CurriculumTab toast={showToast} />,
    boards:     <BoardsTab     toast={showToast} />,
    standards:  <StandardsTab  toast={showToast} />,
    mediums:    <MediumsTab    toast={showToast} />,
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
