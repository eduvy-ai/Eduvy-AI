import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

// Define COLORS locally to avoid circular dep (ParentDashboard pattern)
const C = {
  bg: "#04040e", card: "#0b0b1c", card2: "#101022", border: "#ffffff08",
  green: "#00E5A0", yellow: "#FFD166", red: "#FF6B6B",
  blue: "#7B9CFF", orange: "#FF6B35", text: "#eeeeff", muted: "#6868a0",
}

export default function HelperPortal() {
  const { token } = useParams()
  const [helperInfo, setHelperInfo] = useState(null)
  const [students, setStudents]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [noteText, setNoteText]     = useState({})   // { studentId: text }
  const [sending, setSending]       = useState({})   // { studentId: bool }
  const [sent, setSent]             = useState({})   // { studentId: bool }

  const headers = { 'X-Helper-Token': token }

  useEffect(() => {
    async function load() {
      try {
        const me = await fetch('/api/helper/me', { headers })
        if (!me.ok) { setError('Invalid or expired helper token.'); setLoading(false); return }
        const meData = await me.json()
        setHelperInfo(meData)

        const st = await fetch('/api/helper/students', { headers })
        const stData = await st.json()
        setStudents(Array.isArray(stData) ? stData : [])
      } catch {
        setError('Could not connect to server. Please try again.')
      }
      setLoading(false)
    }
    load()
  }, [token])

  const sendNote = async (studentId) => {
    const msg = (noteText[studentId] || '').trim()
    if (!msg) return
    setSending(s => ({ ...s, [studentId]: true }))
    try {
      const r = await fetch('/api/helper/notes', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, message: msg }),
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Failed to send') }
      setNoteText(n => ({ ...n, [studentId]: '' }))
      setSent(s => ({ ...s, [studentId]: true }))
      setTimeout(() => setSent(s => ({ ...s, [studentId]: false })), 3000)
    } catch (e) {
      alert(e.message)
    }
    setSending(s => ({ ...s, [studentId]: false }))
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted, fontFamily: 'Sora, sans-serif', fontSize: 16 }}>Loading…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', fontFamily: 'Sora, sans-serif' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: C.red, fontSize: 18, marginBottom: 8 }}>Access Denied</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Sora, sans-serif' }}>
      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '16px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.blue}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👁️</div>
          <div>
            <h1 style={{ color: C.text, fontSize: 18, fontWeight: 800, margin: 0 }}>Drishti Helper Portal</h1>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
              {helperInfo?.helper_name} · {helperInfo?.helper_type}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
          You are supporting <strong style={{ color: C.text }}>{students.length}</strong> student{students.length !== 1 ? 's' : ''}. Send them encouraging notes to keep them motivated.
        </p>

        {students.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted, fontSize: 14 }}>
            No students assigned yet. Contact your admin to get students assigned to you.
          </div>
        )}

        {students.map(s => (
          <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '18px 20px', marginBottom: 14 }}>
            {/* Student info */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>
                  {s.name}
                </h3>
                <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
                  Class {s.standard} · {s.board} · {s.language}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: C.yellow, fontWeight: 800, fontSize: 16, margin: 0 }}>{s.xp || 0}</p>
                  <p style={{ color: C.muted, fontSize: 10, margin: 0 }}>XP</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: C.orange, fontWeight: 800, fontSize: 16, margin: 0 }}>{s.streak || 0}</p>
                  <p style={{ color: C.muted, fontSize: 10, margin: 0 }}>Streak</p>
                </div>
              </div>
            </div>

            {/* Recent topics */}
            {s.recent_topics?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 6 }}>RECENT TOPICS</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s.recent_topics.slice(0, 5).map((t, i) => (
                    <span key={i} style={{
                      background: `${C.blue}18`, border: `1px solid ${C.blue}30`,
                      color: C.blue, fontSize: 11, borderRadius: 8, padding: '2px 8px',
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Send note */}
            <div>
              <p style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 6 }}>SEND ENCOURAGEMENT NOTE</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  value={noteText[s.id] || ''}
                  onChange={e => setNoteText(n => ({ ...n, [s.id]: e.target.value }))}
                  placeholder={`Write an encouraging message for ${s.name}…`}
                  maxLength={500}
                  rows={2}
                  style={{
                    flex: 1, background: C.card2, border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: '9px 12px', color: C.text,
                    fontFamily: 'Sora, sans-serif', fontSize: 13, resize: 'vertical',
                  }}
                />
                <button
                  onClick={() => sendNote(s.id)}
                  disabled={sending[s.id] || !noteText[s.id]?.trim()}
                  style={{
                    background: `linear-gradient(135deg, ${C.green}, #33cc88)`,
                    color: '#04040e', border: 'none', borderRadius: 10,
                    padding: '9px 16px', fontWeight: 800, fontFamily: 'Sora, sans-serif',
                    cursor: 'pointer', fontSize: 13, flexShrink: 0, alignSelf: 'flex-start',
                    opacity: sending[s.id] || !noteText[s.id]?.trim() ? 0.5 : 1,
                  }}
                >
                  {sending[s.id] ? '…' : sent[s.id] ? '✅ Sent!' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        ))}

        <p style={{ textAlign: 'center', color: C.muted, fontSize: 11, marginTop: 24 }}>
          Eduvy-AI Drishti Portal · Read-only helper access
        </p>
      </div>
    </div>
  )
}
