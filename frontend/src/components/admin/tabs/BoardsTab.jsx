import { useState, useEffect, useCallback } from 'react'
import { API, inputClass, btnClass, ghostBtnClass, Modal, ConfirmDialog, Table, LoadingOverlay } from '../shared'

export default function BoardsTab({ toast }) {
  const [boards, setBoards]     = useState([])
  const [search, setSearch]     = useState("")
  const [form, setForm]         = useState({ id: "", name: "", sort_order: 0, is_active: true })
  const [editing, setEditing]   = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [confirmRow, setConfirmRow] = useState(null)
  const [importJson, setImport] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [confirmBulk, setConfirmBulk] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await API('/admin/boards')
      const d = await r.json()
      setBoards(Array.isArray(d) ? d : [])
    } catch {}
    setLoading(false)
  }, [])

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
    setLoading(true)
    const method = editing ? 'PUT' : 'POST'
    const path   = editing ? `/admin/boards/${editing.id}` : '/admin/boards'
    const res = await API(path, { method, body: JSON.stringify({
      id: form.id.toLowerCase().trim(),
      name: form.name.trim(),
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    }) })
    setLoading(false)
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
    setLoading(true)
    await API(`/admin/boards/${confirmRow.id}`, { method: 'DELETE' })
    setLoading(false)
    toast("Board deleted"); setConfirmRow(null); load()
  }

  const bulkDel = async () => {
    if (!selectedIds.size) return
    setLoading(true)
    await API('/admin/boards/bulk-delete', { method: 'POST', body: JSON.stringify({ ids: [...selectedIds] }) })
    setLoading(false)
    toast(`${selectedIds.size} board${selectedIds.size > 1 ? 's' : ''} deleted`)
    setSelectedIds(new Set())
    setConfirmBulk(false)
    load()
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
    <div className="flex flex-col gap-5 relative">
      <LoadingOverlay show={loading} />
      
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
          message={`Permanently delete board "${confirmRow.name}"? This will also delete all curriculum entries linked to this board.`}
          onConfirm={del}
          onCancel={() => setConfirmRow(null)}
        />
      )}

      {confirmBulk && (
        <ConfirmDialog
          message={`Permanently delete ${selectedIds.size} selected board${selectedIds.size > 1 ? 's' : ''}? All linked curriculum entries will also be deleted.`}
          onConfirm={bulkDel}
          onCancel={() => setConfirmBulk(false)}
        />
      )}

      {/* Top action bar */}
      <div className="flex gap-2.5 items-center flex-wrap">
        <button className={btnClass('green')} onClick={openAdd}>+ Add Board</button>
        {selectedIds.size > 0 && (
          <button className={btnClass('red')} onClick={() => setConfirmBulk(true)}>
            Delete Selected ({selectedIds.size})
          </button>
        )}
        {selectedIds.size > 0 && (
          <button className={ghostBtnClass} onClick={() => setSelectedIds(new Set())}>Clear Selection</button>
        )}
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
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
      />
    </div>
  )
}
