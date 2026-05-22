import { useState, useEffect } from 'react'
import { COLORS, BOARDS, LANGS, SUBS, UI_STRINGS } from '../App.jsx'
import { getDeviceId, apiCreateProfile, apiApplyReferralCode } from '../api.js'

const CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)

// ── Curriculum API helpers ────────────────────────────────────
async function fetchBoards() {
  try {
    const res = await fetch('/api/curriculum/boards', { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data.map(b => b.name)
    }
  } catch {}
  return BOARDS // fallback
}

async function fetchMediums(board, standard) {
  // Convert display names to slugs for API
  const boardSlug = board.toLowerCase().replace(/\s+/g, '-')
  const stdSlug   = standard.toLowerCase().replace(/\s+/g, '-')
  try {
    const res = await fetch(
      `/api/curriculum/mediums?board=${encodeURIComponent(boardSlug)}&standard=${encodeURIComponent(stdSlug)}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data.map(m => m.name)
    }
  } catch {}
  return LANGS // fallback
}

async function fetchSubjects(board, standard, medium) {
  const boardSlug  = board.toLowerCase().replace(/\s+/g, '-')
  const stdSlug    = standard.toLowerCase().replace(/\s+/g, '-')
  const mediumSlug = medium.toLowerCase().replace(/\s+/g, '-')
  try {
    const res = await fetch(
      `/api/curriculum/subjects?board=${encodeURIComponent(boardSlug)}&standard=${encodeURIComponent(stdSlug)}&medium=${encodeURIComponent(mediumSlug)}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.subjects) && data.subjects.length > 0) return data.subjects
    }
  } catch {}
  return SUBS[standard] || [] // fallback
}

const inputStyle = {
  width: "100%",
  background: "#101022",
  border: "1px solid #ffffff15",
  borderRadius: 12,
  padding: "12px 14px",
  color: "#eeeeff",
  fontSize: 14,
  fontFamily: "Sora, sans-serif",
  outline: "none",
}

const selectStyle = { ...inputStyle, cursor: "pointer" }

