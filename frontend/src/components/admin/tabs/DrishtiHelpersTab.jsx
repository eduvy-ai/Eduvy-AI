import { useState, useEffect, useCallback } from 'react'
import { API, inputClass, btnClass, ghostBtnClass, Modal, ConfirmDialog, Table, LoadingOverlay } from '../shared'

// ── Drishti Helpers Tab ──────────────────────────────────────
export default function DrishtiHelpersTab({ toast }) {
  const [helpers, setHelpers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [newToken, setNewToken]  = useState(null)
  const [form, setForm]         = useState({ helper_name: '', helper_email: '', helper_type: 'teacher', notes: '' })

  // Selection & delete state
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmBulk, setConfirmBulk] = useState(false)

  // Student assignment state
  const [assignModal, setAssignModal] = useState(null)
  const [assignedStudents, setAssignedStudents] = useState([])
  const [allDrishtiStudents, setAllDrishtiStudents] = useState([])
  const [assignLoading, setAssignLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await API('/admin/drishti-helpers')
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
      const path = editing ? `/admin/drishti-helpers/${editing.id}` : '/admin/drishti-helpers'
      const r = await API(path, {
        method,
        body: JSON.stringify(form),
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Save failed') }
      const d = await r.json()
      if (!editing && d.helper_token) setNewToken(d.helper_token)
      else { toast(editing ? 'Helper updated' : 'Helper created'); setShowModal(false) }
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  // ── Delete (permanent) ──
  const deleteHelper = async (helper) => {
    try {
      const r = await API(`/admin/drishti-helpers/${helper.id}/permanent`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed to delete')
      toast('Helper deleted permanently')
      setConfirmDelete(null)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  // ── Bulk Delete ──
  const bulkDelete = async () => {
    if (!selectedIds.size) return
    try {
      const r = await API('/admin/drishti-helpers/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: [...selectedIds] }),
      })
      if (!r.ok) throw new Error('Bulk delete failed')
      toast(`${selectedIds.size} helper${selectedIds.size > 1 ? 's' : ''} deleted`)
      setSelectedIds(new Set())
      setConfirmBulk(false)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const deactivate = async (id) => {
    try {
      const r = await API(`/admin/drishti-helpers/${id}`, { method: 'DELETE' })
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
        API(`/admin/drishti-helpers/${helper.id}/students`),
        API('/admin/drishti-students'),
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
      const r = await API(`/admin/drishti-helpers/${assignModal.id}/assign/${studentId}`, { method: 'POST' })
      if (!r.ok) throw new Error('Failed to assign')
      toast('Student assigned')
      openAssignModal(assignModal) // refresh
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const unassignStudent = async (studentId) => {
    try {
      const r = await API(`/admin/drishti-helpers/${assignModal.id}/assign/${studentId}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed to unassign')
      toast('Student removed')
      openAssignModal(assignModal) // refresh
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const assignedIds = new Set(assignedStudents.map(s => s.id))
  const unassignedStudents = allDrishtiStudents.filter(s => !assignedIds.has(s.id))

  // ── Table Columns ──
  const cols = [
    { key: 'helper_name', label: 'Name' },
    { key: 'helper_email', label: 'Email' },
    { key: 'helper_type', label: 'Type' },
    { key: 'student_count', label: 'Students', render: (v) => v || 0 },
    { key: 'is_active', label: 'Status', render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
    { key: 'token_preview', label: 'Token', render: (v) => <code className="text-app-yellow text-[11px]">{v}</code> },
    {
      key: 'actions', label: '', render: (_, row) => (
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => openAssignModal(row)} className={`${ghostBtnClass} py-1 px-2.5 text-[11px] text-app-blue border-app-blue/40`}>👥 Assign</button>
          {row.is_active && (
            <button onClick={() => deactivate(row.id)} className={`${ghostBtnClass} py-1 px-2.5 text-[11px] text-app-yellow border-app-yellow/40`}>Deactivate</button>
          )}
        </div>
      )
    },
  ]

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <button onClick={openCreate} className={`${btnClass()} py-2.5 px-[18px] w-auto`}>+ Add Helper</button>
        {selectedIds.size > 0 && (
          <button onClick={() => setConfirmBulk(true)} className={`${btnClass('red')} py-2.5 px-[18px] w-auto`}>
            🗑️ Delete Selected ({selectedIds.size})
          </button>
        )}
        {selectedIds.size > 0 && (
          <button className={ghostBtnClass} onClick={() => setSelectedIds(new Set())}>Clear Selection</button>
        )}
      </div>

      {loading ? <LoadingOverlay show text="Loading helpers…" /> : (
        <Table
          cols={cols}
          rows={helpers}
          onEdit={openEdit}
          onDelete={(row) => setConfirmDelete(row)}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          pageSize={10}
        />
      )}

      {/* Single Delete Confirm */}
      {confirmDelete && (
        <ConfirmDialog
          message={`Permanently delete helper "${confirmDelete.helper_name}"? This will also remove all their assignments and notes.`}
          onConfirm={() => deleteHelper(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Bulk Delete Confirm */}
      {confirmBulk && (
        <ConfirmDialog
          message={`Permanently delete ${selectedIds.size} selected helper${selectedIds.size > 1 ? 's' : ''}? All their assignments and notes will be removed.`}
          onConfirm={bulkDelete}
          onCancel={() => setConfirmBulk(false)}
        />
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
