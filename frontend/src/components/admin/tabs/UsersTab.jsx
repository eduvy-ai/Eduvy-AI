import { useState, useEffect, useCallback } from 'react'
import { API, inputClass, btnClass, ghostBtnClass, Modal, ConfirmDialog, Table, LoadingOverlay, C } from '../shared'

// ── Plan constants ────────────────────────────────────────────
const PLAN_OPTIONS = ['free', 'basic', 'pro', 'premium']
const PLAN_META = {
  free:    { label: 'Free',    icon: '🆓', color: '#6868a0' },
  basic:   { label: 'Basic',   icon: '⭐', color: '#FFD166' },
  pro:     { label: 'Pro',     icon: '🚀', color: '#7B9CFF' },
  premium: { label: 'Premium', icon: '👑', color: '#00E5A0' },
}

export default function UsersTab({ toast }) {
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
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [confirmBulk, setConfirmBulk] = useState(false)

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
      if (res.ok) { const d = await res.json(); setUsers(Array.isArray(d) ? d : []) }
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
    setLoading(true)
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
      setLoading(false)
    }
  }

  const toggleDrishti = async (user) => {
    const newVal = !user.is_drishti
    setLoading(true)
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
    setLoading(false)
  }

  const createDrishtiStudent = async () => {
    const { name, email, password, standard, board, language } = newStudent
    if (!name || !email || !password || !standard || !board) {
      toast('Please fill all required fields', 'error')
      return
    }
    setCreating(true)
    setLoading(true)
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
    setLoading(false)
  }

  const bulkDel = async () => {
    if (!selectedIds.size) return
    setLoading(true)
    await API('/admin/users/bulk-delete', { method: 'POST', body: JSON.stringify({ ids: [...selectedIds] }) })
    setLoading(false)
    toast(`${selectedIds.size} user${selectedIds.size > 1 ? 's' : ''} deleted`)
    setSelectedIds(new Set())
    setConfirmBulk(false)
    load()
  }

  return (
    <div className="flex flex-col gap-5 relative">
      <LoadingOverlay show={loading} />
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
        {selectedIds.size > 0 && (
          <button className={btnClass('red')} onClick={() => setConfirmBulk(true)}>
            Delete Selected ({selectedIds.size})
          </button>
        )}
        {selectedIds.size > 0 && (
          <button className={ghostBtnClass} onClick={() => setSelectedIds(new Set())}>Clear Selection</button>
        )}
        <span className="text-app-muted text-xs whitespace-nowrap">
          {`${users.length} users`}
        </span>
      </div>

      {/* Bulk Delete Confirm */}
      {confirmBulk && (
        <ConfirmDialog
          message={`Permanently delete ${selectedIds.size} selected user${selectedIds.size > 1 ? 's' : ''}? All their data will be lost.`}
          onConfirm={bulkDel}
          onCancel={() => setConfirmBulk(false)}
        />
      )}

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
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
      />
    </div>
  )
}