export default function Onboard({ onComplete }) {
  const [step, setStep]           = useState(1)
  const [name, setName]           = useState("")
  const [mobile, setMobile]       = useState("")
  const [parent, setParent]       = useState("")
  const [standard, setStd]        = useState("Class 10")
  const [board, setBoard]         = useState("CBSE")
  const [language, setLang]       = useState("English")
  const [subjects, setSubs]       = useState([])
  const [saving, setSaving]       = useState(false)
  const [refCode, setRefCode]     = useState('')
  const [refMsg, setRefMsg]       = useState('')

  // Dynamic lists from API (with static fallbacks)
  const [boardList,   setBoardList]   = useState(BOARDS)
  const [mediumList,  setMediumList]  = useState(LANGS)
  const [subjectList, setSubjectList] = useState([])
  const [loadingSubs, setLoadingSubs] = useState(false)

  // Load boards once on mount
  useEffect(() => {
    fetchBoards().then(setBoardList)
  }, [])

  // When board or standard changes → refresh mediums + subjects
  useEffect(() => {
    fetchMediums(board, standard).then(meds => {
      setMediumList(meds)
      // If current language is not in new list, pick first available
      if (!meds.includes(language)) setLang(meds[0] || "English")
    })
  }, [board, standard])

  // When board, standard, or language (medium) changes → refresh subjects
  useEffect(() => {
    setLoadingSubs(true)
    fetchSubjects(board, standard, language).then(subs => {
      setSubjectList(subs)
      setSubs([...subs]) // auto-select all
      setLoadingSubs(false)
    })
  }, [board, standard, language])

  const toggleSub = s => setSubs(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  )

  const selectAll = () => setSubs([...subjectList])

  const goStep2 = () => {
    if (!name.trim()) { alert("Please enter your name"); return }
    setStep(2)
  }

  const goStep3 = () => {
    if (!subjects.length) setSubs([...subjectList])
    setStep(3)
  }

  const finish = async () => {
    const finalSubs = subjects.length ? subjects : subjectList
    const profileData = { name: name.trim(), standard, board, language, subjects: finalSubs }
    setSaving(true)
    try {
      const deviceId = getDeviceId()
      await apiCreateProfile({
        id: deviceId,
        name: name.trim(),
        mobile: mobile.trim(),
        parent_mobile: parent.trim(),
        standard,
        board,
        language,
        subjects: finalSubs,
      })
    } catch {
      // Backend save failed — app continues, user can retry from Settings
    }
    // Apply referral code if provided
    if (refCode.trim()) {
      try {
        const r = await apiApplyReferralCode(refCode.trim().toUpperCase())
        setRefMsg(r.message || '✅ Referral applied!')
      } catch (err) {
        setRefMsg(err?.message || 'Invalid referral code')
      }
      // Short pause so user can see the message
      await new Promise(r => setTimeout(r, 800))
    }
    setSaving(false)
    onComplete(profileData)
  }

  const ui = UI_STRINGS[language] || UI_STRINGS.English

  return (
    <div style={{
      width: "100%",
      maxWidth: 480,
      minHeight: "100vh",
      background: COLORS.bg,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Progress bar */}
      <div style={{
        height: 3,
        background: "#ffffff10",
        width: "100%",
      }}>
        <div style={{
          height: "100%",
          width: `${(step / 3) * 100}%`,
          background: `linear-gradient(90deg, ${COLORS.green}, #33cc88)`,
          transition: "width 0.4s ease",
        }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "28px 20px 40px" }}>
        {/* Step indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 24,
        }}>
          {[1,2,3].map(s => (
            <div key={s} style={{
              width: s === step ? 28 : 8,
              height: 8,
              borderRadius: 4,
              background: s <= step ? COLORS.green : "#ffffff15",
              transition: "all 0.3s ease",
            }} />
          ))}
          <span style={{ marginLeft: 4, fontSize: 12, color: COLORS.muted }}>
            Step {step} of 3
          </span>
        </div>

        {/* ── Step 1: Personal Details ── */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>
                Welcome! 👋
              </h2>
              <p style={{ fontSize: 14, color: COLORS.muted }}>
                Set up your learning profile in 2 minutes
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, marginBottom: 6, display: "block" }}>
                  YOUR NAME *
                </label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="e.g. Arjun Sharma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, marginBottom: 6, display: "block" }}>
                  YOUR MOBILE
                </label>
                <input
                  style={inputStyle}
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  maxLength={10}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, marginBottom: 6, display: "block" }}>
                  PARENT'S MOBILE
                </label>
                <input
                  style={inputStyle}
                  type="tel"
                  placeholder="Parent's mobile number"
                  value={parent}
                  onChange={e => setParent(e.target.value)}
                  maxLength={10}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, marginBottom: 6, display: "block" }}>
                  CLASS
                </label>
                <select style={selectStyle} value={standard} onChange={e => setStd(e.target.value)}>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, marginBottom: 6, display: "block" }}>
                  BOARD
                </label>
                <select style={selectStyle} value={board} onChange={e => setBoard(e.target.value)}>
                  {boardList.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, marginBottom: 6, display: "block" }}>
                  MEDIUM / LANGUAGE
                </label>
                <select style={selectStyle} value={language} onChange={e => setLang(e.target.value)}>
                  {mediumList.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <div style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  background: `${COLORS.green}18`,
                  border: `1px solid ${COLORS.green}30`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: COLORS.green,
                }}>
                  ✓ All AI responses will be in <strong>{language}</strong>
                </div>
              </div>
            </div>

            <button onClick={goStep2} style={primaryBtn}>
              {ui.next}
            </button>
          </div>
        )}

        {/* ── Step 2: Subject Selection ── */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>
                Pick your subjects 📚
              </h2>
              <p style={{ fontSize: 14, color: COLORS.muted }}>
                {standard} • {board} • {language} medium
              </p>
            </div>

            <button
              onClick={selectAll}
              style={{
                background: "transparent",
                border: `1px solid ${COLORS.green}`,
                borderRadius: 10,
                padding: "8px 14px",
                color: COLORS.green,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "Sora, sans-serif",
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              ✓ Select All
            </button>

            {loadingSubs ? (
              <p style={{ fontSize: 13, color: COLORS.muted }}>Loading subjects…</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {subjectList.map(s => {
                  const selected = subjects.includes(s)
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSub(s)}
                      style={{
                        background: selected ? `${COLORS.green}20` : COLORS.card,
                        border: `1.5px solid ${selected ? COLORS.green : COLORS.border}`,
                        borderRadius: 10,
                        padding: "9px 14px",
                        color: selected ? COLORS.green : COLORS.text,
                        fontSize: 13,
                        fontWeight: selected ? 700 : 500,
                        fontFamily: "Sora, sans-serif",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {selected ? "✓ " : ""}{s}
                    </button>
                  )
                })}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={secondaryBtn}>← Back</button>
              <button onClick={goStep3} style={{ ...primaryBtn, flex: 1 }}>
                {ui.next}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirmation ── */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>
                All set, {name}! 🎉
              </h2>
              <p style={{ fontSize: 14, color: COLORS.muted }}>
                Your personalized AI tutor is ready
              </p>
            </div>

            {/* Profile Summary */}
            <div style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              {[
                ["🎓", "Class", standard],
                ["📋", "Board", board],
                ["🌐", "Language", language],
                ["📚", "Subjects", (subjects.length ? subjects : subjectList).join(", ")],
              ].map(([icon, label, value]) => (
                <div key={label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span>{icon}</span>
                  <div>
                    <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Features list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600 }}>WHAT'S AVAILABLE</p>
              {[
                "🏠 Daily brain brief & exam oracle",
                "📖 AI notes from any textbook or topic",
                "🤖 Personal tutor in 6 different modes",
                "🎬 Video scripts & YouTube discovery",
                "🎙️ AI podcast debates",
                "🎯 Adaptive quiz practice",
                "✍️ Essay grading by AI examiner",
                "🧘 Mental wellness coach",
              ].map(f => (
                <div key={f} style={{ fontSize: 13, color: COLORS.text, display: "flex", alignItems: "center", gap: 6 }}>
                  {f}
                </div>
              ))}
            </div>

            {/* Referral code */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700, marginBottom: 8 }}>GOT A REFERRAL CODE? (optional)</div>
              <input
                style={inputStyle}
                type="text"
                placeholder="e.g. ABC1234"
                value={refCode}
                onChange={e => setRefCode(e.target.value.toUpperCase())}
                maxLength={10}
              />
              {refMsg && (
                <div style={{ fontSize: 12, color: refMsg.startsWith('✅') ? COLORS.green : COLORS.red, marginTop: 6 }}>{refMsg}</div>
              )}
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>
                You get +200 XP · Your friend gets +500 XP
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={secondaryBtn}>← Back</button>
              <button
                onClick={finish}
                disabled={saving}
                style={{ ...primaryBtn, flex: 1, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving…" : ui.start}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const primaryBtn = {
  background: "linear-gradient(135deg, #00E5A0, #33cc88)",
  color: "#04040e",
  border: "none",
  borderRadius: 13,
  padding: "13px 18px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  width: "100%",
  fontFamily: "Sora, sans-serif",
}

const secondaryBtn = {
  background: "transparent",
  border: "1px solid #ffffff15",
  borderRadius: 13,
  padding: "13px 18px",
  fontSize: 14,
  fontWeight: 600,
  color: "#eeeeff",
  cursor: "pointer",
  fontFamily: "Sora, sans-serif",
}
