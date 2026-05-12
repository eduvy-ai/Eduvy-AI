import { useState } from 'react'
import { COLORS, AI_PROVIDERS, callAI, setAIConfig, getAIConfig, BOARDS, LANGS } from '../shared.js'

const CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)

export default function SettingsModal({ config, savedKeys = {}, onSave, onClose, profile, onProfileSave }) {
  // ── Tab ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('ai')  // 'ai' | 'profile'
  const [provider, setProvider] = useState(config.provider || "gemini")
  const [apiKey, setApiKey]     = useState(config.apiKey || savedKeys[config.provider || "gemini"] || "")
  const [model, setModel]       = useState(config.model || "gemini-2.0-flash")
  const [showKey, setShowKey]   = useState(false)
  const [testing, setTesting]   = useState(false)
  const [testResult, setTestResult] = useState(null)

  // ── Profile edit state ───────────────────────────────────────
  const [pName, setPName]       = useState(profile?.name || "")
  const [pStd, setPStd]         = useState(profile?.standard || "Class 10")
  const [pBoard, setPBoard]     = useState(profile?.board || "CBSE")
  const [pLang, setPLang]       = useState(profile?.language || "English")
  const [profileSaved, setProfileSaved] = useState(false)

  const providerInfo = AI_PROVIDERS[provider]

  // When provider changes, auto-select first model & load saved key
  const switchProvider = (p) => {
    setProvider(p)
    setModel(AI_PROVIDERS[p].models[0].id)
    setApiKey(savedKeys[p] || "")
    setTestResult(null)
  }

  const testConnection = async () => {
    if (!apiKey.trim()) { setTestResult({ ok: false, msg: "Enter your API key first." }); return }
    setTesting(true)
    setTestResult(null)
    const orig = getAIConfig()
    setAIConfig({ provider, apiKey: apiKey.trim(), model })
    const res = await callAI(
      "Reply with exactly: API connected ✓",
      "You are a test assistant. Reply only with what is asked.",
      [], 2, 20
    )
    setAIConfig(orig)
    if (res.startsWith("⚠️")) {
      setTestResult({ ok: false, msg: res })
    } else {
      setTestResult({ ok: true, msg: "✅ Connected! API key works." })
    }
    setTesting(false)
  }

  const save = () => {
    // Allow saving without apiKey — backend .env key will be used
    onSave({ provider, apiKey: apiKey.trim(), model })
    onClose()
  }

  const saveProfile = () => {
    if (!pName.trim()) return
    onProfileSave?.({ name: pName.trim(), standard: pStd, board: pBoard, language: pLang })
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

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
            {[["ai", "🤖 AI Provider"], ["profile", "👤 My Profile"]].map(([key, label]) => (
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
              <button onClick={saveProfile} style={primaryBtn}>
                {profileSaved ? "✅ Saved!" : "💾 Save Profile"}
              </button>
            </div>
          )}

          {/* ── AI Provider tab ── */}
          {activeTab === "ai" && (<>
          {/* Provider Selection */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
            {Object.entries(AI_PROVIDERS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => switchProvider(key)}
                style={{
                  background: provider === key ? `${p.color}18` : COLORS.card,
                  border: `1.5px solid ${provider === key ? p.color : COLORS.border}`,
                  borderRadius: 14,
                  padding: "12px 10px",
                  cursor: "pointer",
                  fontFamily: "Sora, sans-serif",
                  textAlign: "left",
                  position: "relative",
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>{p.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: provider === key ? p.color : COLORS.text }}>{p.label}</div>
                {p.free && (
                  <div style={{
                    position: "absolute",
                    top: 8, right: 8,
                    background: `${COLORS.green}20`,
                    border: `1px solid ${COLORS.green}40`,
                    borderRadius: 6,
                    padding: "1px 6px",
                    fontSize: 9,
                    fontWeight: 700,
                    color: COLORS.green,
                  }}>FREE</div>
                )}
              </button>
            ))}
          </div>

          {/* Model Selection */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>MODEL</label>
            <select
              style={inputStyle}
              value={model}
              onChange={e => setModel(e.target.value)}
            >
              {providerInfo.models.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>API KEY</label>
            <div style={{ position: "relative" }}>
              <input
                style={{ ...inputStyle, paddingRight: 44 }}
                type={showKey ? "text" : "password"}
                placeholder={providerInfo.keyPlaceholder}
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setTestResult(null) }}
              />
              <button
                onClick={() => setShowKey(s => !s)}
                style={{
                  position: "absolute",
                  right: 12, top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: COLORS.muted,
                  cursor: "pointer",
                  fontSize: 15,
                  fontFamily: "Sora, sans-serif",
                }}
              >
                {showKey ? "🙈" : "👁"}
              </button>
            </div>
            <a
              href={providerInfo.keyLink}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12, color: providerInfo.color, marginTop: 6, display: "block", textDecoration: "none" }}
            >
              🔗 {providerInfo.keyLinkLabel}
            </a>
            {savedKeys[provider] && apiKey === savedKeys[provider] && (
              <div style={{ fontSize: 11, color: COLORS.green, marginTop: 4 }}>
                ✓ Using saved key for {AI_PROVIDERS[provider].label}
              </div>
            )}
          </div>

          {/* Test result */}
          {testResult && (
            <div style={{
              padding: "9px 12px",
              borderRadius: 10,
              background: testResult.ok ? `${COLORS.green}15` : `${COLORS.red}15`,
              border: `1px solid ${testResult.ok ? COLORS.green : COLORS.red}40`,
              fontSize: 13,
              color: testResult.ok ? COLORS.green : COLORS.red,
              marginBottom: 12,
            }}>
              {testResult.msg}
            </div>
          )}

          {/* Info box for free providers */}
          {providerInfo.free && (
            <div style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: `${COLORS.green}08`,
              border: `1px solid ${COLORS.green}20`,
              fontSize: 12,
              color: COLORS.muted,
              marginBottom: 14,
              lineHeight: 1.5,
            }}>
              🎉 <strong style={{ color: COLORS.green }}>{providerInfo.label}</strong> has a generous free tier — no credit card needed.
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={testConnection}
              disabled={testing}
              style={{ ...secondaryBtn, flex: 1 }}
            >
              {testing ? "Testing…" : "🧪 Test"}
            </button>
            <button
              onClick={save}
              style={{ ...primaryBtn, flex: 2 }}
            >
              💾 Save & Use This AI
            </button>
          </div>

          {/* Note about server keys */}
          <div style={{ marginTop: 10, fontSize: 11, color: COLORS.muted, lineHeight: 1.5 }}>
            💡 Leave API key blank to use server-side keys (set in backend .env)
          </div>

          {/* Current active config */}
          <div style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 10,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            fontSize: 12,
            color: COLORS.muted,
          }}>
            Currently active: <strong style={{ color: COLORS.text }}>
              {AI_PROVIDERS[config.provider]?.label} · {config.model}
            </strong>
          </div>
          </>)}
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
}

const secondaryBtn = {
  background: "transparent",
  border: "1px solid #ffffff20",
  borderRadius: 12,
  padding: "12px 16px",
  fontSize: 13,
  fontWeight: 600,
  color: "#eeeeff",
  cursor: "pointer",
  fontFamily: "Sora, sans-serif",
}
