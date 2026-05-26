import { useState, useEffect, useCallback } from 'react'
import { API, inputClass, btnClass, ghostBtnClass, Modal, ConfirmDialog, Table, LoadingOverlay } from '../shared'

export default function CurriculumTab({ toast }) {
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
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await API('/admin/curriculum')
      const d = await r.json()
      setRows(Array.isArray(d) ? d : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    API('/admin/boards').then(r => r.json()).then(d => setBoards(Array.isArray(d) ? d : [])).catch(() => {})
    API('/admin/standards').then(r => r.json()).then(d => setStds(Array.isArray(d) ? d : [])).catch(() => {})
    API('/admin/mediums').then(r => r.json()).then(d => setMeds(Array.isArray(d) ? d : [])).catch(() => {})
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
    setLoading(true)
    if (editing) {
      const res = await API(`/admin/curriculum/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ subjects, is_active: form.is_active }),
      })
      setLoading(false)
      if (res.ok) { toast("Updated"); setShowModal(false); setEditing(null); setForm({ board_id: "", standard_id: "", medium_id: "", subjects: "", is_active: true }); load() }
      else { const d = await res.json(); toast(d.detail || "Error", "error") }
    } else {
      const res = await API('/admin/curriculum', {
        method: 'POST',
        body: JSON.stringify({ board_id: form.board_id, standard_id: form.standard_id, medium_id: form.medium_id, subjects, is_active: form.is_active }),
      })
      setLoading(false)
      if (res.ok) { toast("Created"); setShowModal(false); setForm({ board_id: "", standard_id: "", medium_id: "", subjects: "", is_active: true }); load() }
      else { const d = await res.json(); toast(d.detail || "Error", "error") }
    }
  }

  const del = async () => {
    if (!confirmRow) return
    setLoading(true)
    await API(`/admin/curriculum/${confirmRow.id}`, { method: 'DELETE' })
    setLoading(false)
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
    <div className="flex flex-col gap-5 relative">
      <LoadingOverlay show={loading} />
      
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
