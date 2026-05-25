import { useState, useEffect } from 'react'
import { COLORS, callAI, checkStudentQuery } from '../../shared.js'
import { li } from '../../i18n/index.js'
import { getDeviceId, apiGetDraft, apiSaveDraft } from '../../api.js'

const TYPES = ["Essay", "Letter", "Paragraph", "Answer"]

export default function EssayLab({ profile, addXp, onBack }) {
  const deviceId = getDeviceId()
  const [type, setType]       = useState("Essay")
  const [writing, setWriting] = useState("")
  const [feedback, setFeedback] = useState("")
  const [loading, setLoading] = useState(false)

  // Load last draft on mount
  useEffect(() => {
    apiGetDraft(deviceId, "essay_draft")
      .then(d => {
        if (d) {
          if (d.content) setWriting(d.content)
          if (d.extra) setFeedback(d.extra)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grade = async () => {
    if (!writing.trim() || writing.trim().length < 30) {
      alert("Please write at least 30 characters before grading.")
      return
    }
    // Safety guard on the essay content
    const safety = checkStudentQuery(writing, profile)
    if (safety.blocked) { setFeedback(safety.message); return }
    setLoading(true)
    setFeedback("")
    const res = await callAI(
      `Grade this ${type} for a ${profile.standard} ${profile.board} student:\n\n${writing}`,
      "", [], 3, 1200, "essay_grade"
    )
    setFeedback(res)
    apiSaveDraft(deviceId, "essay_draft", writing, res).catch(() => {})
    addXp(8)
    setLoading(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 130px)" }}>
      {/* Header */}
      <div style={{
        background: COLORS.card,
        borderBottom: `1px solid ${COLORS.border}`,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}>
        <button onClick={onBack} style={backBtn}>← Back</button>
        <span style={{ fontSize: 15, fontWeight: 800, color: COLORS.text }}>✍️ Essay Grader</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {/* Writing type tabs */}
        <div style={{
          display: "flex",
          background: COLORS.card,
          borderRadius: 12,
          padding: 4,
          marginBottom: 16,
          border: `1px solid ${COLORS.border}`,
          gap: 2,
        }}>
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                flex: 1,
                background: type === t ? `linear-gradient(135deg, ${COLORS.blue}, #5577dd)` : "transparent",
                border: "none",
                borderRadius: 9,
                padding: "8px 4px",
                fontSize: 12,
                fontWeight: type === t ? 800 : 500,
                color: type === t ? "#fff" : COLORS.muted,
                cursor: "pointer",
                fontFamily: "Sora, sans-serif",
                transition: "all 0.2s",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, display: "block", marginBottom: 8 }}>
            WRITE YOUR {type.toUpperCase()} BELOW
          </label>
          <textarea
            style={{
              ...inputStyle,
              height: 200,
              resize: "vertical",
              lineHeight: 1.7,
            }}
            placeholder={`Start writing your ${type.toLowerCase()} here…`}
            value={writing}
            onChange={e => setWriting(e.target.value)}
          />
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4, textAlign: "right" }}>
            {writing.length} characters
          </div>
        </div>

        <button onClick={grade} disabled={loading || writing.trim().length < 30} style={primaryBtn}>
          {loading ? "Grading…" : "🎓 Grade My Writing"}
        </button>

        {/* Feedback */}
        {feedback && (
          <div style={{
            marginTop: 16,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: 16,
          }}>
            <div style={{ fontSize: 12, color: COLORS.blue, fontWeight: 700, marginBottom: 10 }}>
              📋 Examiner's Feedback
            </div>
            <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {feedback}
            </p>
          </div>
        )}

        {feedback && (
          <button
            onClick={() => { setWriting(""); setFeedback("") }}
            style={{ ...secondaryBtn, marginTop: 12 }}
          >
            ✍️ Write New
          </button>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: "100%",
  background: "#101022",
  border: "1px solid #ffffff15",
  borderRadius: 12,
  padding: "12px 14px",
  color: "#eeeeff",
  fontSize: 13,
  fontFamily: "Sora, sans-serif",
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
  width: "100%",
  fontFamily: "Sora, sans-serif",
}

const secondaryBtn = {
  background: "transparent",
  border: "1px solid #ffffff15",
  borderRadius: 12,
  padding: "12px 16px",
  fontSize: 13,
  fontWeight: 600,
  color: "#eeeeff",
  cursor: "pointer",
  width: "100%",
  fontFamily: "Sora, sans-serif",
}

const backBtn = {
  background: "transparent",
  border: "none",
  color: "#6868a0",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "Sora, sans-serif",
  padding: 0,
}
