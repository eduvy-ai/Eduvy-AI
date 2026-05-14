import { useState, useEffect } from 'react'
import { COLORS, BOARDS, LANGS, PLANS } from '../shared.js'
import { apiGetParentPin, apiCreateParentPin, apiRevokeParentPin } from '../api.js'

const CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)

// Maps plan → model label shown to student (read-only info)
const PLAN_MODEL_LABEL = {
  free:    'Llama 3 8B (Groq)',
  basic:   'Llama 3.3 70B (Groq)',
  pro:     'Your chosen model',
  premium: 'Your chosen model',
}

export default function SettingsModal({ config, savedKeys = {}, onSave, onClose, profile, onProfileSave }) {
  const [activeTab, setActiveTab] = useState('ai')

  // ── Usage state ──────────────────────────────────────────────
  const [usage, setUsage] = useState(null)
  const [usageLoading, setUsageLoading] = useState(false)

  // ── Profile edit state ───────────────────────────────────────
  const [pName, setPName]     = useState(profile?.name || "")
  const [pStd, setPStd]       = useState(profile?.standard || "Class 10")
  const [pBoard, setPBoard]   = useState(profile?.board || "CBSE")
  const [pLang, setPLang]     = useState(profile?.language || "English")
  const [pSchool, setPSchool] = useState(profile?.school || "")
  const [profileSaved, setProfileSaved] = useState(false)

  // ── Parent PIN state ─────────────────────────────────────────
  const [parentPin,     setParentPin]     = useState(null)
  const [parentExpires, setParentExpires] = useState(null)
  const [pinLoading,    setPinLoading]    = useState(false)
  const [pinCopied,     setPinCopied]     = useState(false)

  const saveProfile = () => {
    if (!pName.trim()) return
    onProfileSave?.({ name: pName.trim(), standard: pStd, board: pBoard, language: pLang, school: pSchool.trim() })
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  // Fetch usage when AI tab is active
  useEffect(() => {
    if (activeTab === 'profile') {
      apiGetParentPin()
        .then(r => { setParentPin(r.pin); setParentExpires(r.expires_at) })
        .catch(() => {})
    }
  }, [activeTab])

  // Fetch usage when AI tab is active
  useEffect(() => {
    if (activeTab !== 'ai') return
    setUsageLoading(true)
    const token = localStorage.getItem('eduvyai_token')
    fetch('/api/ai/usage', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(5000),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setUsage(data); setUsageLoading(false) })
      .catch(() => setUsageLoading(false))
  }, [activeTab])

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.75)",
      zIndex: 999,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: "100%",
        maxWidth: 480,
        background: "#0e0e20",
        borderRadius: "20px 20px 0 0",
        border: `1px solid ${COLORS.border}`,
        maxHeight: "92vh",
        overflowY: "auto",
        paddingBottom: 24,
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#ffffff20" }} />
        </div>

        <div style={{ padding: "8px 18px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: COLORS.text }}>⚙️ Settings</h2>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: COLORS.muted, fontSize: 20, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>✕</button>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", background: COLORS.card, borderRadius: 12, padding: 4, marginBottom: 18, border: `1px solid ${COLORS.border}`, gap: 4 }}>
            {[["ai", "🤖 AI"], ["profile", "👤 Profile"], ["plan", "👑 Plan"]].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  flex: 1,
                  background: activeTab === key ? `linear-gradient(135deg, ${COLORS.green}, #33cc88)` : "transparent",
                  border: "none",
                  borderRadius: 9,
                  padding: "9px 8px",
                  fontSize: 12,
                  fontWeight: activeTab === key ? 800 : 500,
                  color: activeTab === key ? "#04040e" : COLORS.muted,
                  cursor: "pointer",
                  fontFamily: "Sora, sans-serif",
                }}
              >{label}</button>
            ))}
          </div>

          {/* ── Profile Edit tab ── */}
          {activeTab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>YOUR NAME</label>
                <input style={inputStyle} type="text" value={pName} onChange={e => setPName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <label style={labelStyle}>CLASS</label>
                <select style={inputStyle} value={pStd} onChange={e => setPStd(e.target.value)}>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>BOARD</label>
                <select style={inputStyle} value={pBoard} onChange={e => setPBoard(e.target.value)}>
                  {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>LANGUAGE</label>
                <select style={inputStyle} value={pLang} onChange={e => setPLang(e.target.value)}>
                  {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>SCHOOL NAME (for Muqabla Battles)</label>
                <input style={inputStyle} type="text" value={pSchool} onChange={e => setPSchool(e.target.value)} placeholder="e.g. Delhi Public School" maxLength={100} />
              </div>
              <button onClick={saveProfile} style={primaryBtn}>
                {profileSaved ? "✅ Saved!" : "💾 Save Profile"}
              </button>

              {/* ── Share with Parent ── */}
              <div style={{
                marginTop: 8,
                background: `${COLORS.green}0d`,
                border: `1px solid ${COLORS.green}33`,
                borderRadius: 14, padding: '16px',
              }}>
                <div style={{ fontWeight: 700, color: COLORS.green, fontSize: 14, marginBottom: 6 }}>
                  👨‍👩‍👦 Share with Parent
                </div>
                <p style={{ color: COLORS.muted, fontSize: 12, margin: '0 0 12px' }}>
                  Generate a PIN so your parent can view your progress — no account needed.
                </p>
                {parentPin ? (
                  <>
                    <div style={{
                      background: COLORS.card2, borderRadius: 10, padding: '10px 14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: 8,
                    }}>
                      <div>
                        <div style={{ color: COLORS.muted, fontSize: 10, marginBottom: 2 }}>PARENT LINK</div>
                        <div style={{
                          fontFamily: 'monospace', fontSize: 16, fontWeight: 900,
                          color: COLORS.yellow, letterSpacing: 3,
                        }}>{parentPin}</div>
                        <div style={{ color: COLORS.muted, fontSize: 10, marginTop: 2 }}>
                          {window.location.origin}/parent/{parentPin}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(`${window.location.origin}/parent/${parentPin}`)
                          setPinCopied(true)
                          setTimeout(() => setPinCopied(false), 2000)
                        }}
                        style={{
                          background: pinCopied ? `${COLORS.green}22` : COLORS.card,
                          border: `1px solid ${pinCopied ? COLORS.green : COLORS.border}`,
                          color: pinCopied ? COLORS.green : COLORS.text,
                          borderRadius: 10, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                        }}
                      >{pinCopied ? '✅ Copied!' : '📋 Copy'}</button>
                    </div>
                    {parentExpires && (
                      <div style={{ color: COLORS.muted, fontSize: 11, marginBottom: 8 }}>
                        ⏰ Valid until {new Date(parentExpires).toLocaleDateString()}
                      </div>
                    )}
                    <button
                      disabled={pinLoading}
                      onClick={async () => {
                        setPinLoading(true)
                        try {
                          const r = await apiRevokeParentPin()
                          if (r.revoked) { setParentPin(null); setParentExpires(null) }
                        } finally { setPinLoading(false) }
                      }}
                      style={{
                        background: `${COLORS.red}15`, border: `1px solid ${COLORS.red}33`,
                        color: COLORS.red, borderRadius: 10, padding: '6px 14px',
                        fontSize: 12, cursor: 'pointer', width: '100%',
                      }}
                    >{pinLoading ? 'Revoking…' : '🗑 Revoke Access'}</button>
                  </>
                ) : (
                  <button
                    disabled={pinLoading}
                    onClick={async () => {
                      setPinLoading(true)
                      try {
                        const r = await apiCreateParentPin()
                        setParentPin(r.pin); setParentExpires(r.expires_at)
                      } finally { setPinLoading(false) }
                    }}
                    style={{
                      background: `${COLORS.green}22`, border: `1px solid ${COLORS.green}44`,
                      color: COLORS.green, borderRadius: 10, padding: '10px',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%',
                    }}
                  >{pinLoading ? 'Generating…' : '🔗 Generate Parent Link'}</button>
                )}
              </div>
            </div>
          )}

          {/* ── Plan tab ── */}
          {activeTab === "plan" && (() => {
            const userPlan = profile?.plan || 'free'
            const planOrder = ['free', 'basic', 'pro', 'premium']
            const currentPlanInfo = PLANS[userPlan] || PLANS.free
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Current plan card */}
                <div style={{
                  background: `${currentPlanInfo.color}15`,
                  border: `2px solid ${currentPlanInfo.color}50`,
                  borderRadius: 16, padding: 20,
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  <span style={{ fontSize: 36 }}>{currentPlanInfo.icon}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: currentPlanInfo.color }}>{currentPlanInfo.label}</div>
                    <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>Your current plan</div>
                    {profile?.plan_expires_at && (
                      <div style={{ fontSize: 11, color: COLORS.yellow, marginTop: 4 }}>
                        ⏰ Expires: {profile.plan_expires_at}
                      </div>
                    )}
                  </div>
                </div>

                {/* Feature comparison */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {planOrder.map(p => {
                    const info = PLANS[p]
                    const isActive = p === userPlan
                    const isLocked = planOrder.indexOf(p) > planOrder.indexOf(userPlan)
                    return (
                      <div key={p} style={{
                        background: isActive ? `${info.color}10` : COLORS.card,
                        border: `1.5px solid ${isActive ? info.color + '50' : COLORS.border}`,
                        borderRadius: 14, padding: "14px 16px",
                        opacity: isLocked ? 0.55 : 1,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 18 }}>{info.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: isActive ? info.color : COLORS.text }}>{info.label}</span>
                          {isActive && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: info.color, background: `${info.color}20`, borderRadius: 6, padding: "2px 8px" }}>ACTIVE</span>}
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.5 }}>
                          Tabs: {info.tabs.join(" · ")}
                        </div>
                        {info.labs.length > 0 && (
                          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
                            Labs: {info.labs.join(" · ")}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
                          AI calls/day: {info.aiCallsPerDay === Infinity ? "Unlimited" : info.aiCallsPerDay}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p style={{ fontSize: 11, color: COLORS.muted, textAlign: "center", margin: 0 }}>
                  Contact your teacher or admin to upgrade your plan.
                </p>
              </div>
            )
          })()}

          {/* ── AI tab ── */}
          {activeTab === "ai" && (() => {
            const userPlan = profile?.plan || 'free'
            const planInfo = PLANS[userPlan] || PLANS.free
            const used  = usage?.today?.calls || 0
            const limit = usage?.daily_quota  || planInfo.aiCallsPerDay || 10
            const remaining = usage?.today?.remaining ?? Math.max(0, limit - used)
            const pct = Math.min(100, limit > 0 ? Math.round((used / limit) * 100) : 0)
            const barColor = pct >= 90 ? COLORS.red : pct >= 70 ? COLORS.yellow : COLORS.green
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Managed AI notice */}
                <div style={{
                  background: `${COLORS.green}10`,
                  border: `1px solid ${COLORS.green}30`,
                  borderRadius: 14, padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>🔐</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.green }}>AI Managed by Eduvy-AI</div>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 3, lineHeight: 1.5 }}>
                      Everything is handled on our servers. No API keys needed.
                    </div>
                  </div>
                </div>

                {/* Today's usage meter */}
                <div style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 14, padding: "16px 18px",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, marginBottom: 12, letterSpacing: "0.05em" }}>TODAY'S AI CALLS</div>
                  {usageLoading ? (
                    <div style={{ fontSize: 12, color: COLORS.muted }}>Loading…</div>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
                        <span style={{ fontSize: 32, fontWeight: 900, color: barColor }}>{used}</span>
                        <span style={{ fontSize: 14, color: COLORS.muted }}>/ {limit === Infinity ? '∞' : limit} calls</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: COLORS.card2, overflow: "hidden", marginBottom: 8 }}>
                        <div style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: barColor,
                          borderRadius: 4,
                          transition: "width 0.4s",
                        }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, color: COLORS.muted }}>
                          {remaining} remaining today
                        </span>
                        {usage?.today?.tokens > 0 && (
                          <span style={{ fontSize: 11, color: COLORS.muted }}>
                            ~{((usage.today.tokens) / 1000).toFixed(1)}K tokens used
                          </span>
                        )}
                      </div>
                      {pct >= 90 && (
                        <div style={{
                          marginTop: 10, fontSize: 12, color: COLORS.red,
                          background: `${COLORS.red}12`, borderRadius: 8,
                          padding: "8px 10px", lineHeight: 1.5,
                        }}>
                          ⚠️ Almost at your daily limit. Resets at midnight.
                          {userPlan !== 'premium' && " Upgrade your plan for more calls."}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Active model info */}
                <div style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 14, padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>🤖</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, marginBottom: 3 }}>YOUR AI MODEL</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>
                      {PLAN_MODEL_LABEL[userPlan] || 'Auto-selected'}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
                      Assigned by your {planInfo.icon} {planInfo.label} plan
                    </div>
                  </div>
                </div>

                {/* Monthly usage */}
                {usage?.this_month && (
                  <div style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 14, padding: "14px 16px",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, marginBottom: 10, letterSpacing: "0.05em" }}>THIS MONTH</div>
                    <div style={{ display: "flex", gap: 20 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.blue }}>{usage.this_month.calls}</div>
                        <div style={{ fontSize: 10, color: COLORS.muted }}>total calls</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.blue }}>
                          {((usage.this_month.tokens || 0) / 1000).toFixed(1)}K
                        </div>
                        <div style={{ fontSize: 10, color: COLORS.muted }}>tokens</div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: COLORS.muted,
  marginBottom: 6,
  letterSpacing: "0.05em",
}

const inputStyle = {
  width: "100%",
  background: "#101022",
  border: "1px solid #ffffff15",
  borderRadius: 12,
  padding: "11px 14px",
  color: "#eeeeff",
  fontSize: 13,
  fontFamily: "Sora, sans-serif",
  cursor: "pointer",
}

const primaryBtn = {
  background: "linear-gradient(135deg, #00E5A0, #33cc88)",
  color: "#04040e",
  border: "none",
  borderRadius: 12,
  padding: "12px 16px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "Sora, sans-serif",
  width: "100%",
}
