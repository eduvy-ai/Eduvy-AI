import { useState, useEffect, useCallback } from 'react'
import { API, C, inputClass, btnClass, ghostBtnClass, Table } from '../shared'

// ── AI Config Constants ───────────────────────────────────────
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

const PLAN_COLORS = {
  free:    '#6868a0',
  basic:   '#FFD166',
  pro:     '#7B9CFF',
  premium: '#00E5A0',
}

// ── AI Config Tab ─────────────────────────────────────────────
export default function AIConfigTab({ toast }) {
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
    setLoading(true)
    try {
      const res = await API('/admin/ai-keys', {
        method: 'PUT',
        body: JSON.stringify({ provider, key, slot }),
      })
      setLoading(false)
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
    setLoading(true)
    try {
      const res = await API(`/admin/ai-keys/${provider}/${slot}`, { method: 'DELETE' })
      setLoading(false)
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

  const savePlanRouting = async (plan) => {
    const entry = routing[plan]
    if (!entry) return
    setSaving(plan)
    setLoading(true)
    try {
      const res = await API('/admin/ai-config', {
        method: 'PUT',
        body: JSON.stringify({ plan, provider: entry.provider, model: entry.model }),
      })
      setLoading(false)
      if (res.ok) {
        toast(`${PLAN_LABELS[plan]} routing saved`)
        loadConfig()
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
    setLoading(true)
    try {
      const res = await API(`/admin/users?search=${encodeURIComponent(userSearch)}`)
      if (res.ok) { const d = await res.json(); setUsers(Array.isArray(d) ? d : []) }
    } finally {
      setUserLoading(false)
      setLoading(false)
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
    setLoading(true)
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
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-7 relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-app-bg/70 rounded-2xl flex items-center justify-center z-10">
          <div className="flex items-center gap-2 bg-app-card2 py-3 px-5 rounded-xl border border-app-border">
            <span className="animate-spin text-lg">⏳</span>
            <span className="text-app-muted text-sm">Loading config…</span>
          </div>
        </div>
      )}

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
