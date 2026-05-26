import { useState, useEffect, useCallback } from 'react'
import { API, inputClass, btnClass, ghostBtnClass, Modal, ConfirmDialog, Table, LoadingOverlay } from '../shared'

export default function StandardsTab({ toast }) {
  const [stds, setStds]         = useState([])
  const [search, setSearch]     = useState("")
  const [form, setForm]         = useState({ id: "", name: "", grade_num: "", sort_order: 0, is_active: true })
  const [editing, setEditing]   = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [confirmRow, setConfirmRow] = useState(null)
  const [importJson, setImport] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await API('/admin/standards')
      const d = await r.json()
      setStds(Array.isArray(d) ? d : [])
    } catch {}
    setLoading(false)
  }, [])

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
    setLoading(true)
    const method = editing ? 'PUT' : 'POST'
    const path   = editing ? `/admin/standards/${editing.id}` : '/admin/standards'
    const res = await API(path, { method, body: JSON.stringify({
      id: form.id.toLowerCase().trim(),
      name: form.name.trim(),
      grade_num: Number(form.grade_num),
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    }) })
    setLoading(false)
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
    setLoading(true)
    await API(`/admin/standards/${confirmRow.id}`, { method: 'DELETE' })
    setLoading(false)
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
    <div className="flex flex-col gap-5 relative">
      <LoadingOverlay show={loading} />
      
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
